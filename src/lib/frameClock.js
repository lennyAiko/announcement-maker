/**
 * Frame clock for the export.
 *
 * Frames have to be pushed at a steady rate for the whole recording. Browsers
 * stop calling requestAnimationFrame when the page is not being painted (tab in
 * the background, window hidden, window occluded, laptop lid closed...), and
 * throttle timers down to about once a second. When that happens the recorder
 * receives almost no frames while the audio keeps running, which is exactly the
 * "exported video freezes for a few seconds" symptom.
 *
 * The audio clock keeps running regardless, because the recording itself pulls
 * audio through the graph. So we put a tiny AudioWorklet in the graph that
 * posts a tick every 1/fps worth of samples. Ticks keep arriving while the page
 * is not painted, and they are tied to the same clock as the recorded audio.
 */

const PROCESSOR_SOURCE = `
class FrameClockProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const settings = (options && options.processorOptions) || {};
    const fps = Math.max(1, settings.fps || 30);
    // Ticks are emitted in whole 128-sample blocks.
    this.interval = Math.max(128, Math.round(sampleRate / fps));
    this.accumulated = 0;
  }

  process() {
    this.accumulated += 128;
    while (this.accumulated >= this.interval) {
      this.accumulated -= this.interval;
      this.port.postMessage(1);
    }
    return true;
  }
}

registerProcessor('frame-clock', FrameClockProcessor);
`;

let moduleUrl = null;

/**
 * Returns a clock with start(onTick)/stop(), or null when AudioWorklet is not
 * usable and the caller should fall back to requestAnimationFrame/timers.
 */
export async function createAudioFrameClock(audioCtx, fps) {
  if (!audioCtx?.audioWorklet || typeof AudioWorkletNode !== 'function') {
    return null;
  }

  let node = null;
  let sink = null;
  try {
    if (!moduleUrl) {
      moduleUrl = URL.createObjectURL(
        new Blob([PROCESSOR_SOURCE], { type: 'text/javascript' }),
      );
    }
    await audioCtx.audioWorklet.addModule(moduleUrl);
    node = new AudioWorkletNode(audioCtx, 'frame-clock', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { fps },
    });
    // A node that is not connected to the destination is never pulled by the
    // audio graph, so route it through a silent gain.
    sink = audioCtx.createGain();
    sink.gain.value = 0;
    node.connect(sink);
    sink.connect(audioCtx.destination);
  } catch {
    try {
      node?.disconnect();
      sink?.disconnect();
    } catch {
      /* nothing to undo */
    }
    return null;
  }

  return {
    start(onTick) {
      node.port.onmessage = () => onTick();
    },
    stop() {
      node.port.onmessage = null;
      try {
        node.disconnect();
        sink.disconnect();
      } catch {
        /* already disconnected */
      }
    },
  };
}
