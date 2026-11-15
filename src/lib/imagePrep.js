/**
 * Pre-scaled "cover" layers for images.
 *
 * Both the live preview and the export redraw the canvas ~30 times a second.
 * Drawing a multi-megapixel photo straight onto a 1920x1080 canvas makes the
 * browser rescale that photo on every single frame. On a slow machine one of
 * those frames can take longer than a frame interval, the recorder misses
 * frames, and the exported file shows a frozen/stuttering stretch.
 *
 * So instead we scale each image exactly once into an offscreen canvas that is
 * already the output size (cropped to fill, like CSS `background-size: cover`),
 * optionally with the vignette baked in. Afterwards every frame is a cheap 1:1
 * blit instead of a full resize.
 *
 * The layers are cached per source image + size and evicted least-recently-used
 * once the cache grows past MAX_CACHE_BYTES.
 */

const MAX_CACHE_BYTES = 128 * 1024 * 1024;

/** @type {{ source: object, key: string, canvas: any, bytes: number, used: number }[]} */
const layers = [];
let cachedBytes = 0;
let clock = 0;

function createCanvas(width, height) {
  // A plain DOM canvas is deliberate: drawImage() from an OffscreenCanvas has
  // had rendering bugs in Safari, and there is no benefit here since all
  // drawing happens on the main thread.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Natural pixel size of anything drawImage accepts (image, canvas, video).
 */
export function getSourceSize(source) {
  if (!source) return null;
  const width = source.videoWidth || source.naturalWidth || source.width || 0;
  const height =
    source.videoHeight || source.naturalHeight || source.height || 0;
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * Source rectangle that fills `width` x `height` without distortion.
 */
export function computeCoverCrop(sourceWidth, sourceHeight, width, height) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  if (sourceRatio > targetRatio) {
    const cropWidth = sourceHeight * targetRatio;
    return {
      sx: (sourceWidth - cropWidth) / 2,
      sy: 0,
      sw: cropWidth,
      sh: sourceHeight,
    };
  }
  const cropHeight = sourceWidth / targetRatio;
  return {
    sx: 0,
    sy: (sourceHeight - cropHeight) / 2,
    sw: sourceWidth,
    sh: cropHeight,
  };
}

/**
 * Draws `source` covering the whole destination. Unlike a plain
 * drawImage(source, dx, dy, dw, dh) this crops at the source, so the browser
 * never rasterises pixels that fall outside the canvas.
 */
function paintCover(ctx, source, width, height) {
  const size = getSourceSize(source);
  if (!size) return false;

  const crop = computeCoverCrop(size.width, size.height, width, height);
  let { sx, sy, sw, sh } = crop;
  let current = source;

  // Progressive halving keeps detail that a single huge downscale throws away
  // (most browsers only filter bilinearly, which aliases badly on big photos).
  while (sw / 2 >= width && sh / 2 >= height) {
    const nextWidth = Math.max(width, Math.round(sw / 2));
    const nextHeight = Math.max(height, Math.round(sh / 2));
    const step = createCanvas(nextWidth, nextHeight);
    const stepCtx = step.getContext('2d');
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(current, sx, sy, sw, sh, 0, 0, nextWidth, nextHeight);
    current = step;
    sx = 0;
    sy = 0;
    sw = nextWidth;
    sh = nextHeight;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(current, sx, sy, sw, sh, 0, 0, width, height);
  return true;
}

const gradientCache = new WeakMap();

/**
 * Radial vignette drawn over background/photo layers so captions stay legible.
 * The gradient object is cached per context and size instead of being rebuilt
 * on every frame.
 */
export function drawGradientOverlay(ctx, width, height) {
  let bySize = gradientCache.get(ctx);
  if (!bySize) {
    bySize = new Map();
    gradientCache.set(ctx, bySize);
  }
  const key = `${width}x${height}`;
  let gradient = bySize.get(key);
  if (!gradient) {
    gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.35,
      width / 2,
      height / 2,
      width * 0.75,
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.08)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.45)');
    bySize.set(key, gradient);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Direct (uncached) cover draw. Used for video frames, which change every tick
 * and therefore cannot be baked into a layer.
 */
export function drawCover(ctx, source, width, height) {
  const size = getSourceSize(source);
  if (!size || width <= 0 || height <= 0) return;
  const { sx, sy, sw, sh } = computeCoverCrop(
    size.width,
    size.height,
    width,
    height,
  );
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
}

function findLayer(source, key) {
  for (const layer of layers) {
    if (layer.source === source && layer.key === key) {
      layer.used = ++clock;
      return layer;
    }
  }
  return null;
}

function evict() {
  while (cachedBytes > MAX_CACHE_BYTES && layers.length > 1) {
    let oldestIndex = 0;
    for (let i = 1; i < layers.length; i += 1) {
      if (layers[i].used < layers[oldestIndex].used) oldestIndex = i;
    }
    const [removed] = layers.splice(oldestIndex, 1);
    cachedBytes -= removed.bytes;
  }
}

/**
 * Returns an offscreen canvas of `width` x `height` with `source` cropped to
 * fill it (plus the vignette when `vignette` is true). Cached — calling this
 * once per frame is cheap.
 */
export function getCoverLayer(
  source,
  width,
  height,
  { vignette = false } = {},
) {
  if (!source || width <= 0 || height <= 0) return null;
  if (!getSourceSize(source)) return null;

  const key = `${width}x${height}${vignette ? '|v' : ''}`;
  const existing = findLayer(source, key);
  if (existing) return existing.canvas;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!paintCover(ctx, source, width, height)) return null;
  if (vignette) drawGradientOverlay(ctx, width, height);

  const bytes = width * height * 4;
  layers.push({ source, key, canvas, bytes, used: ++clock });
  cachedBytes += bytes;
  evict();
  return canvas;
}

/**
 * Bakes every given image up front so no frame during a recording pays the
 * scaling cost. Yields between images when `onProgress` is supplied.
 */
export async function prepareCoverLayers(
  sources,
  width,
  height,
  { vignette = false, onStep } = {},
) {
  for (const source of sources) {
    if (!source) continue;
    getCoverLayer(source, width, height, { vignette });
    if (onStep) await onStep();
  }
}

/** Drops every cached layer for a source (call when an image is removed). */
export function releaseCoverLayers(source) {
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    if (layers[i].source === source) {
      cachedBytes -= layers[i].bytes;
      layers.splice(i, 1);
    }
  }
}
