export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const CANVAS_WIDTH_1080 = 1920;
export const CANVAS_HEIGHT_1080 = 1080;

export const RESOLUTION_OPTIONS = [
  { value: '720p', label: '720p', width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  {
    value: '1080p',
    label: '1080p',
    width: CANVAS_WIDTH_1080,
    height: CANVAS_HEIGHT_1080,
  },
];

export const FONT_FAMILY_OPTIONS = [
  { value: 'sans-serif', label: 'Sans-serif' },
  { value: 'serif', label: 'Serif (Georgia)' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'condensed', label: 'Condensed (Impact)' },
  { value: 'mono', label: 'Typewriter' },
  { value: 'display', label: 'Bold display' },
];

export const FONT_FAMILY_STACKS = {
  'sans-serif': '-apple-system, Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded:
    'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", "Segoe UI", system-ui, sans-serif',
  condensed:
    'Impact, Haettenschweiler, "Arial Narrow Bold", "Arial Narrow", "Helvetica Neue Condensed", sans-serif',
  mono: '"Courier New", Courier, "Lucida Console", monospace',
  display:
    '"Arial Black", "Segoe UI Black", "Arial Bold", Gadget, "Helvetica Neue", sans-serif',
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

export const EXPORT_FORMAT_CANDIDATES = [
  {
    id: 'mp4',
    label: 'MP4',
    extension: 'mp4',
    mimeTypes: ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'],
  },
  {
    id: 'webm',
    label: 'WebM',
    extension: 'webm',
    // VP8 is listed first on purpose: VP9 encoding at 1080p cannot always keep
    // up with realtime recording, and dropped frames show up as frozen spots
    // in the exported file.
    mimeTypes: [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
    ],
  },
  {
    id: 'ogg',
    label: 'Ogg video',
    extension: 'ogv',
    mimeTypes: ['video/ogg;codecs=theora,vorbis', 'video/ogg'],
  },
];

export const EXPORT_FPS = { '720p': 30, '1080p': 30 };

// MediaRecorder's default bitrate is low for full-frame photos and captions;
// these keep text edges and photo detail crisp.
export const EXPORT_BITRATE = { '720p': 6_000_000, '1080p': 12_000_000 };
