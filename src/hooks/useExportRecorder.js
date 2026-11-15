import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EXPORT_BITRATE,
  EXPORT_FPS,
  EXPORT_FORMAT_CANDIDATES,
} from '../lib/constants';
import { drawCover, getCoverLayer } from '../lib/imagePrep';

function getSupportedFormats(RecorderCtor) {
  if (!RecorderCtor) return [];

  if (typeof RecorderCtor.isTypeSupported !== 'function') {
    return [
      ...EXPORT_FORMAT_CANDIDATES.map((format) => ({
        ...format,
        mimeType: '',
        supported: false,
      })),
      {
        id: 'default',
        label: 'Browser default',
        extension: '',
        mimeType: '',
        supported: true,
      },
    ];
  }

  const formats = EXPORT_FORMAT_CANDIDATES.map((format) => {
    const mimeType = format.mimeTypes.find((candidate) => {
      try {
        return RecorderCtor.isTypeSupported(candidate);
      } catch {
        return false;
      }
    });
    return {
      ...format,
      mimeType: mimeType ?? '',
      supported: Boolean(mimeType),
    };
  });
  return formats.some((format) => format.supported)
    ? formats
    : [
        ...formats,
        {
          id: 'default',
          label: 'Browser default',
          extension: '',
          mimeType: '',
          supported: true,
        },
      ];
}

function getVideoExtension(mimeType, fallbackExtension) {
  const normalizedMimeType = mimeType.toLowerCase();
  if (normalizedMimeType.includes('mp4')) return 'mp4';
  if (normalizedMimeType.includes('ogg')) return 'ogv';
  if (normalizedMimeType.includes('webm')) return 'webm';
  return fallbackExtension || 'webm';
}

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Rewinds `media` and waits until the seek has actually landed, so a recording
 * never starts on a stale frame or from a leftover playhead position.
 */
function seekTo(media, target, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (!media) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      media.removeEventListener('seeked', finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    if (Math.abs(media.currentTime - target) < 0.01) {
      finish();
      return;
    }
    media.addEventListener('seeked', finish);
    try {
      media.currentTime = target;
    } catch {
      finish();
    }
  });
}

function isMediaFinished(media) {
  if (!media) return true;
  if (media.ended) return true;
  return (
    Number.isFinite(media.duration) &&
    media.duration > 0 &&
    media.currentTime >= media.duration - 0.05
  );
}

/**
 * Resolves once `media` has actually started advancing.
 *
 * `play()` resolving only means playback was allowed, not that the playhead
 * moved. Starting the recorder before that punches a frozen stretch into the
 * video track while the audio track is normalised to 0 — the result is a video
 * that freezes at the start and drifts out of sync with the narration.
 */
function waitForPlaybackStart(media, timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (!media || media.currentTime > 0.001 || media.ended) {
      resolve();
      return;
    }
    let settled = false;
    let rafId = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const check = () => {
      if (media.currentTime > 0.001 || media.ended) {
        finish();
        return;
      }
      rafId = requestAnimationFrame(check);
    };
    rafId = requestAnimationFrame(check);
  });
}

/**
 * Drives the canvas at a steady `fps` for as long as the export runs.
 *
 * requestAnimationFrame is the right clock while the tab is visible, but it
 * stops completely in a hidden tab — which is how a 3 minute export ends up
 * with a minutes-long frozen stretch in the middle of the video. When the tab
 * is hidden we fall back to a timer (throttled, but still ticking) and the UI
 * warns the user.
 */
function startFramePump({ fps, onFrame }) {
  const interval = 1000 / Math.max(1, fps);
  let rafId = 0;
  let timerId = 0;
  let stopped = false;
  let nextAt = performance.now() + interval;

  const tick = () => {
    if (stopped) return;
    const now = performance.now();
    if (now >= nextAt - 1) {
      onFrame();
      // Re-anchor on the original cadence so a late frame does not shift
      // every frame after it.
      const missed = Math.max(1, Math.floor((now - nextAt) / interval) + 1);
      nextAt += interval * missed;
    }
    schedule();
  };

  const schedule = () => {
    if (stopped) return;
    if (document.visibilityState === 'hidden') {
      timerId = setTimeout(tick, interval);
    } else {
      rafId = requestAnimationFrame(tick);
    }
  };

  schedule();

  return () => {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (timerId) clearTimeout(timerId);
  };
}

export function useExportRecorder({
  audioRef,
  introVideoRef,
  hasIntro,
  videoElRef,
  imageRef,
  photoMoments = [],
  bgType,
  canvasRef,
  resolution,
  redrawAnnouncement,
  onStatus,
  suspendPreviewRef,
  initialExportFormat = 'mp4',
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadExtension, setDownloadExtension] = useState('webm');
  const [progress, setProgress] = useState(0);
  const supportedFormats = useMemo(
    () => getSupportedFormats(window.MediaRecorder),
    [],
  );
  const [selectedExportFormat, setSelectedExportFormat] = useState(() =>
    supportedFormats.some(
      (format) => format.id === initialExportFormat && format.supported,
    )
      ? initialExportFormat
      : (supportedFormats.find((format) => format.supported)?.id ?? ''),
  );

  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const introSourceNodeRef = useRef(null);
  const downloadUrlRef = useRef(null);

  const getAudioGraph = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextCtor();
      const source = audioCtx.createMediaElementSource(audioRef.current);
      source.connect(audioCtx.destination);
      audioCtxRef.current = audioCtx;
      sourceNodeRef.current = source;
    }
    return { audioCtx: audioCtxRef.current, source: sourceNodeRef.current };
  }, [audioRef]);

  const getIntroSource = useCallback(
    (audioCtx) => {
      if (!hasIntro || !introVideoRef.current) return null;
      if (!introSourceNodeRef.current) {
        introSourceNodeRef.current = audioCtx.createMediaElementSource(
          introVideoRef.current,
        );
      }
      return introSourceNodeRef.current;
    },
    [hasIntro, introVideoRef],
  );

  const startExport = useCallback(async () => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas || isExporting) return;

    setIsExporting(true);
    setProgress(0);
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = null;
    }
    setDownloadUrl(null);
    // While exporting, the recorder drives the canvas itself so the intro and
    // the announcement are drawn in order instead of fighting the live preview.
    if (suspendPreviewRef) suspendPreviewRef.current = true;
    onStatus('', 'Preparing export...');

    let recorder = null;
    let failed = false;
    let intro = null;
    let canvasStream = null;
    let canvasTrack = null;
    let mixDest = null;
    let stopPump = null;
    let wakeLock = null;
    const originalAudioVolume = audio.volume;
    const originalAudioLoop = audio.loop;

    const releaseResources = () => {
      if (stopPump) {
        stopPump();
        stopPump = null;
      }
      if (mixDest) {
        try {
          sourceNodeRef.current?.disconnect(mixDest);
        } catch {
          /* already disconnected */
        }
        try {
          introSourceNodeRef.current?.disconnect(mixDest);
        } catch {
          /* already disconnected */
        }
        mixDest = null;
      }
      if (canvasStream) {
        canvasStream.getTracks().forEach((track) => track.stop());
        canvasStream = null;
      }
      canvasTrack = null;
      audio.volume = originalAudioVolume;
      audio.loop = originalAudioLoop;
      if (suspendPreviewRef) suspendPreviewRef.current = false;
      if (wakeLock) {
        wakeLock.release?.().catch(() => {});
        wakeLock = null;
      }
    };

    try {
      const RecorderCtor = window.MediaRecorder;
      if (!RecorderCtor) {
        throw new Error(
          'Video recording is not supported by this browser. Try the latest Safari or Chrome.',
        );
      }
      if (typeof canvas.captureStream !== 'function') {
        throw new Error(
          'Canvas video export is not supported by this browser. Try the latest Safari or Chrome.',
        );
      }

      const selectedFormat = supportedFormats.find(
        (format) => format.id === selectedExportFormat,
      );
      if (!selectedFormat?.supported) {
        throw new Error(
          `${selectedFormat?.label ?? 'That format'} is not supported by this browser.`,
        );
      }

      const fps = EXPORT_FPS[resolution] || 30;

      // --- 0. keep the screen awake so a long export is not interrupted ---
      try {
        if (navigator.wakeLock?.request) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        wakeLock = null;
      }

      // --- 1. pre-scale every image that can appear in the video ---
      // Doing this up front means no frame during the recording pays the
      // decode/scale cost of a multi-megapixel photo, which is what makes the
      // recorder skip frames (and the exported video freeze on those frames).
      const imageSources = [];
      if (bgType === 'image' && imageRef?.current) {
        imageSources.push({ source: imageRef.current, vignette: true });
      }
      for (const photo of photoMoments) {
        // Photo moments are shown as-is, without the text vignette.
        if (photo.image) imageSources.push({ source: photo.image, vignette: false });
      }
      if (imageSources.length > 0) {
        // Bake in reverse so the photos that appear first are the most recently
        // used layers and survive cache eviction if the project has many.
        for (const { source, vignette } of [...imageSources].reverse()) {
          getCoverLayer(source, canvas.width, canvas.height, { vignette });
          // Yield so the progress modal can repaint between big images.
          await nextTask();
        }
      }

      // --- 2. build the recording graph ---
      canvasStream = canvas.captureStream(0);
      canvasTrack = canvasStream.getVideoTracks()[0];
      const canRequestCanvasFrame =
        typeof canvasTrack?.requestFrame === 'function';
      if (!canRequestCanvasFrame) {
        canvasStream.getTracks().forEach((track) => track.stop());
        canvasStream = canvas.captureStream(fps);
        canvasTrack = canvasStream.getVideoTracks()[0];
      }

      const { audioCtx, source } = getAudioGraph();
      await audioCtx.resume();
      mixDest = audioCtx.createMediaStreamDestination();
      source.connect(mixDest);
      const introSource = getIntroSource(audioCtx);
      if (introSource) introSource.connect(mixDest);

      const combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...mixDest.stream.getAudioTracks(),
      ]);

      const bitrate = EXPORT_BITRATE[resolution];
      const recorderOptions = {
        ...(selectedFormat.mimeType
          ? { mimeType: selectedFormat.mimeType }
          : {}),
        ...(bitrate ? { videoBitsPerSecond: bitrate } : {}),
      };
      try {
        recorder = new RecorderCtor(combined, recorderOptions);
      } catch {
        recorder = new RecorderCtor(combined);
      }

      const mimeType =
        recorder.mimeType || selectedFormat.mimeType || 'video/webm';
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        releaseResources();
        if (failed) return;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        downloadUrlRef.current = url;
        setDownloadUrl(url);
        setDownloadExtension(
          getVideoExtension(mimeType, selectedFormat.extension),
        );
        setProgress(1);
        setIsExporting(false);
        onStatus(
          'ok',
          'Done. Download the file below — it plays in any browser or video player, and CapCut/other editors can import it if you need further edits.',
        );
      };

      // --- 3. rewind every source before the first frame is drawn ---
      intro = hasIntro ? introVideoRef.current : null;
      audio.pause();
      audio.loop = false;
      await seekTo(audio, 0);
      if (intro) await seekTo(intro, 0);
      if (bgType === 'video' && videoElRef.current) {
        await seekTo(videoElRef.current, 0);
      }

      const totalDuration =
        (Number.isFinite(audio.duration) ? audio.duration : 0) +
        (intro && Number.isFinite(intro.duration) ? intro.duration : 0);
      let completedDuration = 0;
      const updateProgress = (media) => {
        if (totalDuration > 0) {
          setProgress(
            Math.min(
              1,
              (completedDuration + media.currentTime) / totalDuration,
            ),
          );
        }
      };

      const pushFrame = (drawFrame) => {
        try {
          drawFrame?.();
        } catch {
          // Never let one bad frame abort the whole export.
        }
        if (canRequestCanvasFrame) {
          try {
            canvasTrack.requestFrame();
          } catch {
            /* recorder already stopped */
          }
        }
      };

      const ctx = canvas.getContext('2d');
      const drawIntroFrame = () => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (intro.readyState >= 2) {
          drawCover(ctx, intro, canvas.width, canvas.height);
        }
      };

      // One frame pump for the whole export. It keeps pushing frames across the
      // intro -> announcement hand-off, where the media is paused, rewound and
      // restarted; stopping it there left a frozen gap in the recording.
      let activeDraw = intro ? drawIntroFrame : redrawAnnouncement;
      let activeMedia = null;
      let activeFinish = null;
      let recorderStarted = false;

      const onFrame = () => {
        if (activeMedia && isMediaFinished(activeMedia)) {
          activeFinish?.();
          return;
        }
        pushFrame(activeDraw);
      };

      // The recorder must not start until the playhead is moving: any delay
      // between start() and the first audio sample shifts the whole video track
      // against the audio track (frozen first frame, then permanent drift).
      const startRecorder = () => {
        if (recorderStarted) return;
        recorderStarted = true;
        pushFrame(activeDraw);
        recorder.start(1000);
      };

      const runPhase = (media, drawFrame) =>
        new Promise((resolve, reject) => {
          let settled = false;
          const finish = (error) => {
            if (settled) return;
            settled = true;
            if (activeMedia === media) {
              activeMedia = null;
              activeFinish = null;
            }
            media.removeEventListener('ended', handleEnded);
            media.removeEventListener('error', handleError);
            media.removeEventListener('timeupdate', handleProgress);
            if (error) reject(error);
            else resolve();
          };
          const handleEnded = () => finish();
          const handleError = () =>
            finish(new Error('A media file could not be played during export'));
          const handleProgress = () => updateProgress(media);

          media.addEventListener('ended', handleEnded);
          media.addEventListener('error', handleError);
          media.addEventListener('timeupdate', handleProgress);

          media
            .play()
            .then(async () => {
              if (settled) return;
              await waitForPlaybackStart(media);
              if (settled) return;
              activeMedia = media;
              activeFinish = finish;
              activeDraw = drawFrame;
              startRecorder();
              if (!stopPump) stopPump = startFramePump({ fps, onFrame });
            })
            .catch((error) => finish(error));
        });

      if (intro) {
        onStatus('', 'Recording intro video...');
        // Play the narration muted (and looping) while the intro runs so the
        // browser's autoplay window stays open, then restart it from 0 for the
        // announcement once the intro finishes.
        audio.volume = 0;
        audio.loop = true;
        const narrationStarted = audio.play().catch(() => {});
        await runPhase(intro, drawIntroFrame);
        completedDuration = Number.isFinite(intro.duration) ? intro.duration : 0;
        audio.pause();
        audio.loop = false;
        audio.volume = originalAudioVolume;
        await seekTo(audio, 0);
        if (bgType === 'video' && videoElRef.current) {
          await seekTo(videoElRef.current, 0);
        }
        await narrationStarted;
        onStatus(
          '',
          'Recording announcement... keep this tab visible until it finishes.',
        );
        await runPhase(audio, redrawAnnouncement);
      } else {
        onStatus(
          '',
          'Recording announcement... keep this tab visible until it finishes.',
        );
        await runPhase(audio, redrawAnnouncement);
      }

      // Hold the final frame long enough for the encoder to pick it up, then
      // close the file.
      pushFrame(redrawAnnouncement);
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(120, 2000 / fps)),
      );
      if (recorder.state === 'recording') {
        recorder.stop();
      } else {
        releaseResources();
        setIsExporting(false);
        onStatus(
          'warn',
          'Recording stopped before it finished. Keep this tab visible during the export and try again.',
        );
      }
    } catch (err) {
      failed = true;
      releaseResources();
      if (recorder?.state === 'recording') recorder.stop();
      audio.pause();
      if (intro) intro.pause();
      setIsExporting(false);
      onStatus(
        'warn',
        `Export failed${err.name ? ` (${err.name})` : ''}: ${err.message}. Keep this tab visible and try again; if this continues, try Chrome or Edge.`,
      );
    }
  }, [
    audioRef,
    introVideoRef,
    hasIntro,
    videoElRef,
    imageRef,
    photoMoments,
    bgType,
    canvasRef,
    resolution,
    isExporting,
    getAudioGraph,
    getIntroSource,
    redrawAnnouncement,
    onStatus,
    suspendPreviewRef,
    supportedFormats,
    selectedExportFormat,
  ]);

  useEffect(() => {
    return () => {
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (!isExporting) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isExporting]);

  // Hidden tabs stop requestAnimationFrame, which punches a frozen gap into the
  // recording. Warn instead of silently shipping a broken file.
  useEffect(() => {
    if (!isExporting) return undefined;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        onStatus(
          'warn',
          'This tab is in the background. Bring it back to the front — background tabs stop drawing frames and the exported video will freeze.',
        );
      } else {
        onStatus(
          '',
          'Recording announcement... keep this tab visible until it finishes.',
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, [isExporting, onStatus]);

  return {
    isExporting,
    downloadUrl,
    downloadExtension,
    progress,
    startExport,
    supportedFormats,
    selectedExportFormat,
    setSelectedExportFormat,
  };
}
