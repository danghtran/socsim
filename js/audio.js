import { S } from "./state.js";

let audioCtx = null;

export function ensureAudio() {
  try {
    audioCtx = audioCtx || new AudioContext();
  } catch (_) { /* ignore */ }
}

export function tone(freq, dur = 0.08, type = "square", gain = 0.04) {
  if (S.muted) return;
  try {
    ensureAudio();
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch (_) { /* ignore */ }
}
