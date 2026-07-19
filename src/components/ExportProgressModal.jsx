export default function ExportProgressModal({ open, progress, message }) {
  if (!open) return null;

  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl">
        <h2 className="mb-1 font-serif text-lg font-normal text-ink">Exporting video…</h2>
        <p className="mb-4 text-[13px] leading-relaxed text-ink-soft">
          Please keep this tab open and don't switch apps until this finishes.
        </p>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-gold-dark transition-[width] duration-150 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 text-right text-xs tabular-nums text-ink-soft">{pct}%</div>

        {message && <div className="mt-3 text-[13px] text-ink-soft">{message}</div>}
      </div>
    </div>
  );
}
