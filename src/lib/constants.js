export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const CANVAS_WIDTH_1080 = 1920;
export const CANVAS_HEIGHT_1080 = 1080;

export const RESOLUTION_OPTIONS = [
  { value: '720p', label: '720p', width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  { value: '1080p', label: '1080p', width: CANVAS_WIDTH_1080, height: CANVAS_HEIGHT_1080 },
];

export const FONT_FAMILY_OPTIONS = [
  { value: 'sans-serif', label: 'Sans-serif' },
  { value: 'serif', label: 'Serif (Georgia)' },
  { value: 'rounded', label: 'Rounded' },
];

export const FONT_FAMILY_STACKS = {
  'sans-serif': '-apple-system, Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Nunito", "Segoe UI", system-ui, sans-serif',
};

export const FONT_SIZE_OPTIONS = [
  { value: 28, label: 'Small' },
  { value: 34, label: 'Medium' },
  { value: 42, label: 'Large' },
];

export const TEXT_POSITION_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'top', label: 'Top' },
];

export const PACE_OPTIONS = [
  { value: 0.7, label: 'Fast (0.7×)' },
  { value: 0.85, label: 'Slightly fast (0.85×)' },
  { value: 1.0, label: 'Normal' },
  { value: 1.2, label: 'Slightly slow (1.2×)' },
  { value: 1.5, label: 'Slow (1.5×)' },
];

export const DEFAULT_FONT_SIZE = 34;
export const DEFAULT_FONT_FAMILY = 'sans-serif';
export const DEFAULT_TEXT_POSITION = 'center';
export const DEFAULT_BG_COLOR = '#14213d';
export const DEFAULT_TEXT_COLOR = '#ffffff';
export const DEFAULT_RESOLUTION = '720p';
export const DEFAULT_PACE = 1.0;
export const MIN_CAPTION_DURATION = 1.5;
export const DEFAULT_CAPTION_GAP = 0.25;
export const FADE_DURATION = 0.2;

export const EXPORT_MIME_CANDIDATES = ['video/webm;codecs=vp9,opus', 'video/webm'];

export const EXPORT_FPS = { '720p': 30, '1080p': 30 };
