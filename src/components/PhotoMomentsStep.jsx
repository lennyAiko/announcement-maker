import { useState } from 'react';
import { formatTime } from '../lib/captions';
import StepCard from './StepCard';

function isImageFile(file) {
  return file?.type.startsWith('image/') && file.type !== 'image/svg+xml';
}

export default function PhotoMomentsStep({
  photoMoments,
  audioDuration,
  currentTime,
  isExporting,
  onAddPhoto,
  onUpdatePhoto,
  onRemovePhoto,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [duration, setDuration] = useState(3);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file && !isImageFile(file)) {
      setError('Choose an image file such as JPG, PNG, or WebP.');
      return;
    }
    setError('');
    setSelectedFile(file ?? null);
  };

  const handleAddPhoto = async () => {
    if (!selectedFile) return;
    const added = await onAddPhoto(selectedFile, currentTime, duration);
    if (added) setSelectedFile(null);
  };

  const sortedMoments = [...photoMoments].sort(
    (a, b) => a.startTime - b.startTime,
  );

  return (
    <StepCard number={6} title="Add photos to the timeline">
      <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
        Play or scrub the preview to where a photo should appear, choose it, and
        add it at that point. The narration and captions continue over the photo.
      </p>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-soft">
          Show photo for
          <select
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
            disabled={isExporting}
            className="rounded-md border border-line bg-card px-2.5 py-2 text-sm font-normal text-ink focus:border-gold focus:outline focus:outline-2 focus:outline-gold-tint"
          >
            <option value={3}>3 seconds</option>
            <option value={5}>5 seconds</option>
            <option value={8}>8 seconds</option>
            <option value={10}>10 seconds</option>
          </select>
        </label>
        <span className="pb-2 text-xs text-ink-soft">
          Preview position: {formatTime(currentTime)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-gold px-4 py-2.5 text-sm font-semibold text-gold-dark transition-colors hover:bg-gold-tint">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp"
            disabled={isExporting}
            className="sr-only"
            onChange={handleFileChange}
          />
          {selectedFile ? 'Choose a different photo' : 'Choose photo'}
        </label>
        <button
          type="button"
          disabled={!selectedFile || !audioDuration || isExporting}
          onClick={handleAddPhoto}
          className="rounded-lg bg-gold-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add at {formatTime(currentTime)}
        </button>
      </div>
      {selectedFile && (
        <p className="mt-2 truncate text-xs text-ink-soft">{selectedFile.name}</p>
      )}
      {!audioDuration && (
        <p className="mt-2 text-xs text-ink-soft">
          Add narration audio before placing photos on the timeline.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
      {sortedMoments.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {sortedMoments.map((moment) => (
            <li
              key={moment.id}
              className="flex items-center gap-3 py-2.5"
            >
              {moment.objectUrl ? (
                <img
                  src={moment.objectUrl}
                  alt=""
                  className="h-11 w-16 rounded object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="h-11 w-16 rounded bg-gold-tint"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {moment.fileName}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Starts at {formatTime(moment.startTime)} ·
                  <label className="ml-1 inline-flex items-center gap-1">
                    <span className="sr-only">Photo duration</span>
                    <select
                      value={moment.duration}
                      disabled={isExporting}
                      onChange={(event) =>
                        onUpdatePhoto(moment.id, {
                          duration: Number(event.target.value),
                        })
                      }
                      className="rounded border border-line bg-card px-1 py-0.5 text-xs text-ink focus:border-gold focus:outline focus:outline-2 focus:outline-gold-tint"
                    >
                      {[3, 5, 8, 10].map((seconds) => (
                        <option key={seconds} value={seconds}>
                          {seconds} seconds
                        </option>
                      ))}
                      {![3, 5, 8, 10].includes(moment.duration) && (
                        <option value={moment.duration}>
                          {moment.duration} seconds
                        </option>
                      )}
                    </select>
                  </label>
                </p>
              </div>
              <button
                type="button"
                disabled={!audioDuration || isExporting}
                onClick={() =>
                  onUpdatePhoto(moment.id, { startTime: currentTime })
                }
                className="rounded border border-line px-2 py-1 text-[11px] text-ink-soft hover:border-gold hover:text-ink disabled:opacity-40"
              >
                Move here
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => onRemovePhoto(moment.id)}
                className="rounded border border-line px-2 py-1 text-[11px] text-ink-soft hover:border-danger hover:text-danger disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </StepCard>
  );
}
