import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_CAPTION_GAP, DEFAULT_PACE } from '../lib/constants';
import { distributeDurations, formatTime, splitIntoChunks } from '../lib/captions';

export function useCaptions(initialCaptions = []) {
  const [captions, setCaptions] = useState(() =>
    initialCaptions.map((caption) => ({
      ...caption,
      defaultDuration: caption.defaultDuration ?? caption.duration,
    })),
  );
  const [tapState, setTapState] = useState(null);
  const nextIdRef = useRef(
    initialCaptions.reduce(
      (nextId, caption) =>
        typeof caption.id === 'number'
          ? Math.max(nextId, caption.id + 1)
          : nextId,
      0,
    ),
  );

  const generate = useCallback((scriptText, audioDuration, { pace = DEFAULT_PACE, gap = DEFAULT_CAPTION_GAP, startPad = 0, endPad = 0 } = {}) => {
    const chunks = splitIntoChunks(scriptText);
    if (chunks.length === 0) {
      return { ok: false, message: 'Paste the announcement text first.' };
    }
    if (!audioDuration) {
      return { ok: false, message: 'Add the audio file first.' };
    }

    const distributed = distributeDurations(chunks, audioDuration, { pace, gap, startPad, endPad });
    setCaptions(
      distributed.map((c) => ({
        id: nextIdRef.current++,
        ...c,
        defaultDuration: c.duration,
      })),
    );

    return {
      ok: true,
      message: `${chunks.length} caption lines generated, timed evenly across ${formatTime(
        audioDuration,
      )} of audio. Adjust any line's seconds below if the timing feels off.`,
    };
  }, []);

  const distributeEvenly = useCallback((audioDuration, { pace = DEFAULT_PACE, gap = DEFAULT_CAPTION_GAP, startPad = 0, endPad = 0 } = {}) => {
    setCaptions((prev) => {
      if (prev.length === 0) return prev;
      const totalGapTime = Math.max(0, (prev.length - 1) * gap);
      const totalPad = startPad + endPad;
      const available = Math.max(0.1, audioDuration - totalGapTime - totalPad);
      const equalDuration = (available / prev.length) * pace;
      return prev.map((c) => ({
        ...c,
        duration: equalDuration,
        defaultDuration: equalDuration,
      }));
    });
  }, []);

  const updateDuration = useCallback((id, value) => {
    setCaptions((prev) => prev.map((c) => (c.id === id ? { ...c, duration: value } : c)));
  }, []);

  const resetDuration = useCallback((id) => {
    setCaptions((prev) =>
      prev.map((caption) =>
        caption.id === id
          ? { ...caption, duration: caption.defaultDuration }
          : caption,
      ),
    );
  }, []);

  const clearCaptions = useCallback(() => {
    setCaptions([]);
  }, []);

  const deleteCaption = useCallback((id) => {
    setCaptions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const moveCaption = useCallback((id, direction) => {
    setCaptions((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const startTapMode = useCallback((chunks) => {
    setTapState({
      active: true,
      currentIndex: 0,
      timestamps: [0],
      chunks,
    });
  }, []);

  const recordTap = useCallback((currentTime) => {
    setTapState((prev) => {
      if (!prev || !prev.active) return prev;
      const nextTimestamps = [...prev.timestamps, currentTime];
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.chunks.length) {
        return { ...prev, active: false, timestamps: nextTimestamps, currentIndex: nextIndex };
      }
      return { ...prev, timestamps: nextTimestamps, currentIndex: nextIndex };
    });
  }, []);

  const cancelTapMode = useCallback(() => {
    setTapState(null);
  }, []);

  useEffect(() => {
    if (!tapState || tapState.active || tapState.timestamps.length < tapState.chunks.length + 1) return;
    const durations = [];
    for (let i = 0; i < tapState.chunks.length; i++) {
      const dur = tapState.timestamps[i + 1] - tapState.timestamps[i];
      durations.push({
        text: tapState.chunks[i],
        duration: Math.max(0.1, dur),
      });
    }
    setCaptions(
      durations.map((c) => ({
        id: nextIdRef.current++,
        ...c,
        defaultDuration: c.duration,
      })),
    );
    setTapState(null);
  }, [tapState]);

  return {
    captions,
    generate,
    distributeEvenly,
    updateDuration,
    resetDuration,
    clearCaptions,
    deleteCaption,
    moveCaption,
    tapState,
    startTapMode,
    recordTap,
    cancelTapMode,
  };
}
