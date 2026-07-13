import { useCallback, useEffect, useRef } from 'react';
import { DEFAULT_CAPTION_GAP } from '../lib/constants';
import { renderFrame } from '../lib/canvasDraw';

export function useCanvasPreview({
  audioRef,
  videoElRef,
  imageRef,
  bgType,
  bgColor,
  textColor,
  fontSize,
  fontFamily,
  textPosition,
  isImageReady,
  isVideoReady,
  captions,
  isPlaying,
  gap = DEFAULT_CAPTION_GAP,
}) {
  const canvasRef = useRef(null);
  const rafIdRef = useRef(null);
  const inputsRef = useRef(null);

  const redrawNow = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const inputs = inputsRef.current;
    const audio = audioRef.current;
    renderFrame(ctx, {
      width: canvas.width,
      height: canvas.height,
      bgColor: inputs.bgColor,
      textColor: inputs.textColor,
      fontSize: inputs.fontSize,
      fontFamily: inputs.fontFamily,
      textPosition: inputs.textPosition,
      bgType: inputs.bgType,
      bgImage: imageRef.current,
      isImageReady: inputs.isImageReady,
      bgVideo: videoElRef.current,
      isVideoReady: inputs.isVideoReady,
      captions: inputs.captions,
      currentTime: audio ? audio.currentTime : 0,
      gap: inputs.gap,
    });
  }, [audioRef, imageRef, videoElRef]);

  useEffect(() => {
    inputsRef.current = {
      bgType,
      bgColor,
      textColor,
      fontSize,
      fontFamily,
      textPosition,
      isImageReady,
      isVideoReady,
      captions,
      gap,
    };
    redrawNow();
  }, [redrawNow, bgType, bgColor, textColor, fontSize, fontFamily, textPosition, isImageReady, isVideoReady, captions, gap]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const loop = () => {
      redrawNow();
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isPlaying, redrawNow]);

  return { canvasRef, redrawNow };
}
