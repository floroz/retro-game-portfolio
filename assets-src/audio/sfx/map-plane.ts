/**
 * The plane on the travel map: a little propeller aeroplane buzzing past,
 * cartoon-sized to fit the 1.5 s flight. A two-bladed prop chops a
 * sawtooth engine note; the pitch rises as it comes in and drops as it goes
 * (Doppler), and the whole pass swells and fades.
 */
import {
  biquad,
  mix,
  mul,
  noise,
  tone,
  envelope,
  type SfxRecipe,
} from "../../../scripts/assets/sfx";
import { filters, fit, sec } from "../lib/synth";

const SECONDS = 1.8;

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Travel-map plane: a small propeller plane buzzing past in about 1.5 s, with a Doppler pitch drop and a swell and fade.",
  seconds: SECONDS,
  seed: 14,
  render: (ctx) => {
    const n = ctx.frames;
    // Doppler: about a semitone either side of 105 Hz, crossing at 0.9 s.
    const pitch = (t: number) => 105 * (1 + 0.06 * Math.tanh((0.9 - t) * 4));
    const engine = tone(n, pitch, "saw");
    mix(
      engine,
      tone(n, (t) => pitch(t) * 2.01, "square"),
      0,
      { level: 0.25 },
    );
    // The prop: a flutter at half the engine rate, the blades chopping the air.
    const chop = tone(n, (t) => pitch(t) * 0.5, "sine").map(
      (v) => 0.6 + 0.4 * v,
    );
    const body = filters(mul(engine, chop), [
      { type: "lowpass", freq: 1800, q: 0.9 },
      { type: "peak", freq: 700, q: 1.2, gainDb: 6 },
    ]);
    const wind = biquad(noise(n, ctx.random, "pink"), {
      type: "bandpass",
      freq: 1200,
      q: 0.7,
    });
    mix(body, wind, 0, { level: 0.15 });
    const pass = envelope(n, [
      [0, 0],
      [0.25, 0.45],
      [0.9, 1],
      [1.45, 0.4],
      [SECONDS, 0],
    ]);
    return [
      fit(
        biquad(mul(body, pass), { type: "highpass", freq: 70 }),
        sec(SECONDS),
      ),
    ];
  },
};

export default recipe;
