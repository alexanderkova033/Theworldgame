// The game's sounds, synthesized with the Web Audio API (no audio files),
// and voiced for an eighteenth-century government: a harpsichord for the
// ordinary confirmations, coins on a counting-house table for money, a
// gavel in the chamber for laws, a quill on paper for research, a wax seal
// for decisions and letters, a carpenter's hammer for building, a drum for
// a crackdown, and the parish bell for bad news.
//
// Everything is played into one small "room": a soft compressor and a short
// stone-hall reverb, so the sounds sit together instead of beeping at you.
// Every call here is either a direct result of a click or a state change
// caused by one, so the browser's user-gesture rule for audio is already
// met by the time these run.
const MUTE_KEY = "theworldgame-muted";

interface Engine {
  ctx: AudioContext;
  out: AudioNode; // dry input of the room
  noise: AudioBuffer; // two seconds of white noise, shared by every noisy sound
}

let engine: Engine | null = null;

// A short hall: decaying stereo noise, darker as it fades.
function makeRoom(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Lowpass the noise more and more as the tail goes on.
      const k = 0.35 + t * 0.6;
      smooth = smooth * k + (Math.random() * 2 - 1) * (1 - k);
      data[i] = smooth * Math.pow(1 - t, 3.2) * 2.2;
    }
  }
  return impulse;
}

function getEngine(): Engine | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!engine) {
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.8;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;
    const dry = ctx.createGain();
    const room = ctx.createConvolver();
    room.buffer = makeRoom(ctx, 1.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    dry.connect(master);
    dry.connect(room).connect(wet).connect(master);
    master.connect(compressor).connect(ctx.destination);

    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    engine = { ctx, out: dry, noise };
  }
  if (engine.ctx.state === "suspended") void engine.ctx.resume();
  return engine;
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
    // Storage unavailable: the mute button still works for this session
    // via the caller's own UI state; it just won't persist.
  }
}

// Runs a sound only when it can and should be heard. `t0` is "now" on the
// audio clock.
function play(sound: (e: Engine, t0: number) => void): void {
  if (isMuted()) return;
  const e = getEngine();
  if (!e) return;
  sound(e, e.ctx.currentTime + 0.01);
}

// --- Building blocks --------------------------------------------------------

// A gain envelope: silent, a quick rise to `peak`, then an exponential fade.
function envelope(e: Engine, t: number, peak: number, attack: number, decay: number): GainNode {
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

function tone(e: Engine, t: number, freq: number, peak: number, decay: number, opts: { type?: OscillatorType; attack?: number; glideFrom?: number; glideTime?: number } = {}): void {
  const osc = e.ctx.createOscillator();
  osc.type = opts.type ?? "sine";
  if (opts.glideFrom) {
    osc.frequency.setValueAtTime(opts.glideFrom, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + (opts.glideTime ?? 0.03));
  } else {
    osc.frequency.setValueAtTime(freq, t);
  }
  const attack = opts.attack ?? 0.004;
  osc.connect(envelope(e, t, peak, attack, decay)).connect(e.out);
  osc.start(t);
  osc.stop(t + attack + decay + 0.05);
}

// Filtered noise: the scratch of a quill, the rustle of paper, the snap of
// a drumhead, the chink of a coin.
function noise(e: Engine, t: number, peak: number, attack: number, decay: number, filter: { type: BiquadFilterType; freq: number; q?: number; sweepTo?: number }): void {
  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  const f = e.ctx.createBiquadFilter();
  f.type = filter.type;
  f.frequency.setValueAtTime(filter.freq, t);
  if (filter.sweepTo) f.frequency.exponentialRampToValueAtTime(filter.sweepTo, t + attack + decay);
  f.Q.value = filter.q ?? 1;
  src.connect(f).connect(envelope(e, t, peak, attack, decay)).connect(e.out);
  const offset = Math.random() * 1.5;
  src.start(t, offset);
  src.stop(t + attack + decay + 0.05);
}

// A harpsichord string: Karplus-Strong plucked-string synthesis, two
// strings a few cents apart (as a harpsichord's two 8-foot choirs are), with
// the bright quill-pluck the instrument is known for. Cached per pitch.
const stringCache = new Map<string, AudioBuffer>();

function harpsichordString(e: Engine, freq: number): AudioBuffer {
  const key = `${Math.round(freq * 10)}`;
  const cached = stringCache.get(key);
  if (cached) return cached;
  const rate = e.ctx.sampleRate;
  const seconds = 1.8;
  const buffer = e.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
  const out = buffer.getChannelData(0);
  for (const detune of [1, 1.0025]) {
    const period = Math.max(2, Math.round(rate / (freq * detune)));
    const line = new Float32Array(out.length);
    // The quill plucks near the end of the string: a bright, thin burst.
    for (let i = 0; i < period; i++) line[i] = (Math.random() * 2 - 1) * (1 - 0.5 * Math.sin((Math.PI * i) / period));
    // Brighter (less averaging) and longer-lived in the bass.
    const blend = 0.32;
    const loss = freq < 300 ? 0.9985 : freq < 600 ? 0.997 : 0.994;
    for (let i = period + 1; i < line.length; i++) line[i] = loss * ((1 - blend) * line[i - period] + blend * line[i - period - 1]);
    for (let i = 0; i < out.length; i++) out[i] += line[i] * 0.5;
  }
  // Take out any offset left from the burst.
  let mean = 0;
  for (let i = 0; i < out.length; i++) mean += out[i];
  mean /= out.length;
  for (let i = 0; i < out.length; i++) out[i] -= mean;
  stringCache.set(key, buffer);
  return buffer;
}

function pluck(e: Engine, t: number, freq: number, peak = 0.32, length = 1.4): void {
  const src = e.ctx.createBufferSource();
  src.buffer = harpsichordString(e, freq);
  // A soundboard: soften the very top, lift the body a little.
  const body = e.ctx.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.value = 5200;
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.setValueAtTime(peak, t + length * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(body).connect(g).connect(e.out);
  src.start(t);
  src.stop(t + length + 0.05);
  // The click of the jack as the quill catches the string.
  noise(e, t, peak * 0.25, 0.001, 0.012, { type: "highpass", freq: 3000 });
}

// A struck bell, from its inharmonic partials: hum, prime, minor third
// (the tierce that makes a church bell sound mournful), fifth, nominal and
// above, each fading at its own pace, with a little beating between them.
function bell(e: Engine, t: number, freq: number, peak: number, length: number): void {
  const partials: Array<[ratio: number, level: number, life: number]> = [
    [0.5, 0.55, 1],
    [1, 0.7, 0.8],
    [1.19, 0.45, 0.55],
    [1.5, 0.3, 0.45],
    [2, 0.4, 0.35],
    [2.51, 0.18, 0.25],
    [3.01, 0.12, 0.18],
    [4.07, 0.07, 0.12],
  ];
  for (const [ratio, level, life] of partials) {
    for (const beat of [1, 1.0018]) tone(e, t, freq * ratio * beat, peak * level * 0.5, length * life, { attack: 0.002 });
  }
  // The clapper's strike.
  noise(e, t, peak * 0.4, 0.001, 0.04, { type: "bandpass", freq: freq * 4, q: 2 });
}

// One coin landing on a counting-house table: a few metallic partials
// that die away fast, the higher ones faster.
function coin(e: Engine, t: number, peak: number): void {
  const base = 2600 + Math.random() * 1400;
  const partials: Array<[ratio: number, level: number, life: number]> = [
    [1, 1, 0.22],
    [2.76, 0.5, 0.12],
    [5.4, 0.3, 0.06],
  ];
  for (const [ratio, level, life] of partials) tone(e, t, base * ratio, peak * level, life * (0.7 + Math.random() * 0.6), { attack: 0.001 });
  noise(e, t, peak * 0.5, 0.001, 0.015, { type: "highpass", freq: 6000 });
}

// Wood struck with something hard: a mallet, a gavel, a hammer on a beam.
function knock(e: Engine, t: number, freq: number, peak: number): void {
  tone(e, t, freq, peak, 0.11, { glideFrom: freq * 1.7, glideTime: 0.025, attack: 0.001 });
  tone(e, t, freq * 2.3, peak * 0.35, 0.05, { attack: 0.001 });
  noise(e, t, peak * 0.7, 0.001, 0.035, { type: "bandpass", freq: freq * 5, q: 1.4 });
}

// A quill pen on paper: short scratches of high, narrow noise.
function scratch(e: Engine, t: number, strokes: number, peak: number): void {
  let at = t;
  for (let i = 0; i < strokes; i++) {
    const length = 0.05 + Math.random() * 0.07;
    const from = 2800 + Math.random() * 1600;
    noise(e, at, peak * (0.7 + Math.random() * 0.3), 0.012, length, { type: "bandpass", freq: from, q: 3, sweepTo: from * (Math.random() < 0.5 ? 1.4 : 0.75) });
    at += length + 0.02 + Math.random() * 0.04;
  }
}

// A sheet of paper turned or folded.
function rustle(e: Engine, t: number, peak: number): void {
  noise(e, t, peak, 0.04, 0.22, { type: "highpass", freq: 1500, q: 0.7 });
  noise(e, t + 0.06, peak * 0.6, 0.02, 0.12, { type: "bandpass", freq: 4200, q: 0.8 });
}

// Warm wax pressed under a seal: a soft, low thud.
function seal(e: Engine, t: number, peak: number): void {
  tone(e, t, 70, peak, 0.16, { glideFrom: 140, glideTime: 0.05, attack: 0.003 });
  noise(e, t, peak * 0.45, 0.003, 0.06, { type: "lowpass", freq: 700 });
}

// One stroke on a military side drum.
function drumStroke(e: Engine, t: number, peak: number): void {
  noise(e, t, peak, 0.001, 0.14, { type: "bandpass", freq: 1900, q: 0.9 });
  tone(e, t, 175, peak * 0.6, 0.09, { glideFrom: 240, glideTime: 0.02, attack: 0.001 });
}

// Note names to frequencies, for the harpsichord parts.
const NOTE: Record<string, number> = {
  D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
};

// --- What the game plays ----------------------------------------------------

// The everyday "done": a rising fifth on the harpsichord, the second note
// with a third beneath it.
export function playConfirm(): void {
  play((e, t) => {
    pluck(e, t, NOTE.G4, 0.4, 1.1);
    pluck(e, t + 0.085, NOTE.D5, 0.36, 1.3);
    pluck(e, t + 0.085, NOTE.B4, 0.2, 1.2);
  });
}

// Money changes hands: a small handful of coins counted onto the table.
export function playCoins(): void {
  play((e, t) => {
    const count = 4 + Math.floor(Math.random() * 3);
    let at = t;
    for (let i = 0; i < count; i++) {
      coin(e, at, 0.115 * (1 - i * 0.08));
      at += 0.035 + Math.random() * 0.06;
    }
  });
}

// Work starts on a building: two hammer blows on a beam, and the money
// paid out.
export function playBuild(): void {
  play((e, t) => {
    knock(e, t, 420, 0.32);
    knock(e, t + 0.16, 400, 0.3);
    coin(e, t + 0.3, 0.06);
    coin(e, t + 0.36, 0.05);
  });
}

// A repair: quicker, lighter hammering.
export function playRepair(): void {
  play((e, t) => {
    knock(e, t, 560, 0.24);
    knock(e, t + 0.11, 540, 0.22);
    knock(e, t + 0.22, 580, 0.26);
  });
}

// A law put to the chamber: two raps of the Speaker's gavel.
export function playGavel(): void {
  play((e, t) => {
    knock(e, t, 190, 0.42);
    knock(e, t + 0.22, 180, 0.46);
  });
}

// A decision taken, or a letter sent abroad: the page folded, the wax
// sealed.
export function playSeal(): void {
  play((e, t) => {
    rustle(e, t, 0.07);
    seal(e, t + 0.2, 0.4);
  });
}

// A direction for research: a few strokes of the quill.
export function playQuill(): void {
  play((e, t) => scratch(e, t, 4, 0.32));
}

// A rally: a bright rising arpeggio, as if the band struck up.
export function playRally(): void {
  play((e, t) => {
    [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5].forEach((freq, i) => pluck(e, t + i * 0.075, freq, 0.32, 1.2));
    pluck(e, t + 0.3, NOTE.E5, 0.28, 1.4);
  });
}

// A crackdown: a drum ruff, three quick strokes and a hard one.
export function playDrum(): void {
  play((e, t) => {
    drumStroke(e, t, 0.18);
    drumStroke(e, t + 0.06, 0.2);
    drumStroke(e, t + 0.12, 0.22);
    drumStroke(e, t + 0.24, 0.4);
  });
}

// A venture chartered: the ship's bell, struck twice as at sea.
export function playShipBell(): void {
  play((e, t) => {
    bell(e, t, 880, 0.13, 1.6);
    bell(e, t + 0.32, 880, 0.12, 1.8);
  });
}

// A letter arrives needing your decision: paper, and a small hand bell.
export function playLetter(): void {
  play((e, t) => {
    rustle(e, t, 0.06);
    bell(e, t + 0.12, 1320, 0.09, 1.2);
  });
}

// A breakthrough: bells climbing a bright arpeggio, held at the top, the
// sound of something rare turning up.
export function playBreakthrough(): void {
  play((e, t) => {
    [NOTE.C5, NOTE.E5, NOTE.G5, 1046.5].forEach((freq, i) => bell(e, t + i * 0.11, freq, 0.11, 1.8));
    bell(e, t + 0.5, 1318.5, 0.08, 2.4);
    [NOTE.C4, NOTE.G4, NOTE.E5].forEach((freq) => pluck(e, t + 0.44, freq, 0.18, 1.8));
  });
}

// Bad news: the parish bell tolls, low and twice.
export function playDanger(): void {
  play((e, t) => {
    bell(e, t, 196, 0.22, 3);
    bell(e, t + 1.1, 196, 0.18, 3);
  });
}

// The reign ends. In victory, a peal: eight bells rung down the scale
// twice, as change-ringers ring "rounds", with a harpsichord chord beneath.
// In defeat, one deep toll and a falling minor line.
export function playGameOver(victory = false): void {
  play((e, t) => {
    if (victory) {
      const rounds = [1046.5, 987.77, 880, 783.99, 698.46, 659.25, 587.33, 523.25];
      for (let round = 0; round < 2; round++) rounds.forEach((freq, i) => bell(e, t + (round * 8 + i) * 0.2, freq, 0.13, 1.6));
      [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5].forEach((freq) => pluck(e, t + 3.3, freq, 0.2, 1.8));
      return;
    }
    bell(e, t, 147, 0.24, 4);
    [NOTE.A3, NOTE.F3, NOTE.E3, NOTE.D3].forEach((freq, i) => pluck(e, t + 0.6 + i * 0.42, freq, 0.26, 1.7));
  });
}
