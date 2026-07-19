import { useCallback, useEffect, useRef, useState } from 'react';
import { EXPORT_FPS, EXPORT_MIME_CANDIDATES } from '../lib/constants';

function pickMimeType() {
  for (const candidate of EXPORT_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return EXPORT_MIME_CANDIDATES[EXPORT_MIME_CANDIDATES.length - 1];
}

export function useExportRecorder({ audioRef, videoElRef, bgType, canvasRef, resolution, onStatus }) {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [progress, setProgress] = useState(0);

  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
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

    try {
      const fps = EXPORT_FPS[resolution] || 30;
      const canvasStream = canvas.captureStream(fps);
      const { audioCtx, source } = getAudioGraph();
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);

      const combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(combined, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        source.disconnect(dest);
        if (timeUpdateHandlerRef.current) {
          audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current);
          timeUpdateHandlerRef.current = null;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        downloadUrlRef.current = url;
        setDownloadUrl(url);
        setProgress(1);
        setIsExporting(false);
        onStatus(
          'ok',
          "Done. Download the file below — it plays in any browser or video player, and CapCut/other editors can import it if you need further edits.",
        );
      };

      audio.currentTime = 0;
      if (bgType === 'video' && videoElRef.current) videoElRef.current.currentTime = 0;
      await new Promise((r) => setTimeout(r, 100));

      recorder.start();

      const handleEnded = () => recorder.stop();
      endedHandlerRef.current = handleEnded;
      audio.addEventListener('ended', handleEnded, { once: true });

      const handleTimeUpdate = () => {
        const dur = audio.duration;
        if (dur > 0) setProgress(Math.min(1, audio.currentTime / dur));
      };
      timeUpdateHandlerRef.current = handleTimeUpdate;
      audio.addEventListener('timeupdate', handleTimeUpdate);

      await audio.play();
      onStatus('', 'Recording... keep this tab open until it finishes.');
    } catch (err) {
      setIsExporting(false);
      if (audio && timeUpdateHandlerRef.current) {
        audio.removeEventListener('timeupdate', timeUpdateHandlerRef.current);
        timeUpdateHandlerRef.current = null;
      }
      onStatus('warn', `Export failed: ${err.message}. Try Chrome or Edge if you're on another browser.`);
    }
  }, [audioRef, videoElRef, bgType, canvasRef, resolution, isExporting, getAudioGraph, onStatus]);

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

  return { isExporting, downloadUrl, progress, startExport };
}
