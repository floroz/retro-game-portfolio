/**
 * The shared motif, "the boarding call".
 *
 * Every track varies this phrase, iMUSE style, so the four places sound like
 * one game. Written in F major, two bars of 4/4, in quarter-note beats:
 *
 *     bar 1:  A4 (1/2)  C5 (1/2)  F5 (1)  E5 (1/2)  C5 (1)  A4 (1/2)
 *     bar 2:  Bb4 (1/2) A4 (1/2)  G4 (2)  rest (1)
 *     degree: 3 5 1 7 5 3 | 4 3 2
 *
 * - Bar 1 climbs the major triad (the three-note airport chime) to the top
 *   F, leans on the major seventh (E), and falls back: an arch over Fmaj7.
 * - Bar 2 sighs down by step to the second degree (G) and stops there, a
 *   question the next phrase answers.
 *
 * Varying it: transpose it, re-rhythm it in 6/8 (A C F | E C A | Bb A G), give
 * the head alone to a bell or a music box, or answer it differently. The
 * contour (up the triad, down by step) is what makes it recognisable.
 */
import { phrase, type PhraseOptions } from "../../../scripts/assets/music";

export const MOTIF_KEY = "F major";

/** The motif as phrase text (see `phrase` in scripts/assets/music.ts). */
export const MOTIF =
  "A4:.5 C5:.5 F5:1 E5:.5 C5:1 A4:.5 | Bb4:.5 A4:.5 G4:2 r:1";

/** The motif's head, the rising triad: on its own it works as a chime. */
export const MOTIF_HEAD = "A4:1 C5:1 F5:1";

/** The motif as notes, starting at `options.at` beats. */
export const motif = (options?: PhraseOptions) => phrase(MOTIF, options);
