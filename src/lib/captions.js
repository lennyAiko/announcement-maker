import { MIN_CAPTION_DURATION } from './constants';

const SENTENCE_SPLIT_RE = /[^.!?]+[.!?]*/g;

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const groups = word.match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

export function splitIntoChunks(text) {
  const raw = text.replace(/\s+/g, ' ').trim();
  if (!raw) return [];

  const segments = raw.split(/\n{2,}/).filter(Boolean);

  const chunks = [];
  for (const segment of segments) {
    const parts = segment.match(SENTENCE_SPLIT_RE);
    if (parts) {
      for (const p of parts) {
        const trimmed = p.trim();
        if (trimmed) chunks.push(trimmed);
      }
    } else {
      const trimmed = segment.trim();
      if (trimmed) chunks.push(trimmed);
    }
  }
  return chunks;
}

export function distributeDurations(
  chunks,
  totalDuration,
  { pace = 1, gap = 0, startPad = 0, endPad = 0 } = {},
) {
  const totalGapTime = Math.max(0, (chunks.length - 1) * gap);
  const totalPad = startPad + endPad;
  const available = Math.max(0.1, totalDuration - totalGapTime - totalPad);

  const weights = chunks.map((c) => {
    const words = c.split(/\s+/);
    let syllables = 0;
    for (const w of words) {
      syllables += countSyllables(w);
    }
    return Math.max(syllables, 2);
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const raw = chunks.map((text, i) => ({
    text,
    duration: available * (weights[i] / totalWeight),
  }));

  const min = MIN_CAPTION_DURATION;
  const belowMin = raw.filter((c) => c.duration < min);
  if (belowMin.length === 0) {
    return raw.map((c) => ({ ...c, duration: c.duration * pace }));
  }

  let surplus = 0;
  let takenFrom = 0;
  for (const c of raw) {
    if (c.duration < min) {
      surplus += min - c.duration;
    } else {
      takenFrom += c.duration - min;
    }
  }

  const adjusted = raw.map((c) => {
    if (c.duration < min) return { ...c, duration: min };
    if (takenFrom <= 0) return c;
    const excess = c.duration - min;
    const reduction = (excess / takenFrom) * surplus;
    return { ...c, duration: c.duration - reduction };
  });

  return adjusted.map((c) => ({
    ...c,
    duration: c.duration * pace,
  }));
}

export function getDurationMismatch(captions, audioDuration, gap = 0, startPad = 0, endPad = 0) {
  const captionsTotal = captions.reduce((a, c) => a + c.duration, 0);
  const gapTotal = Math.max(0, (captions.length - 1) * gap);
  const total = captionsTotal + gapTotal + startPad + endPad;
  const diff = Math.abs(total - audioDuration);
  if (diff <= 1.5) return null;
  return { total, audioDuration };
}

export function formatTime(s) {
  if (!s || Number.isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function currentCaptionAt(captions, t, gap = 0, startPad = 0) {
  let acc = startPad;
  for (let i = 0; i < captions.length; i++) {
    const c = captions[i];
    if (t >= acc && t < acc + c.duration) {
      return { text: c.text, index: i, progress: (t - acc) / c.duration };
    }
    acc += c.duration + gap;
  }
  return { text: '', index: -1, progress: 0 };
}
