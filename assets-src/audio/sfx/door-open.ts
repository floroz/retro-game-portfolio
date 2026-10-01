/**
 * Door open: the handle's latch clicks back, the hinge creaks as the door
 * swings, and a breath of air comes through. The creak is stick-slip
 * friction: a train of tiny impulses whose rate wanders, through the door's
 * wooden resonances.
 */
import { biquad, mix, type SfxRecipe } from "../../../scripts/assets/sfx";
import { between, burst, filters, fit, ping, sec } from "../lib/synth";

/** Stick-slip hinge creak: `seconds` long, impulse rate following `rate(t)` Hz. */
function creak(
  random: () => number,
  seconds: number,
  rate: (t: number) => number,
) {
  const n = sec(seconds);
  const pulses = new Float32Array(n);
  let t = 0;
  while (t < seconds) {
    const i = sec(t);
    const fade = Math.sin((Math.PI * t) / seconds) ** 0.6;
    pulses[i] = (0.6 + 0.4 * random()) * fade;
    t += 1 / (rate(t) * between(random, 0.9, 1.1));
  }
  const body = filters(pulses, [{ type: "bandpass", freq: 720, q: 6 }]);
  mix(body, filters(pulses, [{ type: "bandpass", freq: 1550, q: 8 }]), 0, {
    level: 0.6,
  });
  mix(body, filters(pulses, [{ type: "bandpass", freq: 2900, q: 10 }]), 0, {
    level: 0.25,
  });
  return body;
}

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Door open: latch click, a hinge creak (stick-slip friction through wooden resonances), and a breath of air.",
  seconds: 1.3,
  seed: 11,
  render: (ctx) => {
    const r = ctx.random;
    const out = new Float32Array(ctx.frames);
    // Latch: two metallic clicks as the handle turns and the bolt clears.
    for (const [at, level] of [
      [0.01, 0.8],
      [0.09, 1],
    ] as const) {
      mix(
        out,
        burst(r, {
          seconds: 0.05,
          halfLife: 0.003,
          chain: [{ type: "bandpass", freq: 3200, q: 2 }],
        }),
        sec(at),
        { level },
      );
      mix(out, ping(1850, 0.012, 0.08), sec(at), { level: level * 0.3 });
    }
    // The creak rises in pitch as the door speeds up, then sags.
    mix(
      out,
      creak(r, 0.8, (t) => 70 + 90 * Math.sin(Math.PI * Math.min(1, t / 0.8))),
      sec(0.2),
      { level: 0.9 },
    );
    // Air: a soft, dark swish as the door swings.
    const air = burst(r, {
      seconds: 0.9,
      attack: 0.35,
      halfLife: 0.2,
      colour: "pink",
      chain: [{ type: "lowpass", freq: 600 }],
    });
    mix(out, air, sec(0.3), { level: 0.25 });
    return [fit(biquad(out, { type: "highpass", freq: 60 }), ctx.frames)];
  },
};

export default recipe;
