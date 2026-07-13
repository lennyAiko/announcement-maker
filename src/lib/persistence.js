const STORAGE_KEY = 'announcement-maker-state';

export function saveState(state) {
  try {
    const serializable = {
      scriptText: state.scriptText,
      captions: state.captions,
      bgType: state.bgType,
      bgColor: state.bgColor,
      textColor: state.textColor,
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      textPosition: state.textPosition,
      resolution: state.resolution,
      speakingPace: state.speakingPace,
      audioFileName: state.audioFileName,
      audioDuration: state.audioDuration,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // localStorage unavailable or full
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
