import { useRef, useState } from 'react';
import { formatTime } from '../lib/captions';
import StepCard from './StepCard';

export default function IntroVideoStep({
  fileName,
  duration,
  onFileSelected,
  onRemove,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const isVideoFile = (file) =>
    file?.type.startsWith('video/') ||
    /\.(mp4|webm|mov|m4v|avi)$/i.test(file?.name);

  const handleDragEnter = (event) => {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (isVideoFile(file)) onFileSelected(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (isVideoFile(file)) onFileSelected(file);
    event.target.value = '';
  };

  return (
    <StepCard number={3} title="Add an intro video (optional choice)">
      <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
        This clip, including its audio, will play before the announcement in the
        exported video.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label
          onDragEnter={handleDragEnter}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-lg border border-dashed px-[18px] py-2.5 text-sm font-semibold transition-colors ${
            isDragging
              ? 'border-gold bg-gold-tint text-gold-dark'
              : 'border-gold text-gold-dark hover:bg-gold-tint'
          }`}
        >
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {isDragging
            ? 'Drop intro video here'
            : fileName
              ? 'Replace intro video'
              : 'Choose or drop intro video'}
        </label>
        {fileName ? (
          <>
            <span className="text-[13px] text-ink-soft">
              {fileName} — {formatTime(duration)}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-soft hover:border-danger hover:text-danger"
            >
              Remove
            </button>
          </>
        ) : null}
      </div>
    </StepCard>
  );
}
