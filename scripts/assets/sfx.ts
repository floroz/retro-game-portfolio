/**
 * Sound effects and ambience loops synthesised from code → WAV → MP3.
 *
 *   npm run assets:sfx -- [recipe...] [--preview]
 *
 * A recipe is a module whose default export is an `SfxRecipe`:
 *
 * - `assets-src/audio/sfx/<name>.ts` → `public/audio/sfx/<name>.mp3`, asset id
 *   `sfx-<name>`: a one-shot, mono, sample peak at −3 dBFS.
 * - `assets-src/audio/ambience/<scene>.ts` → `public/audio/ambience/<scene>.mp3`,
 *   asset id `ambience-<scene>`: a stereo loop at −28 LUFS, with Web Audio
 *   loop points in its provenance record.
 *
 * Name recipes as `sfx/door-open` or `ambience/hall` (or give a path). With
 * no names, every recipe is rendered. `--preview` writes only to
 * `assets-src/review/audio/`.
 *
 * Everything is deterministic: noise comes from a seeded generator, so the
 * same recipe always renders the same file.
 *
 * Loops: an ambience recipe renders `loopFrames + crossfadeFrames` frames.
 * The extra frames are crossfaded into the start (`crossfadeLoop`), so the
 * last frame of the loop runs straight into the first. For layers that must
 * repeat exactly, such as chimes placed at fixed times, `mix(..., { wrap:
 * true })` and `circular` make a buffer periodic by construction. The file is
 * then laid out with a pre-roll and post-roll like the music (see music.ts).
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { PROVENANCE_DIR, REPO_ROOT, cliPath, fail } from "./lib";
import {
  AUDIO_REVIEW_DIR,
  LAME_DELAY_FRAMES,
  SAMPLE_RATE,
  encodeToTarget,
  isMain,
  layoutLoop,
  loopPoints,
  seamReport,
  toolVersion,
  type Loudness,
  type LoopPoints,
  type SeamReport,
} from "./music";

/** Loudness levels for ambience loops and sound effects. */
export const AMBIENCE_LUFS = -28;
export const SFX_PEAK_DBFS = -3;
/** Default crossfade for ambience loops. */
export const LOOP_CROSSFADE_SECONDS = 2;
/** Pre-roll and post-roll around an ambience loop. */
export const LOOP_EDGE_SECONDS = 0.5;

const AUDIO_SRC = resolve(REPO_ROOT, "assets-src/audio");
const AUDIO_OUT = resolve(REPO_ROOT, "public/audio");

export type RecipeKind = "sfx" | "ambience";

export interface SynthContext {
  sampleRate: number;
  /** Frames to return per channel. For ambience, loopFrames + crossfadeFrames. */
  frames: number;
  /** Ambience only: the loop length in frames. */
  loopFrames: number;
  /** Ambience only: frames past the loop that are crossfaded into its start. */
  crossfadeFrames: number;
  /** Seeded random numbers in [0, 1). */
  random: () => number;
  /** Seconds to frames at this sample rate. */
  f: (seconds: number) => number;
}

export interface SfxRecipe {
  /** Task id from the execution map, for the provenance record. */
  task: string;
  description: string;
  /** Length of a one-shot, or of the loop for ambience. */
  seconds: number;
  /** Ambience only. Default LOOP_CROSSFADE_SECONDS. */
  crossfadeSeconds?: number;
  /** Seed for `random`. Default 1. */
  seed?: number;
  /** Return one buffer per channel (mono for sfx, stereo for ambience), each `ctx.frames` long. */
  render: (ctx: SynthContext) => Float32Array[];
}

// --- Randomness --------------------------------------------------------------------------

/** Mulberry32: a small, fast, seeded generator of numbers in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Sources -----------------------------------------------------------------------------

export type Waveform = "sine" | "square" | "triangle" | "saw";

/**
 * An oscillator. `freq` is Hz, or a function of time in seconds for sweeps;
 * phase is accumulated, so sweeps never click.
 */
export function tone(
  frames: number,
  freq: number | ((t: number) => number),
  shape: Waveform = "sine",
  sampleRate = SAMPLE_RATE,
): Float32Array {
  const out = new Float32Array(frames);
  let phase = 0;
  for (let i = 0; i < frames; i++) {
    const p = phase - Math.floor(phase);
    out[i] =
      shape === "sine"
        ? Math.sin(2 * Math.PI * p)
        : shape === "square"
          ? p < 0.5
            ? 1
            : -1
          : shape === "triangle"
            ? 1 - 4 * Math.abs(p - 0.5)
            : 2 * p - 1;
    phase +=
      (typeof freq === "number" ? freq : freq(i / sampleRate)) / sampleRate;
  }
  return out;
}

export type NoiseColour = "white" | "pink" | "brown";

/** Noise in about [−1, 1]. Pink uses Paul Kellet's filter; brown is integrated white. */
export function noise(
  frames: number,
  random: () => number,
  colour: NoiseColour = "white",
) {
  const out = new Float32Array(frames);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    brown = 0;
  for (let i = 0; i < frames; i++) {
    const w = random() * 2 - 1;
    if (colour === "white") out[i] = w;
    else if (colour === "pink") {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25;
    } else {
      brown = (brown + 0.02 * w) / 1.02;
      out[i] = brown * 3.5;
    }
  }
  return out;
}

// --- Envelopes ---------------------------------------------------------------------------

/**
 * Piecewise-linear envelope through `[seconds, level]` points. Before the
 * first point it holds the first level; after the last, the last level.
 */
export function envelope(
  frames: number,
  points: [number, number][],
  sampleRate = SAMPLE_RATE,
): Float32Array {
  if (!points.length) throw new Error("an envelope needs at least one point");
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  const last = pts[pts.length - 1];
  const out = new Float32Array(frames);
  let k = 0;
  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;
    if (t <= pts[0][0]) out[i] = pts[0][1];
    else if (t >= last[0]) out[i] = last[1];
    else {
      while (t >= pts[k + 1][0]) k++;
      const [t0, v0] = pts[k];
      const [t1, v1] = pts[k + 1];
      out[i] = v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return out;
}

export interface Adsr {
  attack: number;
  decay: number;
  /** Sustain level 0–1. */
  sustain: number;
  release: number;
  /** Seconds from the start until the release begins. Default: attack + decay. */
  gate?: number;
}

/** Attack–decay–sustain–release envelope (linear segments), 0 after the release. */
export function adsr(
  frames: number,
  a: Adsr,
  sampleRate = SAMPLE_RATE,
): Float32Array {
  const gate = Math.max(a.gate ?? a.attack + a.decay, a.attack + a.decay);
  return envelope(
    frames,
    [
      [0, 0],
      [a.attack, 1],
      [a.attack + a.decay, a.sustain],
      [gate, a.sustain],
      [gate + a.release, 0],
    ],
    sampleRate,
  );
}

/** Exponential decay from 1, halving every `halfLife` seconds. */
export function decay(
  frames: number,
  halfLife: number,
  sampleRate = SAMPLE_RATE,
) {
  const out = new Float32Array(frames);
  const k = Math.log(2) / (halfLife * sampleRate);
  for (let i = 0; i < frames; i++) out[i] = Math.exp(-k * i);
  return out;
}

// --- Filters -----------------------------------------------------------------------------

export type BiquadType = "lowpass" | "highpass" | "bandpass" | "peak";

/** RBJ cookbook biquad coefficients, normalised so a0 = 1. */
export function biquadCoefficients(
  type: BiquadType,
  freq: number,
  q = Math.SQRT1_2,
  gainDb = 0,
  sampleRate = SAMPLE_RATE,
) {
  const w = (2 * Math.PI * freq) / sampleRate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  const A = 10 ** (gainDb / 40);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  switch (type) {
    case "lowpass":
      [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
      [a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case "highpass":
      [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
      [a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case "bandpass": // constant 0 dB peak gain
      [b0, b1, b2] = [alpha, 0, -alpha];
      [a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case "peak":
      [b0, b1, b2] = [1 + alpha * A, -2 * cos, 1 - alpha * A];
      [a0, a1, a2] = [1 + alpha / A, -2 * cos, 1 - alpha / A];
      break;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

export interface BiquadOptions {
  type: BiquadType;
  freq: number;
  q?: number;
  gainDb?: number;
}

/** Filter a buffer with a biquad (direct form I). Returns a new buffer. */
export function biquad(
  input: Float32Array,
  o: BiquadOptions,
  sampleRate = SAMPLE_RATE,
) {
  const c = biquadCoefficients(o.type, o.freq, o.q, o.gainDb, sampleRate);
  const out = new Float32Array(input.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

/**
 * Run a time-invariant process (a filter, an echo, a reverb) on a buffer as
 * if it repeated forever: process two copies back to back and keep the
 * second, so the output is periodic too. The process's memory must be
 * shorter than the buffer.
 */
export function circular(
  input: Float32Array,
  process: (x: Float32Array) => Float32Array,
): Float32Array {
  const twice = new Float32Array(input.length * 2);
  twice.set(input, 0);
  twice.set(input, input.length);
  return process(twice).slice(input.length);
}

/** Feedback echo: `delay` seconds, `feedback` 0–1, `wet` level of the echoes. */
export function echo(
  input: Float32Array,
  delay: number,
  feedback: number,
  wet: number,
  sampleRate = SAMPLE_RATE,
) {
  const d = Math.max(1, Math.round(delay * sampleRate));
  const line = new Float32Array(input.length);
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const back = i >= d ? line[i - d] : 0;
    line[i] = input[i] + back * feedback;
    out[i] = input[i] + back * wet;
  }
  return out;
}

/**
 * A small Schroeder reverb (four damped combs, two allpasses, Freeverb
 * tunings). `size` 0–1 sets the decay, `damp` 0–1 darkens it, `wet` mixes.
 */
export function reverb(
  input: Float32Array,
  { size = 0.5, damp = 0.4, wet = 0.25 } = {},
  sampleRate = SAMPLE_RATE,
) {
  const scale = sampleRate / 44100;
  const feedback = 0.7 + 0.28 * size;
  const combs = [1116, 1188, 1277, 1356].map((n) => Math.round(n * scale));
  const allpasses = [556, 441].map((n) => Math.round(n * scale));
  const acc = new Float32Array(input.length);
  for (const len of combs) {
    const buf = new Float32Array(len);
    let idx = 0;
    let low = 0;
    for (let i = 0; i < input.length; i++) {
      const y = buf[idx];
      low = y * (1 - damp) + low * damp;
      buf[idx] = input[i] + low * feedback;
      acc[i] += y / combs.length;
      idx = (idx + 1) % len;
    }
  }
  let sig = acc;
  for (const len of allpasses) {
    const buf = new Float32Array(len);
    const out = new Float32Array(sig.length);
    let idx = 0;
    for (let i = 0; i < sig.length; i++) {
      const b = buf[idx];
      out[i] = -sig[i] + b;
      buf[idx] = sig[i] + b * 0.5;
      idx = (idx + 1) % len;
    }
    sig = out;
  }
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++)
    out[i] = input[i] * (1 - wet) + sig[i] * wet;
  return out;
}

// --- Mixing ------------------------------------------------------------------------------

/** Multiply two buffers sample by sample (for applying envelopes). */
export function mul(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * (b[i] ?? 0);
  return out;
}

/** Scale by a linear gain. Returns a new buffer. */
export function gain(a: Float32Array, g: number): Float32Array {
  return a.map((v) => v * g);
}

/**
 * Add `source` into `target` at frame `at`, scaled by `level`. With `wrap`,
 * whatever runs past the end continues from the start, so the target stays
 * periodic (for events in a loop). Modifies and returns `target`.
 */
export function mix(
  target: Float32Array,
  source: Float32Array,
  at = 0,
  { level = 1, wrap = false } = {},
): Float32Array {
  const n = target.length;
  for (let i = 0; i < source.length; i++) {
    let j = at + i;
    if (wrap) j = ((j % n) + n) % n;
    else if (j < 0 || j >= n) continue;
    target[j] += source[i] * level;
  }
  return target;
}

/** Constant-power pan of a mono buffer; −1 is left, 1 is right. */
export function pan(
  mono: Float32Array,
  position: number,
): [Float32Array, Float32Array] {
  const angle = ((Math.max(-1, Math.min(1, position)) + 1) * Math.PI) / 4;
  return [gain(mono, Math.cos(angle)), gain(mono, Math.sin(angle))];
}

/**
 * Turn `loopFrames + crossfade` frames into a seamless loop of `loopFrames`:
 * the frames past the loop fade out over its start while the start fades in
 * (equal power, for uncorrelated layers such as noise). The last frame of the
 * result runs straight into the first.
 */
export function crossfadeLoop(
  input: Float32Array,
  loopFrames: number,
): Float32Array {
  const x = input.length - loopFrames;
  if (x < 0) throw new Error("the render is shorter than the loop");
  if (x > loopFrames) throw new Error("the crossfade is longer than the loop");
  const out = input.slice(0, loopFrames);
  for (let i = 0; i < x; i++) {
    const t = (i + 0.5) / x;
    out[i] =
      input[i] * Math.sin((t * Math.PI) / 2) +
      input[loopFrames + i] * Math.cos((t * Math.PI) / 2);
  }
  return out;
}

/** Interleave channel buffers into one. */
export function interleave(channels: Float32Array[]): Float32Array {
  const n = channels[0].length;
  const out = new Float32Array(n * channels.length);
  channels.forEach((ch, c) => {
    if (ch.length !== n) throw new Error("channels differ in length");
    for (let i = 0; i < n; i++) out[i * channels.length + c] = ch[i];
  });
  return out;
}

/** Short linear fades at both ends of a one-shot, in place, so it never clicks. */
export function declick(
  buf: Float32Array,
  frames = Math.round(SAMPLE_RATE * 0.002),
) {
  const n = Math.min(frames, Math.floor(buf.length / 2));
  for (let i = 0; i < n; i++) {
    buf[i] *= i / n;
    buf[buf.length - 1 - i] *= i / n;
  }
  return buf;
}

// --- Rendering ---------------------------------------------------------------------------

const rel = (p: string) => relative(REPO_ROOT, p).split("\\").join("/");
const today = () => new Date().toISOString().slice(0, 10);

export interface RecipeRef {
  kind: RecipeKind;
  name: string;
  path: string;
  /** Asset id: sfx-<name> or ambience-<scene>. */
  id: string;
  output: string;
}

/** Resolve `sfx/<name>`, `ambience/<scene>`, or a path to a recipe file. */
export function recipeRef(arg: string): RecipeRef {
  const path = arg.endsWith(".ts")
    ? cliPath(arg)
    : join(AUDIO_SRC, `${arg}.ts`);
  const kind = relative(AUDIO_SRC, path).split(/[\\/]/)[0];
  if (kind !== "sfx" && kind !== "ambience")
    throw new Error(
      `${arg}: recipes live in assets-src/audio/sfx/ or assets-src/audio/ambience/`,
    );
  const name = basename(path, ".ts");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
    throw new Error(`${arg}: name isn't kebab-case`);
  return {
    kind,
    name,
    path,
    id: `${kind}-${name}`,
    output: join(AUDIO_OUT, kind, `${name}.mp3`),
  };
}

function allRecipes(): RecipeRef[] {
  return (["sfx", "ambience"] as const).flatMap((kind) => {
    const dir = join(AUDIO_SRC, kind);
    return existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith(".ts"))
          .sort()
          .map((f) => recipeRef(join(dir, f)))
      : [];
  });
}

export interface SfxResult {
  output: string;
  channels: number;
  seconds: number;
  gainDb: number;
  loudness: Loudness & { samplePeakDbfs: number };
  loop?: LoopPoints;
  seam?: { wav: SeamReport; mp3: SeamReport; mp3WithDecoderOffset: SeamReport };
}

/** Render a recipe into interleaved samples ready to encode (and its loop points). */
export function renderRecipe(recipe: SfxRecipe, kind: RecipeKind) {
  const f = (s: number) => Math.round(s * SAMPLE_RATE);
  const loopFrames = f(recipe.seconds);
  const crossfadeFrames =
    kind === "ambience"
      ? f(recipe.crossfadeSeconds ?? LOOP_CROSSFADE_SECONDS)
      : 0;
  const ctx: SynthContext = {
    sampleRate: SAMPLE_RATE,
    frames: loopFrames + crossfadeFrames,
    loopFrames: kind === "ambience" ? loopFrames : 0,
    crossfadeFrames,
    random: seededRandom(recipe.seed ?? 1),
    f,
  };
  const channels = recipe.render(ctx);
  const want = kind === "ambience" ? 2 : 1;
  if (channels.length !== want)
    throw new Error(
      `a ${kind} recipe returns ${want} channel(s), got ${channels.length}`,
    );
  for (const ch of channels) {
    if (ch.length !== ctx.frames)
      throw new Error(
        `each channel must be ctx.frames (${ctx.frames}) long, got ${ch.length}`,
      );
    if (ch.some((v) => !Number.isFinite(v)))
      throw new Error("the render contains NaN or Infinity");
  }
  if (kind === "sfx")
    return { samples: declick(channels[0].slice()), channels: 1 };
  const edge = f(LOOP_EDGE_SECONDS);
  const loop = interleave(channels.map((ch) => crossfadeLoop(ch, loopFrames)));
  return {
    samples: layoutLoop(loop, edge, edge, 2),
    channels: 2,
    loop: loopPoints(loopFrames, edge, edge),
  };
}

export async function renderRef(
  ref: RecipeRef,
  { preview = false } = {},
): Promise<SfxResult> {
  const mod = (await import(pathToFileURL(ref.path).href)) as {
    default?: SfxRecipe;
  };
  if (!mod.default) throw new Error(`${rel(ref.path)} has no default export`);
  const r = renderRecipe(mod.default, ref.kind);
  const work = join(AUDIO_REVIEW_DIR, ref.kind);
  mkdirSync(work, { recursive: true });
  const output = preview ? join(work, `${ref.name}.mp3`) : ref.output;
  const enc = encodeToTarget({
    samples: r.samples,
    channels: r.channels,
    range: r.loop ? [r.loop.loopStartFrame, r.loop.loopEndFrame] : undefined,
    target:
      ref.kind === "ambience"
        ? { lufs: AMBIENCE_LUFS }
        : { peakDbfs: SFX_PEAK_DBFS },
    work: join(work, ref.name),
    mp3: output,
    bitrate: ref.kind === "ambience" ? "128k" : "96k",
  });
  const result: SfxResult = {
    output,
    channels: r.channels,
    seconds: r.samples.length / r.channels / SAMPLE_RATE,
    gainDb: enc.gainDb,
    loudness: enc.loudness,
  };
  if (r.loop) {
    const w = Math.floor(r.loop.loopStartFrame / 2);
    result.loop = r.loop;
    result.seam = {
      wav: seamReport(
        enc.source,
        r.loop.loopStartFrame,
        r.loop.loopEndFrame,
        w,
        2,
      ),
      mp3: seamReport(
        enc.decoded,
        r.loop.loopStartFrame,
        r.loop.loopEndFrame,
        w,
        2,
      ),
      mp3WithDecoderOffset: seamReport(
        enc.decoded,
        r.loop.loopStartFrame + LAME_DELAY_FRAMES,
        r.loop.loopEndFrame + LAME_DELAY_FRAMES,
        w - LAME_DELAY_FRAMES,
        2,
      ),
    };
  }
  return result;
}

function writeProvenance(ref: RecipeRef, recipe: SfxRecipe, result: SfxResult) {
  const file = join(PROVENANCE_DIR, `${ref.id}.json`);
  const previous = existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>)
    : {};
  const record = {
    id: ref.id,
    output: rel(result.output),
    task: recipe.task,
    source: "opus",
    ...(previous.approvedBy ? { approvedBy: previous.approvedBy } : {}),
    date: today(),
    recipe: rel(ref.path),
    description: recipe.description,
    ...(result.loop
      ? {
          loop: {
            loopStart: result.loop.loopStart,
            loopEnd: result.loop.loopEnd,
            loopStartFrame: result.loop.loopStartFrame,
            loopEndFrame: result.loop.loopEndFrame,
            sampleRate: result.loop.sampleRate,
            usage:
              "Decode with Web Audio and loop an AudioBufferSourceNode between loopStart and loopEnd (seconds). Start at 0.",
          },
        }
      : {}),
    loudness: {
      ...result.loudness,
      gainDb: result.gainDb,
      target:
        ref.kind === "ambience"
          ? `${AMBIENCE_LUFS} LUFS`
          : `${SFX_PEAK_DBFS} dBFS sample peak`,
    },
    ...(result.seam ? { seam: result.seam } : {}),
    render: {
      synth: "scripts/assets/sfx.ts (seeded, deterministic)",
      seed: recipe.seed ?? 1,
      ffmpeg: toolVersion("ffmpeg"),
      sampleRate: SAMPLE_RATE,
      channels: result.channels,
    },
  };
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return file;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { preview: { type: "boolean", default: false } },
  });
  const refs = positionals.length ? positionals.map(recipeRef) : allRecipes();
  if (!refs.length) {
    console.log(
      "assets:sfx: no recipes in assets-src/audio/sfx/ or assets-src/audio/ambience/ yet.",
    );
    return;
  }
  toolVersion("ffmpeg");
  for (const ref of refs) {
    const result = await renderRef(ref, { preview: values.preview });
    const mod = (await import(pathToFileURL(ref.path).href)) as {
      default: SfxRecipe;
    };
    const record = values.preview
      ? undefined
      : writeProvenance(ref, mod.default, result);
    console.log(
      JSON.stringify(
        {
          ...result,
          output: rel(result.output),
          provenance: record && rel(record),
        },
        null,
        2,
      ),
    );
  }
}

if (isMain(import.meta.url)) {
  main().catch((e: unknown) =>
    fail(e instanceof Error ? e.message : String(e)),
  );
}
