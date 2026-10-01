/**
 * Footsteps on the three floors:
 * the Hall's patterned carpet, the pub's and the office's wooden boards, and
 * the Sorrento kitchen's majolica tiles. Each step is a heel strike and a
 * lighter toe strike; the three variants of a surface differ in seed, timing,
 * pitch, and weight, so a walk never repeats one sample.
 */
import {
  decay,
  echo,
  mix,
  mul,
  reverb,
  tone,
  type SfxRecipe,
} from "../../../scripts/assets/sfx";
import { between, burst, fit, ping, sec } from "./synth";

export type Surface = "carpet" | "wood" | "tile";

const SECONDS = 0.4;

/** One strike on a surface, `scale` shifting its pitch. */
function strikeOn(
  surface: Surface,
  random: () => number,
  scale: number,
): Float32Array {
  const out = new Float32Array(sec(0.3));
  const add = (x: Float32Array, level: number) => mix(out, x, 0, { level });
  if (surface === "carpet") {
    // A muffled thump: dark noise and a low body, then a whisper of fibre.
    add(
      burst(random, {
        seconds: 0.2,
        attack: 0.004,
        halfLife: 0.02,
        colour: "pink",
        chain: [{ type: "lowpass", freq: 480 * scale, q: 0.9 }],
      }),
      1,
    );
    add(mul(tone(sec(0.2), 80 * scale), decay(sec(0.2), 0.018)), 0.35);
    add(
      burst(random, {
        seconds: 0.15,
        attack: 0.01,
        halfLife: 0.03,
        chain: [{ type: "bandpass", freq: 3200 * scale, q: 0.8 }],
      }),
      0.05,
    );
  } else if (surface === "wood") {
    // A hollow knock: a click, then the board's body resonances.
    add(
      burst(random, {
        seconds: 0.03,
        halfLife: 0.0015,
        chain: [{ type: "highpass", freq: 1800 }],
      }),
      0.45,
    );
    add(ping(185 * scale, 0.028, 0.25), 0.75);
    add(ping(640 * scale, 0.012, 0.15), 0.35);
    add(ping(1180 * scale, 0.006, 0.1), 0.2);
    add(
      burst(random, {
        seconds: 0.1,
        halfLife: 0.01,
        colour: "pink",
        chain: [{ type: "bandpass", freq: 420 * scale, q: 1.1 }],
      }),
      0.6,
    );
  } else {
    // A hard heel on ceramic: a bright click and a short glassy ring.
    add(
      burst(random, {
        seconds: 0.04,
        halfLife: 0.0025,
        chain: [{ type: "bandpass", freq: 3600 * scale, q: 1.2 }],
      }),
      1,
    );
    add(ping(2450 * scale, 0.005, 0.06), 0.35);
    add(ping(5300 * scale, 0.003, 0.04), 0.2);
    add(ping(115 * scale, 0.01, 0.1), 0.3);
  }
  return out;
}

/** A footstep recipe for `surface`, variant 1–3. */
export function footstep(surface: Surface, variant: 1 | 2 | 3): SfxRecipe {
  const floor = {
    carpet: "the Hall's patterned carpet",
    wood: "wooden floorboards (the pub and the office)",
    tile: "the Sorrento kitchen's majolica tiles",
  }[surface];
  return {
    task: "A2",
    description: `Footstep on ${floor}, variant ${variant} of 3: heel then toe.`,
    seconds: SECONDS,
    seed: { carpet: 100, wood: 200, tile: 300 }[surface] + variant,
    render: (ctx) => {
      const r = ctx.random;
      const scale = between(r, 0.94, 1.06);
      const gap = between(r, 0.055, 0.095);
      const toe = between(r, 0.4, 0.65);
      let step = new Float32Array(ctx.frames);
      mix(step, strikeOn(surface, r, scale), sec(0.004));
      mix(
        step,
        strikeOn(surface, r, scale * between(r, 1.02, 1.1)),
        sec(0.004 + gap),
        {
          level: toe,
        },
      );
      if (surface === "tile") {
        // The kitchen is small and hard: a close reflection and a little room.
        step = reverb(echo(step, 0.017, 0.25, 0.3), {
          size: 0.2,
          damp: 0.5,
          wet: 0.12,
        });
      } else if (surface === "wood") {
        step = reverb(step, { size: 0.25, damp: 0.6, wet: 0.08 });
      }
      return [fit(step, ctx.frames)];
    },
  };
}
