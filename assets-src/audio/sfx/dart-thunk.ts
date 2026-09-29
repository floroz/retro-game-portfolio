/**
 * Dart thunk: a quick whoosh through the air, the dart biting into the
 * sisal board, and the shaft's short wobble afterwards.
 */
import {
  biquad,
  envelope,
  mix,
  mul,
  tone,
  decay,
  type SfxRecipe,
} from "../../../scripts/assets/sfx";
import { burst, fit, ping, sec } from "../lib/synth";

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Dart thunk: a short whoosh, a dull thunk into the sisal board, and the shaft's wobble.",
  seconds: 0.6,
  seed: 17,
  render: (ctx) => {
    const r = ctx.random;
    const out = new Float32Array(ctx.frames);
    const whoosh = burst(r, {
      seconds: 0.14,
      attack: 0.1,
      halfLife: 0.01,
      colour: "white",
      chain: [{ type: "bandpass", freq: 1800, q: 0.8 }],
    });
    mix(out, whoosh, 0, { level: 0.2 });
    const hit = sec(0.12);
    mix(
      out,
      burst(r, {
        seconds: 0.12,
        halfLife: 0.012,
        colour: "pink",
        chain: [{ type: "lowpass", freq: 1100 }],
      }),
      hit,
      { level: 1 },
    );
    mix(out, ping(230, 0.02, 0.2), hit, { level: 0.7 });
    mix(
      out,
      burst(r, {
        seconds: 0.02,
        halfLife: 0.001,
        chain: [{ type: "highpass", freq: 2500 }],
      }),
      hit,
      { level: 0.3 },
    );
    // The wobble: a buzzy tone whose level shakes at about 28 Hz and dies away.
    const n = sec(0.4);
    const shake = tone(n, 28).map((v) => 0.5 + 0.5 * v);
    const wobble = mul(mul(tone(n, 310, "triangle"), shake), decay(n, 0.07));
    const fadeIn = envelope(n, [
      [0, 0],
      [0.01, 1],
    ]);
    mix(out, mul(wobble, fadeIn), hit + sec(0.01), { level: 0.25 });
    return [fit(biquad(out, { type: "highpass", freq: 60 }), ctx.frames)];
  },
};

export default recipe;
