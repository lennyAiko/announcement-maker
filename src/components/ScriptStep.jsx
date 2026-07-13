import StepCard from './StepCard';

export default function ScriptStep({ value, onChange }) {
  return (
    <StepCard number={1} title="Paste the announcement">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the cleaned-up announcement text here. It will be split into caption lines at sentence boundaries. Insert a blank line to force a caption break where needed."
        className="min-h-[150px] w-full resize-y rounded-lg border border-line bg-[#fdfdfb] p-3 text-sm leading-relaxed text-ink focus:border-gold focus:outline focus:outline-2 focus:outline-gold-tint focus:outline-offset-1"
      />
    </StepCard>
  );
}
