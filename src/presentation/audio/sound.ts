// Minimal synthesized SFX via the Web Audio API — a handful of short
// oscillator blips, no audio asset files. Every call here is either a direct
// result of a click (build/trade/enact/charter) or a state change caused by
// one (a new danger event, game over), so the browser's user-gesture
// requirement for audio is already satisfied by the time these run.
const MUTE_KEY = "theworldgame-muted";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Storage unavailable — the mute button still works for this session
    // via the caller's own UI state; it just won't persist.
  }
}

interface Tone {
  freq: number;
  start: number; // seconds from now
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

function playTones(tones: Tone[]): void {
  if (isMuted()) return;
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;
  for (const tone of tones) {
    const osc = audio.createOscillator();
    const gainNode = audio.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.value = tone.freq;
    const peak = tone.gain ?? 0.15;
    const startAt = now + tone.start;
    const endAt = startAt + tone.duration;
    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(peak, startAt + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);
    osc.connect(gainNode).connect(audio.destination);
    osc.start(startAt);
    osc.stop(endAt + 0.02);
  }
}

// A short, bright two-note rise — building, trading, enacting a law,
// chartering a venture.
export function playConfirm(): void {
  playTones([
    { freq: 520, start: 0, duration: 0.09, type: "triangle" },
    { freq: 720, start: 0.07, duration: 0.12, type: "triangle" },
  ]);
}

// A low, harsh pair — a danger-severity event just landed in the log.
export function playDanger(): void {
  playTones([
    { freq: 220, start: 0, duration: 0.16, type: "sawtooth", gain: 0.12 },
    { freq: 185, start: 0.1, duration: 0.22, type: "sawtooth", gain: 0.12 },
  ]);
}

// A slow descending three-note fall — the reign has ended.
export function playGameOver(): void {
  playTones([
    { freq: 330, start: 0, duration: 0.3, gain: 0.16 },
    { freq: 262, start: 0.26, duration: 0.3, gain: 0.16 },
    { freq: 196, start: 0.52, duration: 0.6, gain: 0.16 },
  ]);
}
