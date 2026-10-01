/**
 * Split-flap flutter: the departures board changing a line. Dozens of
 * plastic flaps fall past each other, fast at first and slowing as the
 * characters settle, over the whirr of the drum motors. The clicks come from
 * several modules at once, so they are scattered, not a single metronome.
 */
import { biquad, mix, type SfxRecipe } from "../../../scripts/assets/sfx";
import { between, burst, fit, ping, sec } from "../lib/synth";

const SECONDS = 1.1;

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Split-flap flutter: plastic flaps clattering over from several modules at once, slowing as they settle, over a faint motor whirr.",
  seconds: SECONDS,
  seed: 16,
  render: (ctx) => {
    const r = ctx.random;
    const out = new Float32Array(ctx.frames);
    const modules = 5;
    for (let m = 0; m < modules; m++) {
      // Each module flips at 30–45 flaps a second, stops at its own time.
      const rate = between(r, 30, 45);
      const stop = between(r, 0.55, 0.95);
      let t = between(r, 0, 0.03);
      while (t < stop) {
        const slow = 1 + 1.6 * (t / stop) ** 3;
        const tone = between(r, 0.85, 1.15);
        const level = between(r, 0.35, 0.8) * (1 - 0.4 * (t / stop));
        mix(
          out,
          burst(r, {
            seconds: 0.02,
            halfLife: 0.0012,
            chain: [{ type: "bandpass", freq: 2600 * tone, q: 1.5 }],
          }),
          sec(t),
          { level },
        );
        mix(out, ping(1150 * tone, 0.004, 0.02), sec(t), {
          level: level * 0.35,
        });
        t += slow / rate;
      }
      // The last flap lands a little harder.
      mix(
        out,
        burst(r, {
          seconds: 0.03,
          halfLife: 0.002,
          chain: [{ type: "bandpass", freq: 2200, q: 1.2 }],
        }),
        sec(stop),
        { level: 0.9 },
      );
    }
    const whirr = burst(r, {
      seconds: SECONDS,
      attack: 0.05,
      halfLife: 0.5,
      colour: "pink",
      chain: [{ type: "bandpass", freq: 350, q: 1.5 }],
    });
    mix(out, whirr, 0, { level: 0.06 });
    return [fit(biquad(out, { type: "highpass", freq: 120 }), ctx.frames)];
  },
};

export default recipe;
