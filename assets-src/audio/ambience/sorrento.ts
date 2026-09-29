/**
 * Sorrento ambience: the kitchen above the Gulf of Naples at sunset
 * (docs/art-spec.md, Audio).
 *
 * - Waves on the rocks below: four sets a loop, each a rising roar, a
 *   break, and the long hiss of the foam running back.
 * - Gulls crying out over the water, now left, now right.
 * - Once a loop, a scooter buzzing along the coast road, passing from left
 *   to right with a Doppler drop.
 *
 * 36 s loop. The wave envelopes and all the events are exactly periodic;
 * only the noise inside the waves is crossfaded by the renderer.
 */
import {
  biquad,
  envelope,
  mix,
  mul,
  noise,
  tone,
  type SfxRecipe,
} from "../../../scripts/assets/sfx";
import {
  between,
  filters,
  glide,
  loopEvents,
  mixLayers,
  periodic,
  sec,
  stereoNoise,
  tileTo,
} from "../lib/synth";

const LOOP = 36;
const WAVES = [1, 9.5, 18.5, 27]; // seconds: when each wave breaks

/** A periodic envelope: base level plus a swell before and a decay after each wave. */
function waveEnvelope(
  loopFrames: number,
  {
    base,
    rise,
    fall,
    delay,
  }: { base: number; rise: number; fall: number; delay: number },
) {
  const out = new Float32Array(loopFrames).fill(base);
  for (const at of WAVES) {
    const len = sec(rise + fall);
    const shape = envelope(len, [
      [0, 0],
      [rise, 1],
      [rise + fall * 0.25, 0.55],
      [rise + fall, 0],
    ]);
    mix(out, shape, sec(at + delay - rise), { wrap: true, level: 1 - base });
  }
  return out;
}

/** A gull's call: two to four harsh "kyow"s. */
function gull(random: () => number) {
  const calls = 2 + Math.floor(random() * 3);
  const f = between(random, 1100, 1500);
  const out = new Float32Array(sec(0.4 * calls + 0.3));
  for (let c = 0; c < calls; c++) {
    const seconds = between(random, 0.22, 0.32);
    const cry = glide(
      seconds,
      [
        [0, f * 0.9],
        [0.05, f * 1.35],
        [seconds, f * 0.75],
      ],
      "saw",
    );
    const rasp = biquad(noise(cry.length, random, "white"), {
      type: "bandpass",
      freq: f * 2,
      q: 2,
    });
    mix(cry, rasp, 0, { level: 0.25 });
    const shaped = mul(
      filters(cry, [
        { type: "bandpass", freq: f * 1.6, q: 0.9 },
        { type: "lowpass", freq: 4000 },
      ]),
      envelope(cry.length, [
        [0, 0],
        [0.03, 1],
        [seconds * 0.7, 0.7],
        [seconds, 0],
      ]),
    );
    mix(out, shaped, sec(c * between(random, 0.34, 0.42)), {
      level: between(random, 0.7, 1),
    });
  }
  return out;
}

/** A two-stroke scooter passing, as a stereo pair panned left to right. */
function scooter(random: () => number): [Float32Array, Float32Array] {
  const seconds = 8;
  const n = sec(seconds);
  const mid = seconds / 2;
  const pitch = (t: number) =>
    150 *
    (1 + 0.05 * Math.tanh((mid - t) * 1.3)) *
    (1 + 0.02 * Math.sin(t * 5));
  const engine = tone(n, pitch, "saw");
  mix(
    engine,
    tone(n, (t) => pitch(t) / 2, "square"),
    0,
    { level: 0.3 },
  );
  const rasp = mul(
    biquad(noise(n, random, "white"), { type: "bandpass", freq: 2000, q: 0.8 }),
    tone(n, pitch).map((v) => Math.max(0, v)),
  );
  mix(engine, rasp, 0, { level: 0.3 });
  const body = mul(
    filters(engine, [{ type: "lowpass", freq: 1300, q: 0.8 }]),
    envelope(n, [
      [0, 0],
      [mid - 0.5, 1],
      [mid + 0.5, 1],
      [seconds, 0],
    ]),
  );
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.tanh(((i / n) * seconds - mid) * 0.6); // −1 → 1
    const angle = ((p + 1) * Math.PI) / 4;
    l[i] = body[i] * Math.cos(angle);
    r[i] = body[i] * Math.sin(angle);
  }
  return [l, r];
}

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Sorrento ambience: waves breaking on the rocks below in four sets a loop, gulls crying over the water, and a scooter passing on the coast road.",
  seconds: LOOP,
  seed: 44,
  render: (ctx) => {
    const r = ctx.random;
    const n = ctx.frames;
    const L = ctx.loopFrames;
    const roarEnv = tileTo(
      waveEnvelope(L, { base: 0.3, rise: 2.5, fall: 3.5, delay: 0 }),
      n,
    );
    const foamEnv = tileTo(
      waveEnvelope(L, { base: 0.15, rise: 1.2, fall: 5, delay: 0.6 }),
      n,
    );
    const [roarL, roarR] = stereoNoise(n, r, "brown", [
      { type: "lowpass", freq: 550 },
    ]).map((ch) => mul(ch, roarEnv));
    const [foamL, foamR] = stereoNoise(n, r, "white", [
      { type: "highpass", freq: 1200 },
      { type: "lowpass", freq: 6500 },
    ]).map((ch) => mul(ch, foamEnv));
    const gulls = [
      { sound: gull(r), at: 4, pan: -0.6 },
      { sound: gull(r), at: 15.5, pan: 0.7 },
      { sound: gull(r), at: 16.8, pan: 0.4, level: 0.6 },
      { sound: gull(r), at: 29, pan: -0.2 },
    ];
    // The scooter is already stereo: place both channels with the loop wrapping.
    const [sl, sr] = scooter(r);
    const scootL = new Float32Array(L);
    const scootR = new Float32Array(L);
    mix(scootL, sl, sec(19), { wrap: true });
    mix(scootR, sr, sec(19), { wrap: true });
    return mixLayers(n, [
      { name: "wave roar", channels: [roarL, roarR], level: 0.6 },
      { name: "foam hiss", channels: [foamL, foamR], level: 0.2 },
      {
        name: "gulls",
        channels: loopEvents(ctx, gulls, { size: 0.8, damp: 0.4, wet: 0.35 }),
        level: 0.12,
      },
      {
        name: "scooter",
        channels: [periodic(scootL, ctx), periodic(scootR, ctx)],
        level: 0.07,
      },
    ]);
  },
};

export default recipe;
