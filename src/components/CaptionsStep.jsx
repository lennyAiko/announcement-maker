import CaptionRow from './CaptionRow';
import StatusBanner from './StatusBanner';
import StepCard from './StepCard';
import Waveform from './Waveform';

export default function CaptionsStep({
  captions,
  status,
  canGenerate,
  onGenerate,
  onDistributeEvenly,
  onDurationChange,
  activeCaptionId,
  onDelete,
  onMoveUp,
  onMoveDown,
  waveformPeaks,
  currentTime,
  audioDuration,
  gap,
  startPad,
  tapState,
  onStartTap,
  onRecordTap,
  onCancelTap,
}) {
  const isTapping = tapState && tapState.active;

  return (
    <StepCard number={3} title="Generate & fine-tune captions">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canGenerate || isTapping}
          onClick={onGenerate}
          className="rounded-lg bg-gold-dark px-[18px] py-2.5 text-sm font-semibold text-white transition-opacity hover:bg-gold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Generate captions
        </button>
        <button
          type="button"
          disabled={captions.length === 0 || isTapping}
          onClick={onDistributeEvenly}
          className="rounded-lg border border-line bg-card px-[18px] py-2.5 text-sm font-semibold text-ink hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Distribute evenly
        </button>
        <button
          type="button"
          disabled={!canGenerate || isTapping}
          onClick={onStartTap}
          className="rounded-lg border border-dashed border-gold px-[18px] py-2.5 text-sm font-semibold text-gold-dark hover:bg-gold-tint disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tap along
        </button>
      </div>

      {isTapping && (
        <div className="mt-3.5 flex flex-col items-center gap-3 rounded-lg border-2 border-gold bg-gold-tint p-5">
          <div className="text-sm font-semibold text-gold-dark">
            Tap at each caption boundary — {tapState.currentIndex + 1} of {tapState.chunks.length}
          </div>
          <div className="max-w-md text-center text-[13px] leading-relaxed text-ink">
            "{tapState.chunks[tapState.currentIndex]}"
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onRecordTap}
              className="rounded-xl bg-gold-dark px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-gold active:scale-95"
            >
              Tap
            </button>
            <button
              type="button"
              onClick={onCancelTap}
              className="rounded-xl border border-line bg-card px-5 py-4 text-sm font-semibold text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>
          <div className="text-[11px] text-ink-soft">Or press Space to tap</div>
        </div>
      )}

      <StatusBanner status={status} />

      {waveformPeaks.length > 0 && audioDuration > 0 && (
        <Waveform
          peaks={waveformPeaks}
          currentTime={currentTime}
          duration={audioDuration}
          captions={captions}
          gap={gap}
          startPad={startPad}
        />
      )}

      <div className="mt-3.5 max-h-80 overflow-y-auto">
        {captions.map((caption, i) => (
          <CaptionRow
            key={caption.id}
            caption={caption}
            isActive={caption.id === activeCaptionId}
            isFirst={i === 0}
            isLast={i === captions.length - 1}
            onDurationChange={onDurationChange}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        ))}
      </div>
    </StepCard>
  );
}
