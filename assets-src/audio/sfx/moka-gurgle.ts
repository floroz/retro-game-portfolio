/**
 * Moka gurgle: the pot on the stove coming up. Bubbles pop through the
 * spout, slowly at first and then in a rush, while the steam's hiss rises
 * underneath; it settles as the coffee's done.
 */
import {
  biquad,
  envelope,
  mix,
  mul,
  noise,
  type SfxRecipe,
} from "../../../scripts/assets/sfx";
import { between, fit, glide, sec } from "../lib/synth";

const SECONDS = 2.8;

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Moka pot gurgle: bubbles popping through the spout, sparse then rushing, over a rising steam hiss that settles at the end.",
  seconds: SECONDS,
  seed: 21,
  render: (ctx) => {
    const r = ctx.random;
    const out = new Float32Array(ctx.frames);
    // Bubbles: short rising blips, sparse at first, then a rush, then fewer.
    const density = (t: number) =>
      6 + 40 * Math.sin((Math.PI * t) / SECONDS) ** 2;
    let t = 0.05;
    while (t < SECONDS - 0.15) {
      const seconds = between(r, 0.012, 0.04);
      const f0 = between(r, 280, 1100);
      const bubble = mul(
        glide(seconds, [
          [0, f0],
          [seconds, f0 * between(r, 1.5, 2.2)],
        ]),
        envelope(sec(seconds), [
          [0, 0],
          [0.002, 1],
          [seconds, 0],
        ]),
      );
      mix(out, bubble, sec(t), { level: between(r, 0.15, 0.5) });
      t += between(r, 0.3, 1.7) / density(t);
    }
    // Steam hiss.
    const n = ctx.frames;
    const hiss = biquad(
      biquad(noise(n, r, "white"), { type: "highpass", freq: 2500 }),
      { type: "lowpass", freq: 9000 },
    );
    const hissEnv = envelope(n, [
      [0, 0],
      [1.4, 0.12],
      [2.3, 0.1],
      [SECONDS, 0],
    ]);
    mix(out, mul(hiss, hissEnv));
    // The low boil in the base of the pot.
    const boil = biquad(noise(n, r, "brown"), { type: "lowpass", freq: 250 });
    mix(out, mul(boil, hissEnv), 0, { level: 1.2 });
    return [fit(out, ctx.frames)];
  },
};

export default recipe;
