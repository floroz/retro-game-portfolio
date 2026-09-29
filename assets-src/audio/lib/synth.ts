/**
 * Building blocks shared by the sound-effect and ambience recipes in
 * `assets-src/audio/sfx/` and `assets-src/audio/ambience/` (A2). They sit on
 * top of the primitives in scripts/assets/sfx.ts. This folder holds no
 * recipes, so `npm run assets:sfx` never tries to render it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AUDIO_REVIEW_DIR,
  CHANNELS,
  SAMPLE_RATE,
  buildMidi,
  ensureSoundfont,
  loopTiming,
  renderMidi,
  type MusicTrack,
  type Note,
} from "../../../scripts/assets/music";
import {
  biquad,
  circular,
  decay,
  envelope,
  mix,
  mul,
  noise,
  pan,
  reverb,
  tone,
  type BiquadOptions,
  type NoiseColour,
  type SynthContext,
  type Waveform,
} from "../../../scripts/assets/sfx";

/** Seconds to frames. */
export const sec = (s: number) => Math.round(s * SAMPLE_RATE);

/** A random number in [lo, hi). */
export const between = (random: () => number, lo: number, hi: number) =>
  lo + (hi - lo) * random();

/** Run a buffer through a chain of biquads. */
export function filters(x: Float32Array, chain: BiquadOptions[]) {
  return chain.reduce((acc, o) => biquad(acc, o), x);
}

/** Add `b` into `a` sample by sample (same length or shorter), scaled. In place. */
export function addInto(a: Float32Array, b: Float32Array, level = 1) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) a[i] += b[i] * level;
  return a;
}

/** Peak-normalise a buffer to `peak` (linear). Returns a new buffer. */
export function normalise(x: Float32Array, peak = 1) {
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  return max > 0 ? x.map((v) => (v * peak) / max) : x.slice();
}

// --- Loops ----------------------------------------------------------------------------

/**
 * Make an exactly periodic layer (length `ctx.loopFrames`, for example events
 * placed with `mix(..., { wrap: true })`) survive the renderer's equal-power
 * crossfade unchanged. The crossfade adds frame `loop + i` into frame `i`
 * with weights sin and cos; pre-weighting both copies by the same curve makes
 * them sum back to the original (sin² + cos² = 1), with no +3 dB bump.
 */
export function periodic(p: Float32Array, ctx: SynthContext): Float32Array {
  const L = ctx.loopFrames;
  const x = ctx.crossfadeFrames;
  if (p.length !== L) throw new Error("a periodic layer is one loop long");
  const out = new Float32Array(L + x);
  out.set(p, 0);
  for (let i = 0; i < x; i++) {
    const t = (i + 0.5) / x;
    out[i] = p[i] * Math.sin((t * Math.PI) / 2);
    out[L + i] = p[i] * Math.cos((t * Math.PI) / 2);
  }
  return out;
}

/** Repeat a one-loop envelope over `frames` frames (for beds longer than the loop). */
export function tileTo(p: Float32Array, frames: number): Float32Array {
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) out[i] = p[i % p.length];
  return out;
}

/**
 * A slow random swell between `lo` and `hi`, with a new target every
 * `minGap`–`maxGap` seconds and smooth (cosine) moves between them.
 */
export function drift(
  frames: number,
  random: () => number,
  { lo = 0.7, hi = 1, minGap = 2, maxGap = 5 } = {},
): Float32Array {
  const out = new Float32Array(frames);
  let i = 0;
  let from = between(random, lo, hi);
  while (i < frames) {
    const to = between(random, lo, hi);
    const n = sec(between(random, minGap, maxGap));
    for (let k = 0; k < n && i < frames; k++, i++) {
      const t = (1 - Math.cos((Math.PI * k) / n)) / 2;
      out[i] = from + (to - from) * t;
    }
    from = to;
  }
  return out;
}

// --- Sources --------------------------------------------------------------------------

/** A decaying sine: `halfLife` seconds per halving, `seconds` long. */
export function ping(freq: number, halfLife: number, seconds: number) {
  const n = sec(seconds);
  return mul(tone(n, freq), decay(n, halfLife));
}

/** A struck object: inharmonic partials `[ratio, level, halfLife]` over `base` Hz. */
export function strike(
  base: number,
  partials: [number, number, number][],
  seconds: number,
): Float32Array {
  const out = new Float32Array(sec(seconds));
  for (const [ratio, level, half] of partials)
    mix(out, ping(base * ratio, half, seconds), 0, { level });
  return out;
}

/** A filtered noise burst with an attack and an exponential decay. */
export function burst(
  random: () => number,
  {
    seconds,
    attack = 0.001,
    halfLife,
    colour = "white",
    chain = [],
  }: {
    seconds: number;
    attack?: number;
    halfLife: number;
    colour?: NoiseColour;
    chain?: BiquadOptions[];
  },
): Float32Array {
  const n = sec(seconds);
  const env = mul(
    envelope(n, [
      [0, 0],
      [attack, 1],
    ]),
    decay(n, halfLife),
  );
  return mul(filters(noise(n, random, colour), chain), env);
}

/** An oscillator with a pitch contour through `[seconds, Hz]` points. */
export function glide(
  seconds: number,
  points: [number, number][],
  shape: Waveform = "sine",
) {
  const n = sec(seconds);
  const contour = envelope(n, points);
  return tone(n, (t) => contour[Math.min(n - 1, sec(t))], shape);
}

// --- Crowds ---------------------------------------------------------------------------

/**
 * Pub or terminal murmur: `voices` people talking at once, none of them
 * intelligible. Each voice is a buzzing glottal source (a sawtooth at a
 * speaking pitch) plus breath, through two formant filters that jump to new
 * vowels on each syllable, with pauses between phrases. The sum is darkened
 * by `lowpass` for distance and returned as a stereo pair.
 */
export function babble(
  frames: number,
  random: () => number,
  {
    voices = 10,
    lowpass = 2500,
    spread = 0.8,
    pause = 0.18,
  }: {
    voices?: number;
    lowpass?: number;
    spread?: number;
    pause?: number;
  } = {},
): [Float32Array, Float32Array] {
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  for (let v = 0; v < voices; v++) {
    const voice = new Float32Array(frames);
    const pitch = between(random, 95, 235);
    const loudness = between(random, 0.4, 1);
    let i = sec(between(random, 0, 1.5));
    while (i < frames) {
      if (random() < pause) {
        i += sec(between(random, 0.3, 1.6));
        continue;
      }
      const seconds = between(random, 0.09, 0.3);
      const n = sec(seconds);
      const f0 = pitch * between(random, 0.85, 1.18);
      const f1 = between(random, 300, 850);
      const f2 = between(random, 900, 2300);
      const src = tone(
        n,
        (t) => f0 * (1 + 0.08 * Math.sin((Math.PI * t) / seconds)),
        "saw",
      );
      mix(src, noise(n, random, "pink"), 0, { level: 0.25 });
      const formed = biquad(src, { type: "bandpass", freq: f1, q: 3 });
      mix(formed, biquad(src, { type: "bandpass", freq: f2, q: 5 }), 0, {
        level: 0.5,
      });
      const env = envelope(n, [
        [0, 0],
        [0.03, 1],
        [seconds * 0.6, 0.8],
        [seconds, 0],
      ]);
      mix(voice, mul(formed, env), i, { level: loudness });
      i += n + sec(between(random, 0, 0.06));
    }
    const [l, r] = pan(
      biquad(voice, { type: "lowpass", freq: lowpass }),
      between(random, -spread, spread),
    );
    addInto(left, l);
    addInto(right, r);
  }
  return [left, right];
}

// --- Stereo helpers -------------------------------------------------------------------

/** Two decorrelated noise channels through the same filter chain. */
export function stereoNoise(
  frames: number,
  random: () => number,
  colour: NoiseColour,
  chain: BiquadOptions[],
): [Float32Array, Float32Array] {
  return [
    filters(noise(frames, random, colour), chain),
    filters(noise(frames, random, colour), chain),
  ];
}

/**
 * Place mono events into a periodic stereo layer one loop long: each event
 * at `at` seconds, panned, with the loop wrapping, then a shared reverb run
 * circularly so its tail wraps too.
 */
export function eventLayer(
  loopFrames: number,
  events: { sound: Float32Array; at: number; pan: number; level?: number }[],
  room?: { size: number; damp: number; wet: number },
): [Float32Array, Float32Array] {
  const l = new Float32Array(loopFrames);
  const r = new Float32Array(loopFrames);
  for (const e of events) {
    const [el, er] = pan(e.sound, e.pan);
    mix(l, el, sec(e.at), { level: e.level ?? 1, wrap: true });
    mix(r, er, sec(e.at), { level: e.level ?? 1, wrap: true });
  }
  if (!room) return [l, r];
  return [
    circular(l, (x) => reverb(x, room)),
    circular(r, (x) => reverb(x, { ...room, size: room.size * 0.97 })),
  ];
}

// --- General MIDI one-shots -----------------------------------------------------------

/**
 * Render a short phrase on one General MIDI instrument through the same
 * FluidSynth and soundfont as the music (scripts/assets/music.ts), and return
 * it as mono. Used where an effect must match the score exactly, such as the
 * boarding chime's tubular bells.
 */
export async function renderGm({
  id,
  program,
  notes,
  bpm,
  beats,
  reverbSend = 60,
}: {
  id: string;
  program: number;
  notes: Note[];
  bpm: number;
  beats: number;
  reverbSend?: number;
}): Promise<Float32Array> {
  const track: MusicTrack = {
    id,
    task: "A2",
    title: id,
    bpm,
    bars: beats / 4,
    key: "",
    loop: false,
    parts: [
      {
        name: id,
        channel: 1,
        program,
        volume: 110,
        reverb: reverbSend,
        notes,
      },
    ],
  };
  const timing = loopTiming(track);
  const work = join(AUDIO_REVIEW_DIR, "sfx-gm");
  mkdirSync(work, { recursive: true });
  const midi = join(work, `${id}.mid`);
  writeFileSync(midi, buildMidi(track, { leadInBeats: 1, tailBeats: 16 }));
  const stereo = renderMidi(
    midi,
    await ensureSoundfont(),
    join(work, `${id}.raw`),
  );
  const frames = stereo.length / CHANNELS - timing.beatFrames;
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    const at = (i + timing.beatFrames) * CHANNELS;
    mono[i] = (stereo[at] + stereo[at + 1]) / 2;
  }
  return mono;
}

/** Trim trailing near-silence (below `thresholdDb` of the peak) and fade the end. */
export function trimTail(x: Float32Array, thresholdDb = -60, fade = 0.05) {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const t = peak * 10 ** (thresholdDb / 20);
  let end = x.length;
  while (end > 1 && Math.abs(x[end - 1]) < t) end--;
  const out = x.slice(0, end);
  const n = Math.min(sec(fade), end);
  for (let i = 0; i < n; i++) out[end - 1 - i] *= i / n;
  return out;
}

/** Fit a buffer to exactly `frames` frames (pad with silence or cut). */
export function fit(x: Float32Array, frames: number) {
  const out = new Float32Array(frames);
  out.set(x.subarray(0, frames));
  return out;
}

// --- Mixing layers --------------------------------------------------------------------

export interface Layer {
  name: string;
  /** Left and right, or one buffer for both. */
  channels: [Float32Array, Float32Array] | Float32Array;
  level: number;
}

const rmsDb = (x: Float32Array) => {
  let s = 0;
  for (const v of x) s += v * v;
  return 10 * Math.log10(s / Math.max(1, x.length) + 1e-30);
};

/**
 * Sum stereo layers, each at its level, into `frames`-long channels. With
 * `RGP_AUDIO_LAYERS=1` in the environment it prints each layer's RMS against
 * the mix, which is how the balances in these recipes were set.
 */
export function mixLayers(
  frames: number,
  layers: Layer[],
): [Float32Array, Float32Array] {
  const out: [Float32Array, Float32Array] = [
    new Float32Array(frames),
    new Float32Array(frames),
  ];
  const parts: [string, Float32Array][] = [];
  for (const layer of layers) {
    const [l, r] =
      layer.channels instanceof Float32Array
        ? [layer.channels, layer.channels]
        : layer.channels;
    addInto(out[0], l, layer.level);
    addInto(out[1], r, layer.level);
    parts.push([layer.name, l.map((v, i) => (v + r[i]) * 0.5 * layer.level)]);
  }
  if (process.env.RGP_AUDIO_LAYERS) {
    const total = rmsDb(out[0].map((v, i) => (v + out[1][i]) * 0.5));
    for (const [name, x] of parts)
      console.error(
        `  layer ${name}: ${(rmsDb(x) - total).toFixed(1)} dB against the mix`,
      );
  }
  return out;
}

/** `eventLayer` one loop long, made ready for the renderer's crossfade. */
export function loopEvents(
  ctx: SynthContext,
  events: Parameters<typeof eventLayer>[1],
  room?: Parameters<typeof eventLayer>[2],
): [Float32Array, Float32Array] {
  const [l, r] = eventLayer(ctx.loopFrames, events, room);
  return [periodic(l, ctx), periodic(r, ctx)];
}
