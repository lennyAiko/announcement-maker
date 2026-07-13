import { FONT_FAMILY_STACKS, FADE_DURATION } from './constants';
import { currentCaptionAt } from './captions';

export function drawCover(ctx, source, sw, sh, w, h) {
  const ir = sw / sh;
  const cr = w / h;
  let dw, dh, dx, dy;
  if (ir > cr) {
    dh = h;
    dw = h * ir;
    dx = (w - dw) / 2;
    dy = 0;
  } else {
    dw = w;
    dh = w / ir;
    dx = 0;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(source, dx, dy, dw, dh);
}

function getCaptionLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  return lines;
}

function getCaptionMetrics(ctx, text, centerX, centerY, maxWidth, lineHeight) {
  const lines = getCaptionLines(ctx, text, maxWidth);
  let maxW = 0;
  const positioned = lines.map((l, i) => {
    const w = ctx.measureText(l).width;
    if (w > maxW) maxW = w;
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
    return { text: l, x: centerX, y: startY + i * lineHeight, width: w };
  });
  return {
    lines: positioned,
    totalHeight: lines.length * lineHeight,
    maxWidth: maxW,
    lineCount: lines.length,
  };
}

function drawCaptionBar(ctx, metrics, centerX, centerY, padX, padY) {
  const barW = metrics.maxWidth + padX * 2;
  const barH = metrics.totalHeight + padY * 2;
  const barX = centerX - barW / 2;
  const barY = centerY - barH / 2;
  const radius = 12;

  ctx.beginPath();
  ctx.moveTo(barX + radius, barY);
  ctx.lineTo(barX + barW - radius, barY);
  ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + radius);
  ctx.lineTo(barX + barW, barY + barH - radius);
  ctx.quadraticCurveTo(barX + barW, barY + barH, barX + barW - radius, barY + barH);
  ctx.lineTo(barX + radius, barY + barH);
  ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - radius);
  ctx.lineTo(barX, barY + radius);
  ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
}

function drawCaptionText(ctx, metrics, textColor, strokeWidth) {
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  for (const line of metrics.lines) {
    ctx.strokeText(line.text, line.x, line.y);
  }
  ctx.fillStyle = textColor;
  for (const line of metrics.lines) {
    ctx.fillText(line.text, line.x, line.y);
  }
}

function drawGradientOverlay(ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.08)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

export function renderFrame(ctx, params) {
  const {
    width: w,
    height: h,
    bgColor,
    bgType,
    bgImage,
    isImageReady,
    bgVideo,
    isVideoReady,
    captions,
    currentTime,
    textColor,
    fontSize,
    gap = 0,
    fontFamily = 'sans-serif',
    textPosition = 'center',
  } = params;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  const hasVisualBg =
    (bgType === 'video' && bgVideo && isVideoReady && bgVideo.readyState >= 2) ||
    (bgType === 'image' && bgImage && isImageReady);

  if (hasVisualBg) {
    if (bgType === 'video') {
      drawCover(ctx, bgVideo, bgVideo.videoWidth, bgVideo.videoHeight, w, h);
    } else {
      drawCover(ctx, bgImage, bgImage.width, bgImage.height, w, h);
    }
    drawGradientOverlay(ctx, w, h);
  }

  const result = currentCaptionAt(captions, currentTime, gap);
  if (!result.text) return;

  const scale = w / 960;
  const size = fontSize * 1.7 * scale;
  const fontStack = FONT_FAMILY_STACKS[fontFamily] || FONT_FAMILY_STACKS['sans-serif'];
  ctx.font = `600 ${size}px ${fontStack}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const posY =
    textPosition === 'top'
      ? h * 0.18
      : textPosition === 'bottom'
        ? h * 0.82
        : h * 0.5;

  const maxWidth = w * 0.78;
  const lineHeight = size * 1.25;

  const metrics = getCaptionMetrics(ctx, result.text, w / 2, posY, maxWidth, lineHeight);

  let alpha = 1;
  const captionDuration = captions[result.index]?.duration || 0;
  if (captionDuration > 0) {
    const fadeRatio = Math.min(FADE_DURATION / captionDuration, 0.35);
    if (result.progress < fadeRatio) {
      alpha = result.progress / fadeRatio;
    } else if (result.progress > 1 - fadeRatio) {
      alpha = (1 - result.progress) / fadeRatio;
    }
    alpha = Math.max(0, Math.min(1, alpha));
  }

  if (alpha <= 0) return;

  ctx.globalAlpha = alpha;

  drawCaptionBar(ctx, metrics, w / 2, posY, 28 * scale, 16 * scale);

  const strokeWidth = size * 0.07;
  drawCaptionText(ctx, metrics, textColor, strokeWidth);

  ctx.globalAlpha = 1;
}
