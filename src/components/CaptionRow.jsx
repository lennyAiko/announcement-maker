import { useEffect, useRef } from 'react';

export default function CaptionRow({ caption, isActive, isFirst, isLast, onDurationChange, onDelete, onMoveUp, onMoveDown }) {
  const rowRef = useRef(null);

  useEffect(() => {
    if (isActive && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  const commit = (e) => {
    const val = parseFloat(e.target.value);
    if (!Number.isNaN(val) && val > 0) onDurationChange(caption.id, val);
  };

  return (
    <div
      ref={rowRef}
      className={`grid grid-cols-[1fr_70px_auto] items-center gap-2 border-b border-line py-2 last:border-b-0 transition-colors ${
        isActive ? 'rounded-md border-l-[3px] border-l-gold bg-gold-tint/50 pl-2' : ''
      }`}
    >
      <div className="text-[13px] text-ink">{caption.text}</div>
      <input
        key={`${caption.id}:${caption.duration}`}
        type="number"
        min="0.2"
        step="0.1"
        defaultValue={caption.duration.toFixed(1)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-16 rounded-md border border-line px-1.5 py-1 text-right text-xs"
      />
      <div className="flex items-center gap-0.5">
        <span className="text-[11px] text-ink-soft">sec</span>
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onMoveUp(caption.id)}
          title="Move up"
          className="ml-1 cursor-pointer rounded px-1 text-[10px] text-ink-soft hover:bg-line hover:text-ink disabled:cursor-default disabled:opacity-30"
        >
          &#8593;
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => onMoveDown(caption.id)}
          title="Move down"
          className="cursor-pointer rounded px-1 text-[10px] text-ink-soft hover:bg-line hover:text-ink disabled:cursor-default disabled:opacity-30"
        >
          &#8595;
        </button>
        <button
          type="button"
          onClick={() => onDelete(caption.id)}
          title="Delete"
          className="cursor-pointer rounded px-1 text-[10px] text-ink-soft hover:bg-danger/10 hover:text-danger"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
