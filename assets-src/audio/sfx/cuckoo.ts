/**
 * Cuckoo: the office clock's bird. The little door clicks open, two
 * bellows-blown wooden pipes sound "cu-ckoo" twice, a falling minor third
 * (G5 to E5, in the Zurich theme's key), and the door clicks shut.
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
import { burst, fit, ping, sec } from "../lib/synth";

/** One pipe note: a breathy, nearly pure tone with a soft attack. */
function pipe(random: () => number, freq: number, seconds: number) {
  const n = sec(seconds);
  const body = tone(n, freq);
  mix(body, tone(n, freq * 2), 0, { level: 0.12 });
  mix(body, tone(n, freq * 3), 0, { level: 0.04 });
  const breath = biquad(noise(n, random, "white"), {
    type: "bandpass",
    freq,
    q: 6,
  });
  mix(body, breath, 0, { level: 0.35 });
  return mul(
    body,
    envelope(n, [
      [0, 0],
      [0.03, 1],
      [seconds - 0.06, 0.85],
      [seconds, 0],
    ]),
  );
}

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Cuckoo clock: the door clicks open, two wooden pipes call cu-ckoo twice (G5 falling to E5), and the door clicks shut.",
  seconds: 2.1,
  seed: 19,
  render: (ctx) => {
    const r = ctx.random;
    const out = new Float32Array(ctx.frames);
    const click = (at: number, level: number) => {
      mix(
        out,
        burst(r, {
          seconds: 0.03,
          halfLife: 0.002,
          chain: [{ type: "bandpass", freq: 2400, q: 1.5 }],
        }),
        sec(at),
        { level },
      );
      mix(out, ping(900, 0.008, 0.05), sec(at), { level: level * 0.4 });
    };
    click(0.02, 0.5);
    for (const at of [0.2, 0.95]) {
      // The bellows' puff under each call.
      mix(
        out,
        burst(r, {
          seconds: 0.3,
          attack: 0.05,
          halfLife: 0.06,
          colour: "pink",
          chain: [{ type: "lowpass", freq: 400 }],
        }),
        sec(at),
        { level: 0.15 },
      );
      mix(out, pipe(r, 784, 0.2), sec(at), { level: 0.9 });
      mix(out, pipe(r, 659.3, 0.38), sec(at + 0.26), { level: 0.9 });
    }
    click(1.85, 0.6);
    return [fit(out, ctx.frames)];
  },
};

export default recipe;
