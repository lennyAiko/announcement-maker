import { useCallback, useEffect, useRef, useState } from 'react';

export function useIntroVideo() {
  const introVideoRef = useRef(null);
  const objectUrlRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const loadFile = useCallback((file) => {
    const video = introVideoRef.current;
    if (!file || !video) return;

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setFileName(file.name);
    setDuration(0);
    setIsReady(false);
    video.src = url;
    video.load();
  }, []);

  const removeFile = useCallback(() => {
    const video = introVideoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setFileName('');
    setDuration(0);
    setIsReady(false);
  }, []);

  useEffect(() => {
    const video = introVideoRef.current;
    if (!video) return undefined;

    const handleMetadata = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setIsReady(video.readyState >= 1);
    };
    video.addEventListener('loadedmetadata', handleMetadata);
    return () => video.removeEventListener('loadedmetadata', handleMetadata);
  }, []);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  return { introVideoRef, fileName, duration, isReady, loadFile, removeFile };
}
