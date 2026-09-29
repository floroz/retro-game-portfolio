/**
 * Door close: a swish of air, the wooden thud of the door meeting its
 * frame, and the latch snapping home with a small rattle.
 */
import {
  biquad,
  decay,
  mix,
  mul,
  reverb,
  tone,
  type SfxRecipe,
} from "../../../scripts/assets/sfx";
import { burst, fit, ping, sec } from "../lib/synth";

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Door close: a swish of air, a wooden thud against the frame, and the latch snapping home.",
  seconds: 0.9,
  seed: 12,
  render: (ctx) => {
    const r = ctx.random;
    const out = new Float32Array(ctx.frames);
    mix(
      out,
      burst(r, {
        seconds: 0.3,
        attack: 0.18,
        halfLife: 0.03,
        colour: "pink",
        chain: [{ type: "lowpass", freq: 700 }],
      }),
      0,
      { level: 0.3 },
    );
    const hit = sec(0.2);
    // The thud: a low body and a dark knock.
    mix(out, mul(tone(sec(0.4), 78), decay(sec(0.4), 0.05)), hit, {
      level: 0.9,
    });
    mix(out, ping(165, 0.03, 0.3), hit, { level: 0.5 });
    mix(
      out,
      burst(r, {
        seconds: 0.25,
        halfLife: 0.02,
        colour: "pink",
        chain: [{ type: "lowpass", freq: 900 }],
      }),
      hit,
      { level: 0.8 },
    );
    // The latch: a bright snap and a tiny rattle of the bolt.
    for (const [dt, level] of [
      [0.012, 0.7],
      [0.05, 0.25],
      [0.075, 0.12],
    ] as const) {
      mix(
        out,
        burst(r, {
          seconds: 0.04,
          halfLife: 0.002,
          chain: [{ type: "bandpass", freq: 3400, q: 2 }],
        }),
        hit + sec(dt),
        { level },
      );
      mix(out, ping(2100, 0.01, 0.06), hit + sec(dt), { level: level * 0.3 });
    }
    const room = reverb(out, { size: 0.35, damp: 0.5, wet: 0.14 });
    return [fit(biquad(room, { type: "highpass", freq: 40 }), ctx.frames)];
  },
};

export default recipe;
