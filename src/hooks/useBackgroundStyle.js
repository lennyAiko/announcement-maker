import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_BG_COLOR,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_PACE,
  DEFAULT_RESOLUTION,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_POSITION,
} from '../lib/constants';

export function useBackgroundStyle(isAudioPlaying) {
  const videoElRef = useRef(null);
  const imageRef = useRef(null);
  const imageObjectUrlRef = useRef(null);
  const videoObjectUrlRef = useRef(null);

  const [bgType, setBgType] = useState('color');
  const [bgColor, setBgColor] = useState(DEFAULT_BG_COLOR);
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT_FAMILY);
  const [textPosition, setTextPosition] = useState(DEFAULT_TEXT_POSITION);
  const [resolution, setResolution] = useState(DEFAULT_RESOLUTION);
  const [speakingPace, setSpeakingPace] = useState(DEFAULT_PACE);
  const [isImageReady, setIsImageReady] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const loadImageFile = useCallback((file) => {
    if (!file) return;
    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
    }
    const url = URL.createObjectURL(file);
    imageObjectUrlRef.current = url;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setIsImageReady(true);
    };
    img.src = url;
  }, []);

  const loadVideoFile = useCallback((file) => {
    const video = videoElRef.current;
    if (!file || !video) return;
    if (videoObjectUrlRef.current) {
      URL.revokeObjectURL(videoObjectUrlRef.current);
      videoObjectUrlRef.current = null;
    }
    setIsVideoReady(false);
    const url = URL.createObjectURL(file);
    videoObjectUrlRef.current = url;
    video.src = url;
  }, []);

  useEffect(() => {
    const video = videoElRef.current;
    if (!video) return;

    const handleLoadedData = () => setIsVideoReady(true);
    video.addEventListener('loadeddata', handleLoadedData);
    return () => video.removeEventListener('loadeddata', handleLoadedData);
  }, []);

  useEffect(() => {
    const video = videoElRef.current;
    if (!video || !isVideoReady) return;
    if (bgType === 'video' && isAudioPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [bgType, isAudioPlaying, isVideoReady]);

  const seekVideoToAudioTime = useCallback((seconds) => {
    const video = videoElRef.current;
    if (video && video.duration) {
      video.currentTime = seconds % video.duration;
    }
  }, []);

  const resetVideo = useCallback(() => {
    const video = videoElRef.current;
    if (video) video.currentTime = 0;
  }, []);

  useEffect(() => {
    return () => {
      if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
      if (videoObjectUrlRef.current) URL.revokeObjectURL(videoObjectUrlRef.current);
    };
  }, []);

  return {
    videoElRef,
    imageRef,
    bgType,
    setBgType,
    bgColor,
    setBgColor,
    textColor,
    setTextColor,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    textPosition,
    setTextPosition,
    resolution,
    setResolution,
    speakingPace,
    setSpeakingPace,
    isImageReady,
    isVideoReady,
    loadImageFile,
    loadVideoFile,
    seekVideoToAudioTime,
    resetVideo,
  };
}
