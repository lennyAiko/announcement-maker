export default function StatusBanner({ status }) {
  const message = status?.message ?? '';
  const toneClass = status?.tone === 'ok' ? 'text-gold-dark' : status?.tone === 'warn' ? 'text-danger' : 'text-ink-soft';
  return <div className={`mt-2.5 min-h-[18px] text-[13px] ${toneClass}`}>{message}</div>;
}
