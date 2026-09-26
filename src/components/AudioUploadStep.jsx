import { useRef, useState } from 'react';
import { formatTime } from '../lib/captions';
import StepCard from './StepCard';

export default function AudioUploadStep({
  fileName,
  duration,
  onFileSelected,
}) {
  const hasFile = Boolean(fileName);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const isAudioFile = (file) =>
    file?.type.startsWith('audio/') ||
    /\.(mp3|wav|m4a|aac|caf|aiff|aif)$/i.test(file?.name);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (isAudioFile(file)) onFileSelected(file);
    event.target.value = '';
  };

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
    if (isAudioFile(file)) onFileSelected(file);
  };

  return (
    <StepCard number={2} title="Add the audio">
      <label
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`block cursor-pointer rounded-lg border-[1.5px] border-dashed p-5 text-center text-[13px] transition-colors ${
          isDragging
            ? 'border-gold bg-gold-tint font-semibold text-gold-dark'
            : hasFile
              ? 'border-gold bg-gold-tint font-semibold text-gold-dark'
              : 'border-line text-ink-soft hover:border-gold hover:bg-gold-tint'
        }`}
      >
        <input
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.aac,.caf,.aiff,.aif"
          className="sr-only"
          onChange={handleFileChange}
        />
        {hasFile
          ? `${fileName} — ${formatTime(duration)}`
          : isDragging
            ? 'Drop the audio file here'
            : 'Click to choose or drop the audio file from luvvoice (mp3 or wav)'}
      </label>
    </StepCard>
  );
}
