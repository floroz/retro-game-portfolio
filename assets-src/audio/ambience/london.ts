/**
 * London ambience: the pub on a rainy evening.
 *
 * - Rain on the window, heard from inside: a muffled wash that gusts, with
 *   drops ticking on the glass and heavier ones pattering on the sill.
 * - The pub murmur: a dozen regulars talking, close, in a small warm room.
 * - Glasses clinking now and then.
 *
 * 32 s loop. The rain and the murmur are crossfaded by the renderer; the
 * clinks are exactly periodic (see `periodic`).
 */
import {
  mix,
  mul,
  pan,
  reverb,
  type SfxRecipe,
} from "../../../scripts/assets/sfx";
import {
  babble,
  between,
  burst,
  drift,
  filters,
  loopEvents,
  mixLayers,
  ping,
  sec,
  stereoNoise,
  strike,
} from "../lib/synth";

const LOOP = 32;

/** Glass partials: a thin, bright ring. */
const glass = (random: () => number) =>
  strike(
    between(random, 2500, 3400),
    [
      [1, 1, 0.12],
      [2.32, 0.5, 0.07],
      [4.25, 0.25, 0.04],
    ],
    0.6,
  );

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "London ambience: rain on the pub window heard from inside (a gusting wash, drops ticking on the glass), a dozen regulars murmuring, and glasses clinking.",
  seconds: LOOP,
  seed: 42,
  render: (ctx) => {
    const r = ctx.random;
    const n = ctx.frames;
    // The wash of rain, through the glass.
    const glassFilter = [
      { type: "highpass" as const, freq: 500 },
      { type: "lowpass" as const, freq: 4200 },
    ];
    const gust = drift(n, r, { lo: 0.7, hi: 1, minGap: 3, maxGap: 7 });
    const [washL, washR] = stereoNoise(n, r, "pink", glassFilter).map((ch) =>
      mul(ch, gust),
    );
    // Drops on the glass and the sill, scattered across the window.
    const dropsL = new Float32Array(n);
    const dropsR = new Float32Array(n);
    const place = (x: Float32Array, at: number, level: number) => {
      const [l, rr] = pan(x, between(r, -0.8, 0.8));
      mix(dropsL, l, at, { level });
      mix(dropsR, rr, at, { level });
    };
    for (let t = 0; t < n / ctx.sampleRate; t += between(r, 0.005, 0.045))
      place(
        ping(between(r, 2200, 5500), 0.002, 0.02),
        sec(t),
        between(r, 0.02, 0.12),
      );
    for (let t = 0; t < n / ctx.sampleRate; t += between(r, 0.04, 0.2))
      place(
        burst(r, {
          seconds: 0.04,
          halfLife: 0.006,
          colour: "pink",
          chain: [{ type: "bandpass", freq: between(r, 700, 1200), q: 1.2 }],
        }),
        sec(t),
        between(r, 0.1, 0.3),
      );
    const drops = [dropsL, dropsR].map((ch) => filters(ch, glassFilter)) as [
      Float32Array,
      Float32Array,
    ];
    // The regulars, close and warm.
    const crowd = babble(n, r, {
      voices: 12,
      lowpass: 3000,
      spread: 0.85,
      pause: 0.2,
    }).map((ch, i) =>
      reverb(ch, { size: 0.4, damp: 0.55 + i * 0.02, wet: 0.25 }),
    ) as [Float32Array, Float32Array];
    // Glasses: a single clink, a toast (two), another single, another toast.
    const clinks = [
      { at: 4.2, pair: false },
      { at: 11.5, pair: true },
      { at: 19.8, pair: false },
      { at: 26.4, pair: true },
    ].flatMap(({ at, pair }) => {
      const p = between(r, -0.7, 0.7);
      const one = { sound: glass(r), at, pan: p };
      return pair
        ? [one, { sound: glass(r), at: at + 0.09, pan: p + 0.05, level: 0.7 }]
        : [one];
    });
    return mixLayers(n, [
      { name: "rain wash", channels: [washL, washR], level: 0.22 },
      { name: "rain drops", channels: drops, level: 1 },
      { name: "pub murmur", channels: crowd, level: 0.26 },
      {
        name: "glasses",
        channels: loopEvents(ctx, clinks, { size: 0.4, damp: 0.5, wet: 0.25 }),
        level: 0.17,
      },
    ]);
  },
};

export default recipe;
