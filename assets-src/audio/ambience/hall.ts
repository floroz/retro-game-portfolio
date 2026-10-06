/**
 * Hall ambience: a 1990s departure lounge.
 *
 * - The terminal hum: air handling (dark noise, drifting slowly) and the
 *   100 Hz buzz of the fluorescent lights.
 * - A murmur of travellers under the high ceiling, in a long reverb.
 * - Once a loop: the boarding chime (the motif's head on tubular bells, the
 *   same render as sfx-boarding-chime) over the PA, and a jet taking off
 *   beyond the windows.
 *
 * 40 s loop. Beds are crossfaded by the renderer; the events and the hum
 * are exactly periodic (see `periodic`).
 */
import {
  biquad,
  envelope,
  mix,
  mul,
  noise,
  reverb,
  tone,
  type SfxRecipe,
} from "../../../scripts/assets/sfx";
import {
  babble,
  drift,
  filters,
  loopEvents,
  mixLayers,
  normalise,
  periodic,
  sec,
  stereoNoise,
} from "../lib/synth";
import { bell } from "../sfx/boarding-chime";

const LOOP = 40;

/** A jet taking off outside the windows: a long, muffled roar and a whine. */
function jet(random: () => number) {
  const seconds = 14;
  const n = sec(seconds);
  const roar = filters(noise(n, random, "pink"), [
    { type: "lowpass", freq: 600, q: 0.8 },
  ]);
  const whine = tone(n, (t) => 2400 + 300 * (t / seconds));
  mix(roar, whine, 0, { level: 0.01 });
  return mul(
    roar,
    envelope(n, [
      [0, 0],
      [6, 1],
      [8, 0.9],
      [seconds, 0],
    ]),
  );
}

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Hall ambience: air-handling hum and fluorescent buzz, a murmur of travellers in a long reverb, and once a loop the boarding chime and a distant jet taking off.",
  seconds: LOOP,
  seed: 41,
  render: (ctx) => {
    const r = ctx.random;
    const n = ctx.frames;
    const L = ctx.loopFrames;
    // Air handling.
    const [hvacL, hvacR] = stereoNoise(n, r, "brown", [
      { type: "lowpass", freq: 180 },
    ]);
    const [airL, airR] = stereoNoise(n, r, "pink", [
      { type: "bandpass", freq: 500, q: 0.5 },
    ]);
    const swell = drift(n, r, { lo: 0.85, hi: 1, minGap: 4, maxGap: 9 });
    // Fluorescent buzz: 100 Hz and its harmonics, periodic over the loop.
    const buzz = tone(L, 100);
    mix(buzz, tone(L, 200), 0, { level: 0.4 });
    mix(buzz, tone(L, 300), 0, { level: 0.2 });
    const hum = periodic(buzz, ctx);
    // Travellers, far off under a high ceiling.
    const [crowdL, crowdR] = babble(n, r, {
      voices: 16,
      lowpass: 1600,
      spread: 0.9,
      pause: 0.22,
    }).map((ch, i) =>
      reverb(ch, { size: 0.85, damp: 0.45 + i * 0.02, wet: 0.55 }),
    );
    // Once a loop, in the big room.
    const hall = { size: 0.9, damp: 0.4, wet: 0.45 };
    const chime = biquad(normalise(bell), { type: "lowpass", freq: 3200 });
    return mixLayers(n, [
      {
        name: "air handling",
        channels: [mul(hvacL, swell), mul(hvacR, swell)],
        level: 0.5,
      },
      {
        name: "air hiss",
        channels: [mul(airL, swell), mul(airR, swell)],
        level: 0.18,
      },
      { name: "fluorescent buzz", channels: hum, level: 0.006 },
      { name: "travellers", channels: [crowdL, crowdR], level: 0.2 },
      {
        name: "boarding chime",
        channels: loopEvents(ctx, [{ sound: chime, at: 12, pan: -0.15 }], hall),
        level: 0.6,
      },
      {
        name: "jet",
        channels: loopEvents(ctx, [{ sound: jet(r), at: 24, pan: 0.35 }], hall),
        level: 0.25,
      },
    ]);
  },
};

export default recipe;
