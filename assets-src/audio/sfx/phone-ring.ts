/**
 * Phone ring: the Sorrento kitchen's wall phone, an electromechanical bell.
 * A hammer strikes two small gongs in turn about 20 times a second for one
 * second (one Italian ring), then the gongs ring out. Loop it with a gap in
 * the engine for a phone that keeps ringing.
 */
import { mix, reverb, tone, type SfxRecipe } from "../../../scripts/assets/sfx";
import { between, fit, sec, strike } from "../lib/synth";

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Phone ring: an electromechanical bell, a hammer striking two gongs in turn about 20 times a second for 1 s, then ringing out.",
  seconds: 1.6,
  seed: 20,
  render: (ctx) => {
    const r = ctx.random;
    const out = new Float32Array(ctx.frames);
    const gongs = [930, 1015].map((base) =>
      strike(
        base,
        [
          [1, 1, 0.22],
          [2.74, 0.45, 0.12],
          [5.43, 0.2, 0.05],
          [8.9, 0.08, 0.02],
        ],
        0.7,
      ),
    );
    const strokes = 21;
    for (let k = 0; k < strokes; k++) {
      const at = 0.01 + k * 0.048 + between(r, -0.002, 0.002);
      mix(out, gongs[k % 2], sec(at), { level: between(r, 0.18, 0.24) });
    }
    // The hammer's own buzz while it's driven.
    const buzz = tone(sec(1.02), 21, "square");
    mix(out, buzz, sec(0.01), { level: 0.01 });
    return [fit(reverb(out, { size: 0.25, damp: 0.5, wet: 0.12 }), ctx.frames)];
  },
};

export default recipe;
