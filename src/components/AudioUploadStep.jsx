import { formatTime } from '../lib/captions';
import StepCard from './StepCard';

export default function AudioUploadStep({ fileName, duration, onFileSelected }) {
  const hasFile = Boolean(fileName);
  return (
    <StepCard number={2} title="Add the audio">
      <label
        className={`block cursor-pointer rounded-lg border-[1.5px] border-dashed p-5 text-center text-[13px] transition-colors ${
          hasFile
            ? 'border-gold bg-gold-tint font-semibold text-gold-dark'
            : 'border-line text-ink-soft hover:border-gold hover:bg-gold-tint'
        }`}
      >
        <input
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => onFileSelected(e.target.files[0])}
        />
        {hasFile ? `${fileName} — ${formatTime(duration)}` : 'Click to choose the audio file from luvvoice (mp3 or wav)'}
      </label>
    </StepCard>
  );
}
