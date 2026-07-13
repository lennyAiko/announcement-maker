import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  PACE_OPTIONS,
  RESOLUTION_OPTIONS,
  TEXT_POSITION_OPTIONS,
} from '../lib/constants';
import StepCard from './StepCard';

const fieldLabelClass = 'text-[11px] font-semibold uppercase tracking-wide text-ink-soft';
const selectClass = 'rounded-md border border-line px-2 py-1.5 text-sm focus:border-gold focus:outline focus:outline-2 focus:outline-gold-tint';
const colorInputClass = 'h-[30px] w-11 cursor-pointer rounded-md border border-line p-0.5';

export default function BackgroundStyleStep({
  bgType,
  setBgType,
  bgColor,
  setBgColor,
  textColor,
  setTextColor,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  textPosition,
  setTextPosition,
  resolution,
  setResolution,
  speakingPace,
  setSpeakingPace,
  onImageFile,
  onVideoFile,
}) {
  return (
    <StepCard number={4} title="Style the background">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className={fieldLabelClass}>Background type</label>
          <select value={bgType} onChange={(e) => setBgType(e.target.value)} className={selectClass}>
            <option value="color">Solid color</option>
            <option value="image">Image</option>
            <option value="video">Video loop</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabelClass}>Background color</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className={colorInputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabelClass}>Text color</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className={colorInputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabelClass}>Font</label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className={selectClass}
          >
            {FONT_FAMILY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabelClass}>Font size</label>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className={selectClass}
          >
            {FONT_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabelClass}>Text position</label>
          <select
            value={textPosition}
            onChange={(e) => setTextPosition(e.target.value)}
            className={selectClass}
          >
            {TEXT_POSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabelClass}>Resolution</label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className={selectClass}
          >
            {RESOLUTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabelClass}>Speaking pace</label>
          <select
            value={speakingPace}
            onChange={(e) => setSpeakingPace(Number(e.target.value))}
            className={selectClass}
          >
            {PACE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-4">
        {bgType === 'image' && (
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <label className={fieldLabelClass}>Background image</label>
            <input
              type="file"
              accept="image/*"
              className="text-xs"
              onChange={(e) => onImageFile(e.target.files[0])}
            />
          </div>
        )}
        {bgType === 'video' && (
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <label className={fieldLabelClass}>Background video (loops to fill the audio)</label>
            <input
              type="file"
              accept="video/*"
              className="text-xs"
              onChange={(e) => onVideoFile(e.target.files[0])}
            />
          </div>
        )}
      </div>
    </StepCard>
  );
}
