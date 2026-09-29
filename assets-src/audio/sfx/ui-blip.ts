/**
 * UI blip: the click of a verb or a window button, a short two-step square
 * blip like a 1990s sound card's, softened so it never nags.
 */
import {
  biquad,
  envelope,
  mix,
  mul,
  tone,
  type SfxRecipe,
} from "../../../scripts/assets/sfx";
import { fit, sec } from "../lib/synth";

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "UI blip: a short two-step square-wave blip (C6 then F6), low-passed so it stays soft.",
  seconds: 0.09,
  seed: 15,
  render: (ctx) => {
    const out = new Float32Array(ctx.frames);
    const step = (freq: number, at: number, seconds: number) => {
      const n = sec(seconds);
      const env = envelope(n, [
        [0, 0],
        [0.002, 1],
        [seconds * 0.5, 0.6],
        [seconds, 0],
      ]);
      mix(out, mul(tone(n, freq, "square"), env), sec(at));
    };
    step(1046.5, 0, 0.035);
    step(1396.9, 0.035, 0.05);
    return [fit(biquad(out, { type: "lowpass", freq: 3500 }), ctx.frames)];
  },
};

export default recipe;
