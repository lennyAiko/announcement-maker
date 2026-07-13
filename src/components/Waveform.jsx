import { useEffect, useRef } from 'react';

function drawWaveform(canvas, peaks, currentTime, duration, captions, gap, startPad) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (peaks.length === 0) return;

  const barWidth = w / peaks.length;
  const capHeight = h * 0.9;

  for (let i = 0; i < peaks.length; i++) {
    const barH = Math.max(2, peaks[i] * capHeight);
    const x = i * barWidth;
    const y = (h - barH) / 2;

    const barTime = (i / peaks.length) * duration;
    let isInsideCaption = false;
    let acc = startPad;
    for (let j = 0; j < captions.length; j++) {
      if (barTime >= acc && barTime < acc + captions[j].duration) {
        isInsideCaption = true;
        break;
      }
      acc += captions[j].duration + gap;
    }

    ctx.fillStyle = isInsideCaption ? '#d4a96a' : '#4a5266';
    ctx.fillRect(x, y, Math.max(1, barWidth - 1), barH);
  }

  if (captions.length > 0 && duration > 0) {
    let acc = startPad;
    ctx.strokeStyle = 'rgba(169,118,47,0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < captions.length; i++) {
      const x = (acc / duration) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      acc += captions[i].duration + gap;
    }
  }

  if (duration > 0) {
    const playheadX = (currentTime / duration) * w;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();
  }
}

export default function Waveform({ peaks, currentTime, duration, captions, gap, startPad }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWaveform(canvas, peaks, currentTime, duration, captions, gap, startPad);
  }, [peaks, currentTime, duration, captions, gap, startPad]);

  return (
    <div className="relative my-3 h-[60px] w-full overflow-hidden rounded-md bg-[#1c2230]">
      <canvas
        ref={canvasRef}
        width={800}
        height={120}
        className="block h-full w-full"
      />
    </div>
  );
}
