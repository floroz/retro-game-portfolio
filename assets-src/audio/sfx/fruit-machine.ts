/**
 * Fruit machine jingle: the pub's one-armed bandit paying out. A cheap
 * square-wave chip plays a rising run and then the shared motif's head in
 * B-flat (D F Bb, London's key), with a warbling final chord and a few
 * coins dropping into the tray.
 */
import {
  biquad,
  envelope,
  mix,
  mul,
  tone,
  type SfxRecipe,
} from "../../../scripts/assets/sfx";
import { noteToMidi } from "../../../scripts/assets/music";
import { between, fit, sec, strike } from "../lib/synth";

const hz = (name: string) => 440 * 2 ** ((noteToMidi(name) - 69) / 12);

/** `[note, start seconds, length seconds]`. */
const TUNE: [string, number, number][] = [
  // The run: up the B-flat chord in quick steps.
  ["Bb4", 0, 0.05],
  ["D5", 0.05, 0.05],
  ["F5", 0.1, 0.05],
  ["Bb5", 0.15, 0.05],
  ["D6", 0.2, 0.05],
  // The motif's head, D F Bb, then its fall back (A F D).
  ["D5", 0.3, 0.1],
  ["F5", 0.4, 0.1],
  ["Bb5", 0.5, 0.2],
  ["A5", 0.7, 0.1],
  ["F5", 0.8, 0.1],
  ["D5", 0.9, 0.1],
];

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Fruit machine jingle: a square-wave chip plays a rising run, the motif's head in B-flat (D F Bb, then A F D), a warbling Bb chord, and coins in the tray.",
  seconds: 2,
  seed: 18,
  render: (ctx) => {
    const r = ctx.random;
    const out = new Float32Array(ctx.frames);
    for (const [name, at, seconds] of TUNE) {
      const n = sec(seconds);
      const env = envelope(n, [
        [0, 0],
        [0.003, 1],
        [seconds - 0.01, 0.7],
        [seconds, 0],
      ]);
      mix(out, mul(tone(n, hz(name), "square"), env), sec(at), { level: 0.5 });
    }
    // The payout chord: Bb D F arpeggiated at 30 notes a second, fading.
    const chord = ["Bb5", "D6", "F6"].map(hz);
    for (let k = 0; k < 24; k++) {
      const at = 1.02 + k / 30;
      const n = sec(1 / 30);
      const level = 0.45 * (1 - k / 28);
      mix(out, tone(n, chord[k % 3], "square"), sec(at), { level });
    }
    // Coins: a few small metal strikes landing in the tray.
    for (let c = 0; c < 5; c++) {
      const coin = strike(
        between(r, 3000, 4200),
        [
          [1, 1, 0.04],
          [2.7, 0.5, 0.02],
          [5.1, 0.25, 0.01],
        ],
        0.2,
      );
      mix(out, coin, sec(1.25 + c * between(r, 0.08, 0.14)), {
        level: between(r, 0.15, 0.3),
      });
    }
    return [fit(biquad(out, { type: "lowpass", freq: 5000 }), ctx.frames)];
  },
};

export default recipe;
