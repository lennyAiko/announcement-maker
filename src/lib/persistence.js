const STORAGE_KEY = 'announcement-maker-state';
const MEDIA_DB_NAME = 'announcement-maker-media';
const MEDIA_STORE_NAME = 'files';
const MEDIA_DB_VERSION = 1;

function openMediaDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser does not support persistent file storage.'));
      return;
    }

    const request = indexedDB.open(MEDIA_DB_NAME, MEDIA_DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(MEDIA_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withMediaStore(mode, operation) {
  const database = await openMediaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(MEDIA_STORE_NAME, mode);
    const request = operation(transaction.objectStore(MEDIA_STORE_NAME));
    let result;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

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

export function saveMedia(key, file) {
  return withMediaStore('readwrite', (store) => store.put(file, key));
}

export function loadMedia(key) {
  return withMediaStore('readonly', (store) => store.get(key));
}

export function clearMedia(key) {
  return withMediaStore('readwrite', (store) => store.delete(key));
}
