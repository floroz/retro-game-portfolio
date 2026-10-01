/**
 * Zurich ambience: the office at night.
 *
 * - The wall clock: tick, tock, once a second, in the quiet room.
 * - A quiet night: a low room tone, and the wind off the lake gusting
 *   softly against the window.
 * - Once a loop, very far off: a tram's bell down by the lake, ding-ding.
 *
 * 30 s loop (an even number of seconds, so tick and tock alternate across
 * the seam). The room tone and wind are crossfaded by the renderer; the
 * clock and the tram are exactly periodic (see `periodic`).
 */
import { biquad, mix, mul, type SfxRecipe } from "../../../scripts/assets/sfx";
import {
  between,
  burst,
  drift,
  loopEvents,
  mixLayers,
  normalise,
  ping,
  sec,
  stereoNoise,
  strike,
} from "../lib/synth";

const LOOP = 30;

/** One beat of a pendulum clock: a click and the case's small wooden ring. */
function beat(random: () => number, tock: boolean) {
  const k = tock ? 0.82 : 1;
  const out = new Float32Array(sec(0.12));
  mix(
    out,
    burst(random, {
      seconds: 0.03,
      halfLife: 0.0012,
      chain: [{ type: "bandpass", freq: 4200 * k, q: 1.5 }],
    }),
  );
  mix(out, ping(2800 * k, 0.006, 0.08), 0, { level: 0.4 });
  mix(out, ping(950 * k, 0.012, 0.12), 0, { level: 0.35 });
  return out;
}

/** A tram's bell, two strikes. */
function tramBell() {
  const out = new Float32Array(sec(2.5));
  const bell = strike(
    1250,
    [
      [1, 1, 0.35],
      [2.4, 0.4, 0.2],
      [3.9, 0.2, 0.1],
    ],
    2,
  );
  mix(out, bell, 0);
  mix(out, bell, sec(0.28), { level: 0.85 });
  return biquad(normalise(out), { type: "lowpass", freq: 1800 });
}

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Zurich ambience: a wall clock ticking once a second in a quiet office, a low room tone, soft wind off the lake, and once a loop a tram's bell far away.",
  seconds: LOOP,
  seed: 43,
  render: (ctx) => {
    const r = ctx.random;
    const n = ctx.frames;
    const [roomL, roomR] = stereoNoise(n, r, "pink", [
      { type: "lowpass", freq: 320 },
    ]);
    const gusts = drift(n, r, { lo: 0.15, hi: 1, minGap: 4, maxGap: 8 });
    const [windL, windR] = stereoNoise(n, r, "pink", [
      { type: "bandpass", freq: 380, q: 0.6 },
      { type: "lowpass", freq: 1200 },
    ]).map((ch) => mul(ch, gusts));
    const ticks = Array.from({ length: LOOP }, (_, s) => ({
      sound: beat(r, s % 2 === 1),
      at: s + 0.5 + between(r, -0.004, 0.004),
      pan: -0.35,
      level: between(r, 0.9, 1),
    }));
    return mixLayers(n, [
      { name: "room tone", channels: [roomL, roomR], level: 0.12 },
      { name: "wind", channels: [windL, windR], level: 0.25 },
      {
        name: "clock",
        channels: loopEvents(ctx, ticks, { size: 0.3, damp: 0.5, wet: 0.2 }),
        level: 0.6,
      },
      {
        name: "tram bell",
        channels: loopEvents(ctx, [{ sound: tramBell(), at: 17, pan: 0.6 }], {
          size: 0.9,
          damp: 0.6,
          wet: 0.6,
        }),
        level: 0.1,
      },
    ]);
  },
};

export default recipe;
