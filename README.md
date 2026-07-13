# Announcement Video Maker

A browser-based tool that turns a script + narration audio into a captioned video. Built for church announcements — paste the cleaned-up script, drop in the luvvoice audio, and get a `.webm` video ready to share. Everything runs locally in the browser; nothing is uploaded anywhere.

## Features

- **Automatic caption generation** — splits text by sentence boundaries (or blank lines) and times captions using syllable-based distribution
- **Tap-to-time** — play the audio and tap at each caption boundary for perfectly accurate timing
- **Audio waveform** — visual waveform with caption boundary markers to help align timing
- **Editable durations** — fine-tune any caption's display time, reorder or delete lines
- **Customizable styling** — background color, image, or looping video; text color, size, position, and font family
- **Speaking pace control** — adjust from 0.7× (fast) to 1.5× (slow) to match your narrator
- **1080p support** — toggle between 720p and 1080p output
- **Live preview** — canvas preview with play/pause/scrub controls, spacebar shortcut
- **WebM export** — exports as a combined video+audio file via MediaRecorder (VP9/Opus)
- **Session persistence** — work is saved to localStorage and restored on page reload

## Quick start

```bash
npm install
npm run dev
```

The app opens at [http://localhost:3000](http://localhost:3000).

## Workflow

1. **Paste the announcement** — paste the cleaned-up script text. Insert blank lines to force caption breaks.
2. **Add the audio** — upload the narration audio file (MP3 or WAV, exported from luvvoice).
3. **Generate captions** — click "Generate captions" for automatic timing, or "Tap along" to mark timestamps live while listening. Fine-tune durations, reorder, or delete lines as needed.
4. **Style the background** — choose solid color, image, or video loop. Adjust text appearance, resolution, and speaking pace.
5. **Preview & export** — preview the video in the canvas, then click "Export video" to record and download.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## Tech stack

- **React 19** with React Compiler
- **Rsbuild** (Rspack-based bundler)
- **Tailwind CSS v4**
- Canvas API, Web Audio API, MediaRecorder API
- No backend, no external APIs — everything runs client-side

## Browser support

Requires a modern browser with support for Canvas, Web Audio, and MediaRecorder APIs. Chrome and Edge are recommended for the most reliable export. Firefox and Safari work but may use a fallback codec for WebM.

## License

MIT
