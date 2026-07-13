import { RESOLUTION_OPTIONS } from '../lib/constants';
import StatusBanner from './StatusBanner';
import StepCard from './StepCard';

function getResolutionDims(value) {
  const opt = RESOLUTION_OPTIONS.find((o) => o.value === value);
  return opt || RESOLUTION_OPTIONS[0];
}

export default function PreviewExportStep({
  canvasRef,
  isPlaying,
  onTogglePlay,
  scrubInputRef,
  onScrubInput,
  onScrubCommit,
  timeLabel,
  hasAudio,
  canExport,
  isExporting,
  onExport,
  downloadUrl,
  exportStatus,
  resolution,
}) {
  const dims = getResolutionDims(resolution);

  return (
    <div className="sticky top-5">
      <StepCard number={5} title="Preview & export">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
          <canvas
            ref={canvasRef}
            width={dims.width}
            height={dims.height}
            className="block h-full w-full"
          />
        </div>

        <div className="mt-3.5 flex items-center gap-2.5">
          <button
            type="button"
            disabled={!hasAudio}
            onClick={onTogglePlay}
            className="rounded-lg border border-line bg-card px-3.5 py-2 text-sm font-semibold text-ink hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <input
            ref={scrubInputRef}
            type="range"
            min="0"
            max="1000"
            defaultValue="0"
            disabled={!hasAudio}
            onInput={onScrubInput}
            onChange={onScrubCommit}
            className="flex-1 accent-gold-dark"
          />
          <div className="min-w-[70px] text-right text-xs tabular-nums text-ink-soft">{timeLabel}</div>
        </div>

        <div className="my-[18px] h-px bg-line" />

        <button
          type="button"
          disabled={!canExport || isExporting}
          onClick={onExport}
          className="w-full rounded-lg bg-gold-dark px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-gold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export video
        </button>
        <StatusBanner status={exportStatus} />
        {downloadUrl && (
          <a
            href={downloadUrl}
            download="announcement-video.webm"
            className="mt-3 inline-block rounded-lg bg-gold-dark px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-gold"
          >
            Download video
          </a>
        )}
      </StepCard>
    </div>
  );
}
