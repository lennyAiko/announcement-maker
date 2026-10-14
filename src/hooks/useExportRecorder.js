import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EXPORT_FPS, EXPORT_FORMAT_CANDIDATES } from '../lib/constants';
import { drawCover } from '../lib/canvasDraw';

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

export function useExportRecorder({
  audioRef,
  introVideoRef,
  hasIntro,
  videoElRef,
  bgType,
  canvasRef,
  resolution,
  redrawAnnouncement,
  onStatus,
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
      (format) =>
        format.id === initialExportFormat && format.supported,
    )
      ? initialExportFormat
      : (supportedFormats.find((format) => format.supported)?.id ?? ''),
  );

  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const introSourceNodeRef = useRef(null);
  const downloadUrlRef = useRef(null);
  const endedHandlerRef = useRef(null);
  const timeUpdateHandlerRef = useRef(null);

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
    onStatus('', 'Preparing export...');

    let recorder;
    let failed = false;
    let originalAudioVolume = audio.volume;
    let originalAudioLoop = audio.loop;
    let intro;
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
      const canvasStream = canvas.captureStream(fps);
      const { audioCtx, source } = getAudioGraph();
      const audioContextReady = audioCtx.resume();
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      const introSource = getIntroSource(audioCtx);
      if (introSource) introSource.connect(dest);

      const combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      recorder = selectedFormat.mimeType
        ? new RecorderCtor(combined, { mimeType: selectedFormat.mimeType })
        : new RecorderCtor(combined);
      const mimeType =
        recorder.mimeType || selectedFormat.mimeType || 'video/webm';
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        source.disconnect(dest);
        if (introSource) introSource.disconnect(dest);
        audio.volume = originalAudioVolume;
        audio.loop = originalAudioLoop;
        if (failed) return;
        if (timeUpdateHandlerRef.current) {
          audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current);
          timeUpdateHandlerRef.current = null;
        }
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

      intro = hasIntro ? introVideoRef.current : null;
      originalAudioVolume = audio.volume;
      originalAudioLoop = audio.loop;
      audio.currentTime = 0;
      if (intro) Reflect.set(intro, 'currentTime', 0);
      if (bgType === 'video' && videoElRef.current)
        videoElRef.current.currentTime = 0;
      if (intro) {
        audio.volume = 0;
        audio.loop = true;
      }

      recorder.start();

      const totalDuration = audio.duration + (intro?.duration || 0);
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

      const playToEnd = (media, drawFrame, startPlayback = true) =>
        new Promise((resolve, reject) => {
          let animationFrame;
          const draw = () => {
            drawFrame?.();
            animationFrame = requestAnimationFrame(draw);
          };
          const cleanup = () => {
            media.removeEventListener('ended', handleEnded);
            media.removeEventListener('error', handleError);
            media.removeEventListener('timeupdate', handleProgress);
            if (animationFrame) cancelAnimationFrame(animationFrame);
          };
          const handleEnded = () => {
            cleanup();
            resolve();
          };
          const handleError = () => {
            cleanup();
            reject(new Error('A media file could not be played during export'));
          };
          const handleProgress = () => updateProgress(media);
          media.addEventListener('ended', handleEnded, { once: true });
          media.addEventListener('error', handleError, { once: true });
          media.addEventListener('timeupdate', handleProgress);
          if (drawFrame) draw();
          if (startPlayback) {
            media.play().catch((error) => {
              cleanup();
              reject(error);
            });
          }
        });

      const handleEnded = () => recorder.stop();
      endedHandlerRef.current = handleEnded;
      onStatus(
        '',
        intro ? 'Recording intro video...' : 'Recording announcement...',
      );

      let announcementPlayback;
      if (intro) {
        const ctx = canvas.getContext('2d');
        const introPlayback = playToEnd(intro, () => {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (intro.readyState >= 2) {
            drawCover(
              ctx,
              intro,
              intro.videoWidth,
              intro.videoHeight,
              canvas.width,
              canvas.height,
            );
          }
        });
        const audioStarted = audio.play();
        await audioContextReady;
        await Promise.all([introPlayback, audioStarted]);
        completedDuration = intro.duration;
        audio.loop = false;
        audio.currentTime = 0;
        audio.volume = originalAudioVolume;
        redrawAnnouncement();
        onStatus(
          '',
          'Recording announcement... keep this tab open until it finishes.',
        );
        audio.addEventListener('ended', handleEnded, { once: true });
        const handleTimeUpdate = () => updateProgress(audio);
        timeUpdateHandlerRef.current = handleTimeUpdate;
        audio.addEventListener('timeupdate', handleTimeUpdate);
        announcementPlayback = playToEnd(audio, undefined, false);
      } else {
        redrawAnnouncement();
        onStatus(
          '',
          'Recording announcement... keep this tab open until it finishes.',
        );
        audio.addEventListener('ended', handleEnded, { once: true });
        const handleTimeUpdate = () => updateProgress(audio);
        timeUpdateHandlerRef.current = handleTimeUpdate;
        audio.addEventListener('timeupdate', handleTimeUpdate);
        announcementPlayback = playToEnd(audio);
        await audioContextReady;
      }
      await announcementPlayback;
    } catch (err) {
      failed = true;
      if (recorder?.state === 'recording') recorder.stop();
      audio.pause();
      if (intro) intro.pause();
      if (endedHandlerRef.current) {
        audio.removeEventListener('ended', endedHandlerRef.current);
        endedHandlerRef.current = null;
      }
      if (timeUpdateHandlerRef.current) {
        audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current);
        timeUpdateHandlerRef.current = null;
      }
      audio.volume = originalAudioVolume;
      audio.loop = originalAudioLoop;
      setIsExporting(false);
      if (audio && timeUpdateHandlerRef.current) {
        audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current);
        timeUpdateHandlerRef.current = null;
      }
      onStatus(
        'warn',
        `Export failed${err.name ? ` (${err.name})` : ''}: ${err.message}. Keep Safari in the foreground and try again; if this continues, try Chrome or Edge.`,
      );
    }
  }, [
    audioRef,
    introVideoRef,
    hasIntro,
    videoElRef,
    bgType,
    canvasRef,
    resolution,
    isExporting,
    getAudioGraph,
    getIntroSource,
    redrawAnnouncement,
    onStatus,
    supportedFormats,
    selectedExportFormat,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio && endedHandlerRef.current) {
        audio.removeEventListener('ended', endedHandlerRef.current);
      }
      if (audio && timeUpdateHandlerRef.current) {
        audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current);
      }
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [audioRef]);

  useEffect(() => {
    if (!isExporting) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isExporting]);

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
