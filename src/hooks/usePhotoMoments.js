import { useCallback, useEffect, useRef, useState } from 'react';

let nextPhotoId = 0;

function createPhotoId() {
  nextPhotoId += 1;
  return `photo-${Date.now()}-${nextPhotoId}`;
}

export function usePhotoMoments(initialMoments = []) {
  const [photoMoments, setPhotoMoments] = useState(() =>
    initialMoments.map((moment) => ({
      ...moment,
      image: null,
      objectUrl: '',
    })),
  );
  const objectUrlsRef = useRef(new Map());

  const loadPhoto = useCallback(async (file, metadata) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error(`Could not load ${file.name}.`));
        image.src = objectUrl;
      });
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }

    objectUrlsRef.current.set(metadata.id, objectUrl);
    setPhotoMoments((previous) => [
      ...previous.filter((moment) => moment.id !== metadata.id),
      {
        ...metadata,
        fileName: file.name,
        image,
        objectUrl,
      },
    ]);
  }, []);

  const addPhoto = useCallback(
    async (file, startTime, duration) => {
      const start = Number.isFinite(startTime) ? Math.max(0, startTime) : 0;
      const length = Number.isFinite(duration)
        ? Math.max(0.1, duration)
        : 3;
      const metadata = {
        id: createPhotoId(),
        fileName: file.name,
        startTime: start,
        duration: length,
      };
      await loadPhoto(file, metadata);
      return metadata;
    },
    [loadPhoto],
  );

  const restorePhoto = useCallback(
    (file, metadata) => loadPhoto(file, metadata),
    [loadPhoto],
  );

  const updatePhoto = useCallback((id, changes) => {
    setPhotoMoments((previous) =>
      previous.map((moment) =>
        moment.id === id ? { ...moment, ...changes } : moment,
      ),
    );
  }, []);

  const removePhoto = useCallback((id) => {
    const objectUrl = objectUrlsRef.current.get(id);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrlsRef.current.delete(id);
    setPhotoMoments((previous) =>
      previous.filter((moment) => moment.id !== id),
    );
  }, []);

  const clearPhotos = useCallback(() => {
    for (const objectUrl of objectUrlsRef.current.values()) {
      URL.revokeObjectURL(objectUrl);
    }
    objectUrlsRef.current.clear();
    setPhotoMoments([]);
  }, []);

  useEffect(
    () => () => {
      for (const objectUrl of objectUrlsRef.current.values()) {
        URL.revokeObjectURL(objectUrl);
      }
    },
    [],
  );

  return {
    photoMoments,
    addPhoto,
    restorePhoto,
    updatePhoto,
    removePhoto,
    clearPhotos,
  };
}
