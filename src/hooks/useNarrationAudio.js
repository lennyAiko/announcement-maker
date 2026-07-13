import { useCallback, useEffect, useRef, useState } from 'react';
import { formatTime } from '../lib/captions';

async function decodeWaveformPeaks(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const offlineCtx = new AudioContextClass();
    const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const sampleCount = 200;
    const windowSize = Math.floor(channelData.length / sampleCount);
    const peaks = [];
    for (let i = 0; i < sampleCount; i++) {
      let max = 0;
      const start = i * windowSize;
      const end = Math.min(start + windowSize, channelData.length);
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }
    offlineCtx.close();
    return peaks;
  } catch {
    return [];
  }
}

export function useNarrationAudio() {
  const audioRef = useRef(null);
  const scrubInputRef = useRef(null);
  const objectUrlRef = useRef(null);
  const isScrubbingRef = useRef(false);

  const [fileName, setFileName] = useState('');
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [timeLabel, setTimeLabel] = useState('0:00 / 0:00');
  const [waveformPeaks, setWaveformPeaks] = useState([]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      if (scrubInputRef.current) {
        scrubInputRef.current.max = String(Math.floor(audio.duration * 1000));
        scrubInputRef.current.value = '0';
      }
      setCurrentTime(0);
      setTimeLabel(`${formatTime(0)} / ${formatTime(audio.duration)}`);
    };

    const handleTimeUpdate = () => {
      if (!isScrubbingRef.current && scrubInputRef.current) {
        scrubInputRef.current.value = String(Math.floor(audio.currentTime * 1000));
      }
      setCurrentTime(audio.currentTime);
      setTimeLabel(`${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePauseOrEnd = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePauseOrEnd);
    audio.addEventListener('ended', handlePauseOrEnd);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePauseOrEnd);
      audio.removeEventListener('ended', handlePauseOrEnd);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const loadFile = useCallback((file) => {
    const audio = audioRef.current;
    if (!file || !audio) return;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    audio.src = url;
    setFileName(file.name);
    setWaveformPeaks([]);
    decodeWaveformPeaks(file).then(setWaveformPeaks);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }, []);

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
  }, []);

  const beginScrub = useCallback(() => {
    isScrubbingRef.current = true;
  }, []);

  const endScrub = useCallback(() => {
    isScrubbingRef.current = false;
  }, []);

  return {
    audioRef,
    scrubInputRef,
    fileName,
    duration,
    isPlaying,
    currentTime,
    timeLabel,
    waveformPeaks,
    loadFile,
    togglePlay,
    seek,
    beginScrub,
    endScrub,
  };
}
