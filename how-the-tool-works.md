# How the Announcement Video Maker Works

This describes what happens behind each step in the tool, so anyone on the team can understand (and trust) what it's doing.

## Step 1 — Paste the announcement

You paste the cleaned-up script into a plain text box. The tool doesn't do anything to it yet — no spellcheck, no changes. It's just held in memory until you click "Generate captions" in Step 3.

## Step 2 — Add the audio

You upload the audio file exported from luvvoice. The moment it loads, the browser reads the file's total length (its duration) — this number becomes the anchor that all caption timing is based on later. No audio processing happens here; the file is just stored and its duration measured.

## Step 3 — Generate & fine-tune captions

This is the core logic, and it's an **estimate**, not real speech recognition. It works in two steps:

1. **Splitting into lines** — the script is broken into separate caption lines wherever a sentence ends (`.`, `!`, or `?`).
2. **Assigning time to each line** — each line gets a slice of the total audio duration proportional to how many characters it has. A line with twice the characters of another gets roughly twice the screen time:

   ```
   line's time = total audio length × (line's character count ÷ total characters in script)
   ```

This assumes the narrator speaks at a fairly steady pace, which is usually true for a read-aloud announcement. It will drift on:
- Short lines followed by a pause (e.g. "Amen." before a beat of silence)
- Numbers, dates, or names that are read more slowly than their letter count suggests

That's why every caption line has an editable "seconds" field — after generating, you play the preview and nudge any line that feels out of sync. There's also a "Distribute evenly" button, which throws out the character-based estimate and just divides the audio equally across all lines (useful if the proportional guess is off in a specific way, like consistently even pacing).

## Step 4 — Style the background

Purely visual settings, applied live to the preview:
- **Background type** — solid color, a still image, or a looping video. Image and video are scaled to fill the frame (cropping edges as needed, not stretching).
- **Background video looping** — if the clip is shorter than the narration, it loops automatically; if longer, it's simply cut off at the end. Its own audio is muted — only the luvvoice narration is used in the final export.
- **Text color / font size** — straightforward styling of the caption text.

## Step 5 — Preview & export

**Preview:** as the audio plays, the tool checks the current playback time against the list of caption lines and their durations, and draws whichever line's time range includes that moment onto the canvas — along with the background. This is just a lookup, recalculated continuously as the audio plays or as you drag the scrubber.

**Export:** this is where the video file is actually built.
- The canvas (background + whatever caption is showing) is captured as a live video stream, frame by frame.
- The narration audio is captured as a separate audio stream.
- Both streams are combined and recorded together in real time, using the browser's built-in recording capability (`MediaRecorder`).
- When the narration ends, recording stops automatically, and the result is packaged into a downloadable `.webm` video file.

In effect, export is like "playing" the announcement once, start to finish, while capturing exactly what's on screen and what's being said — then handing you the recording.

## What this tool is *not* doing

Worth being explicit about, since it affects trust in the output:
- It does not listen to the audio to figure out timing — timing is a character-count estimate only.
- It does not correct spelling or grammar — that's still a human step before pasting the script in.
- It does not use any external service or API — everything runs locally in the browser, so nothing is uploaded anywhere.
