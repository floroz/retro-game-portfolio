/**
 * Zurich theme: the office at night, over the lake (docs/art-spec.md, Audio).
 *
 * A slow music-box waltz, as if someone left a souvenir wound up on the
 * desk: the shared motif (motif.ts) re-rhythmed in 3/4, one note per beat
 * (B D G | F# D B | C B A, the motif a tone up in G), over a soft string
 * pad and an upright bass. The bridge turns to E minor and gives the tune
 * to a cello, with the music box sparkling above it.
 *
 * G major, 80 bpm, 3/4, 32 bars (72 s), AABA:
 *
 * - A (1–8): the motif on music box, then its head sequenced on Em7 and
 *   Cmaj7 (the Cmaj7 lifts to a Lydian F#). Upright bass on beat 1; the
 *   string pad enters at bar 5. Ends open, on D7.
 * - A' (9–16): the same with the pad throughout; it closes on G.
 * - B (17–24): the bridge in E minor (Em–Cmaj7–B7–A7–Am7–D7); cello tune,
 *   music box chord tones on beats 2 and 3, harp arpeggios.
 * - A'' (25–32): the motif returns over the pad and winds down on D7,
 *   back to bar 1.
 */
import {
  GM,
  noteToMidi,
  phrase,
  type MusicTrack,
  type Note,
} from "../../../scripts/assets/music";

const BAR = 3;
const BARS = 32;
const at = (bar: number, beat = 0) => (bar - 1) * BAR + beat;

// --- Harmony -------------------------------------------------------------------------

/** Bass root and fifth, and a close pad voicing below the tune. */
const CHORDS: Record<string, { root: string; fifth: string; pad: string }> = {
  G: { root: "G2", fifth: "D2", pad: "D4+G4+B4" },
  Bm7: { root: "B1", fifth: "F#2", pad: "D4+F#4+A4" },
  Am7: { root: "A1", fifth: "E2", pad: "C4+E4+G4" },
  D7: { root: "D2", fifth: "A1", pad: "C4+F#4+A4" },
  Em7: { root: "E2", fifth: "B1", pad: "D4+G4+B4" },
  Cmaj7: { root: "C2", fifth: "G2", pad: "E4+G4+B4" },
  Em: { root: "E2", fifth: "B1", pad: "E4+G4+B4" },
  B7: { root: "B1", fifth: "F#2", pad: "D#4+F#4+A4" },
  A7: { root: "A1", fifth: "E2", pad: "C#4+E4+G4" },
};

/** One chord per bar. */
// prettier-ignore
const CHART = [
  // A
  "G", "Bm7", "Am7", "D7", "Em7", "Cmaj7", "Am7", "D7",
  // A'
  "G", "Bm7", "Am7", "D7", "Em7", "Cmaj7", "D7", "G",
  // B
  "Em", "Em7", "Cmaj7", "B7", "Em", "A7", "Am7", "D7",
  // A''
  "G", "Bm7", "Am7", "D7", "Em7", "Cmaj7", "Am7", "D7",
];

const chords = CHART.map((name, i) => ({ name, start: i * BAR }));

const notesOf = (
  src: string,
  start: number,
  beats: number,
  velocity: number,
): Note[] =>
  src.split("+").map((n) => ({ pitch: noteToMidi(n), start, beats, velocity }));

// --- Tune ----------------------------------------------------------------------------

/** The motif in G, one note per beat: B D G | F# D B | C B A (held). */
const MOTIF_WALTZ =
  "B4:1 D5:1 G5:1 | F#5:1 D5:1 B4:1 | C5:1 B4:1 A4:1 | A4:2 r:1";
/** Bars 5–8: the head sequenced on Em7 and Cmaj7, then down to D7. */
const A_OPEN =
  "B4:1 E5:1 G5:1 | F#5:1 E5:1 C5:1 | C5:1 B4:1 A4:1 | A4:1 F#4:1 D4:1";
const A_HOME = "B4:1 E5:1 G5:1 | F#5:1 E5:1 C5:1 | C5:1 B4:1 A4:1 | G4:3";
const A_WIND = "B4:1 E5:1 G5:1 | F#5:1 E5:1 C5:1 | C5:1 B4:1 A4:1 | A4:2 r:1";

/** The music box sounds an octave above where it's written. */
const BOX = { transpose: 12, barBeats: BAR };

/** A breath of weight on each downbeat, the way a music-box cylinder plays. */
const accent = (notes: Note[], by = 8): Note[] =>
  notes.map((n) =>
    n.start % BAR === 0 && n.velocity !== undefined
      ? { ...n, velocity: Math.min(127, n.velocity + by) }
      : n,
  );

const musicBox = accent([
  ...phrase(`${MOTIF_WALTZ} | ${A_OPEN}`, { ...BOX, at: at(1), velocity: 78 }),
  ...phrase(`${MOTIF_WALTZ} | ${A_HOME}`, { ...BOX, at: at(9), velocity: 78 }),
  ...phrase(`${MOTIF_WALTZ} | ${A_WIND}`, { ...BOX, at: at(25), velocity: 80 }),
]);

/** Bridge sparkle: the top two chord tones of each bar on beats 2 and 3. */
const sparkle: Note[] = chords
  .filter((c) => c.start >= at(17) && c.start < at(25))
  .flatMap(({ name, start }) => {
    const [, mid, top] = CHORDS[name].pad.split("+").map(noteToMidi);
    return [
      { pitch: mid + 24, start: start + 1, beats: 1, velocity: 52 },
      { pitch: top + 24, start: start + 2, beats: 1, velocity: 48 },
    ];
  });

/** Bridge tune, cello, an octave below where it's written. */
const cello = phrase(
  `G4:2 F#4:1 | E4:2 B3:1 | C4:2 E4:1 | D#4:3 |
   E4:2 G4:1 | E4:2 C#4:1 | C4:2 A3:1 | F#3:1 A3:1 C4:1`,
  { at: at(17), transpose: -12, velocity: 80, barBeats: BAR },
);

// --- Accompaniment -------------------------------------------------------------------

/** Upright bass: the root on beat 1, and the fifth on beat 3 every other bar. */
const bass: Note[] = chords.flatMap(({ name, start }, i) => {
  const c = CHORDS[name];
  const root = { pitch: noteToMidi(c.root), start, beats: 1.8, velocity: 78 };
  return i % 2 === 1
    ? [
        root,
        {
          pitch: noteToMidi(c.fifth),
          start: start + 2,
          beats: 0.9,
          velocity: 62,
        },
      ]
    : [{ ...root, beats: 2.8 }];
});

/** String pad, one chord per bar, from bar 5 on. */
const pad: Note[] = chords
  .filter((c) => c.start >= at(5))
  .flatMap(({ name, start }) => notesOf(CHORDS[name].pad, start, BAR, 58));

/** Harp in the bridge: a rising arpeggio across each bar, low to high. */
const harp: Note[] = chords
  .filter((c) => c.start >= at(17) && c.start < at(25))
  .flatMap(({ name, start }) => {
    const [a, b, c] = CHORDS[name].pad.split("+").map(noteToMidi);
    return [a - 12, b - 12, c - 12, a, b, c].map((pitch, k) => ({
      pitch,
      start: start + k * 0.5,
      beats: 3 - k * 0.5,
      velocity: 46 + k * 2,
    }));
  });

const track: MusicTrack = {
  id: "zurich",
  task: "A2",
  title: "Night Shift (Zurich theme)",
  description:
    "Zurich theme: a slow music-box waltz over soft strings for the office at night, the shared motif (assets-src/audio/music/motif.ts) a tone up in G and re-rhythmed in 3/4.",
  bpm: 80,
  meter: [3, 4],
  bars: BARS,
  key: "G major",
  sections: [
    {
      bar: 1,
      name: "A",
      description:
        "Motif on music box in 3/4, head sequenced on Em7 and Cmaj7; upright bass, pad from bar 5; ends on D7",
    },
    {
      bar: 9,
      name: "A'",
      description: "The same over the string pad, closing on G",
    },
    {
      bar: 17,
      name: "B",
      description:
        "Bridge in E minor: cello tune, music-box chord tones on beats 2 and 3, harp arpeggios",
    },
    {
      bar: 25,
      name: "A''",
      description: "Motif returns and winds down on D7, back to bar 1",
    },
  ],
  parts: [
    {
      name: "Music box (tune)",
      channel: 1,
      program: GM["Music Box"],
      volume: 104,
      pan: 70,
      reverb: 72,
      notes: musicBox,
    },
    {
      name: "Music box (bridge sparkle)",
      channel: 2,
      program: GM["Music Box"],
      volume: 80,
      pan: 84,
      reverb: 80,
      notes: sparkle,
    },
    {
      name: "Cello (B)",
      channel: 3,
      program: GM["Cello"],
      volume: 70,
      pan: 50,
      reverb: 66,
      notes: cello,
    },
    {
      name: "String pad",
      channel: 4,
      program: GM["String Ensemble 2"],
      volume: 54,
      pan: 64,
      reverb: 76,
      notes: pad,
    },
    {
      name: "Upright bass",
      channel: 5,
      program: GM["Acoustic Bass"],
      volume: 78,
      pan: 60,
      reverb: 30,
      notes: bass,
    },
    {
      name: "Harp (B)",
      channel: 6,
      program: GM["Orchestral Harp"],
      volume: 60,
      pan: 40,
      reverb: 70,
      notes: harp,
    },
  ],
};

export default track;
