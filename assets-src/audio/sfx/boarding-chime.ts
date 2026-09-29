/**
 * Boarding chime: the motif's head, A C F (MOTIF_HEAD in
 * assets-src/audio/music/motif.ts), on General MIDI tubular bells at the
 * Hall theme's tempo, rendered through the same FluidSynth and soundfont as
 * the music, so it is the very bell that ends the Hall theme's A' section.
 */
import { GM, SAMPLE_RATE, phrase } from "../../../scripts/assets/music";
import type { SfxRecipe } from "../../../scripts/assets/sfx";
import { MOTIF_HEAD } from "../music/motif";
import { fit, renderGm, trimTail } from "../lib/synth";

/** The chime as mono samples; the Hall ambience reuses it. */
export const bell = trimTail(
  await renderGm({
    id: "boarding-chime",
    program: GM["Tubular Bells"],
    notes: phrase(MOTIF_HEAD, { velocity: 96 }),
    bpm: 100,
    beats: 4,
    reverbSend: 80,
  }),
  -50,
  0.3,
);

const recipe: SfxRecipe = {
  task: "A2",
  description:
    "Boarding chime: the motif's head (A4 C5 F5) on General MIDI tubular bells at 100 bpm, rendered with FluidSynth and FluidR3_GM like the Hall theme.",
  seconds: bell.length / SAMPLE_RATE,
  seed: 13,
  render: (ctx) => [fit(bell, ctx.frames)],
};

export default recipe;
