/**
 * Travel sting: the plane crossing the map.
 *
 * Two seconds of the shared motif (motif.ts): its first bar, A C F E C,
 * which then lands on F instead of falling back to A, so the trip arrives.
 * Vibraphone and flute in unison, as in the Hall theme, over a string swell,
 * a harp run, and a fretless-bass F. It doesn't loop.
 *
 * F major, 120 bpm, 4/4, 1 bar (2 s), plus the natural ring-out.
 */
import { GM, phrase, type MusicTrack } from "../../../scripts/assets/music";

/** The motif's first bar with its last note moved home. */
const TUNE = "A4:.5 C5:.5 F5:1 E5:.5 C5:.5 F5:1";

const track: MusicTrack = {
  id: "travel-sting",
  task: "A2",
  title: "Bon Voyage (travel sting)",
  description:
    "Travel-map sting: the shared motif's first bar (assets-src/audio/music/motif.ts), landing on F, for the plane crossing the map.",
  bpm: 120,
  bars: 1,
  key: "F major",
  loop: false,
  sections: [
    {
      bar: 1,
      name: "Sting",
      description:
        "Motif head A C F E C, landing on F; vibraphone and flute over a string swell, harp run, and bass",
    },
  ],
  parts: [
    {
      name: "Vibraphone",
      channel: 1,
      program: GM["Vibraphone"],
      volume: 104,
      pan: 74,
      reverb: 60,
      notes: phrase(TUNE, { transpose: 12, velocity: 92 }),
    },
    {
      name: "Flute",
      channel: 2,
      program: GM["Flute"],
      volume: 60,
      pan: 54,
      reverb: 60,
      notes: phrase(TUNE, { transpose: 12, velocity: 84 }),
    },
    {
      name: "Harp",
      channel: 3,
      program: GM["Orchestral Harp"],
      volume: 70,
      pan: 40,
      reverb: 70,
      notes: phrase(
        "F3:.25 A3:.25 C4:.25 F4:.25 A4:.25 C5:.25 F5:.25 A5:2.25",
        { velocity: 64 },
      ),
    },
    {
      name: "Strings",
      channel: 4,
      program: GM["String Ensemble 1"],
      volume: 58,
      pan: 84,
      reverb: 70,
      notes: phrase("A3+C4+F4:4", { velocity: 60 }),
      // A swell: expression from soft to full across the bar.
      controllers: [0, 1, 2, 3].map((beat) => ({
        beat,
        controller: 11,
        value: 60 + beat * 20,
      })),
    },
    {
      name: "Fretless bass",
      channel: 5,
      program: GM["Fretless Bass"],
      volume: 70,
      pan: 64,
      reverb: 12,
      notes: phrase("F2:2 C2:1 F2:1", { velocity: 88 }),
    },
  ],
};

export default track;
