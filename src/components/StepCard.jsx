export default function StepCard({ number, title, children }) {
  return (
    <div className="mb-5 rounded-2xl border border-gold/30 bg-card/70 p-6 shadow-sm">
      <div className="mb-3.5 flex items-center gap-2.5">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold-tint text-xs font-bold text-gold-dark">
          {number}
        </div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}
