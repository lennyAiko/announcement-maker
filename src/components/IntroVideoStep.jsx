import { formatTime } from '../lib/captions';
import StepCard from './StepCard';

export default function IntroVideoStep({
  fileName,
  duration,
  onFileSelected,
  onRemove,
}) {
  return (
    <StepCard number={3} title="Add an intro video (optional)">
      <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
        This clip, including its audio, will play before the announcement in the
        exported video.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-lg border border-dashed border-gold px-[18px] py-2.5 text-sm font-semibold text-gold-dark hover:bg-gold-tint">
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => onFileSelected(event.target.files[0])}
          />
          {fileName ? 'Replace intro video' : 'Choose intro video'}
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
