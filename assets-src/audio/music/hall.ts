/**
 * Hall theme: a 1990s airport departure lounge (docs/art-spec.md, Audio).
 *
 * Easy-listening bossa nova, the kind that played under the flight monitors:
 * vibraphone and flute over a Rhodes, fretless bass, and brushes. It
 * introduces the shared motif (motif.ts) in its first two bars.
 *
 * F major, 100 bpm, 4/4, 32 bars (76.8 s), AABA:
 *
 * - A (1–8): the motif on vibraphone, then two sequences of it (on Dm7 and,
 *   a fourth up, on Bbmaj7). Rhodes, bass, kick, and a side-stick bossa clave.
 * - A' (9–16): the flute takes the tune and the hi-hat joins. It cadences on
 *   F, and the tubular bells play the motif's head (A C F) as the terminal's
 *   boarding chime.
 * - B (17–24): the bridge, in B-flat with a minor iv (Bbm6); vibraphone,
 *   strings enter, ride cymbal.
 * - A'' (25–32): the motif returns on vibraphone over the strings. The
 *   turnaround (Fmaj7–C7) and a C–Bb pickup lead back to bar 1.
 */
import {
  DRUMS,
  DRUM_KITS,
  GM,
  noteToMidi,
  phrase,
  type MusicTrack,
  type Note,
} from "../../../scripts/assets/music";
import { MOTIF, MOTIF_HEAD } from "./motif";

const BAR = 4;
const at = (bar: number, beat = 0) => (bar - 1) * BAR + beat;

// --- Harmony -------------------------------------------------------------------------

/** Bass root, and a rootless Rhodes voicing kept below the tune. */
const CHORDS: Record<string, { root: string; voicing: string }> = {
  Fmaj7: { root: "F2", voicing: "A3+C4+E4+G4" },
  F7: { root: "F2", voicing: "A3+C4+Eb4+G4" },
  Gm7: { root: "G2", voicing: "Bb3+D4+F4+A4" },
  C7: { root: "C2", voicing: "Bb3+D4+E4+A4" },
  Dm7: { root: "D2", voicing: "C4+E4+F4+A4" },
  Bbmaj7: { root: "Bb1", voicing: "A3+C4+D4+F4" },
  Bbm6: { root: "Bb1", voicing: "G3+Bb3+Db4+F4" },
  Am7: { root: "A1", voicing: "G3+B3+C4+E4" },
  D7: { root: "D2", voicing: "F#3+B3+C4+E4" },
};

/** One entry per bar; two chords split the bar in half. */
// prettier-ignore
const CHART = [
  // A
  "Fmaj7", "Gm7 C7", "Dm7", "Gm7 C7", "Bbmaj7", "Am7 D7", "Gm7", "C7",
  // A'
  "Fmaj7", "Gm7 C7", "Dm7", "Gm7 C7", "Bbmaj7", "Am7 D7", "Gm7 C7", "Fmaj7 F7",
  // B
  "Bbmaj7", "Bbm6", "Am7", "D7", "Gm7", "C7", "Am7 D7", "Gm7 C7",
  // A''
  "Fmaj7", "Gm7 C7", "Dm7", "Gm7 C7", "Bbmaj7", "Am7 D7", "Gm7 C7", "Fmaj7 C7",
];

/** Each chord with its start and length in beats. */
const chords = CHART.flatMap((bar, i) => {
  const names = bar.split(" ");
  const len = BAR / names.length;
  return names.map((name, j) => ({
    name,
    start: i * BAR + j * len,
    beats: len,
  }));
});

const notesOf = (
  src: string,
  start: number,
  beats: number,
  velocity: number,
): Note[] =>
  src.split("+").map((n) => ({ pitch: noteToMidi(n), start, beats, velocity }));

// --- Tune ----------------------------------------------------------------------------

/** Bars 3–8: the answer, then the motif sequenced on Bbmaj7 and Gm7. */
const A_REST = `
  A4:.5 C5:.5 F5:1 G5:.5 F5:1 D5:.5 | E5:.5 D5:.5 C5:2 r:1 |
  D5:.5 F5:.5 Bb5:1 A5:.5 F5:1 D5:.5 | E5:.5 D5:.5 C5:2 r:1 |`;
const A_END =
  "Bb4:.5 D5:.5 G5:1 F5:.5 D5:1 Bb4:.5 | C5:.5 Bb4:.5 G4:1 E4:1 r:1";
const A_CADENCE = "Bb4:.5 D5:.5 G5:1 F5:.5 E5:1 C5:.5";
const BRIDGE = `
  D5:1.5 C5:.5 D5:1 F5:1 | F5:1.5 Db5:.5 C5:2 | C5:1.5 A4:.5 E5:2 | D5:1 C5:.5 A4:.5 F#4:2 |
  G4:.5 Bb4:.5 D5:1 F5:.5 D5:1 Bb4:.5 | A4:.5 G4:.5 E4:2 r:1 |
  C5:.5 E5:.5 A5:1 G5:.5 F#5:1 D5:.5 | Bb4:.5 A4:.5 G4:1 E4:.5 G4:.5 Bb4:1`;

/** The lead sounds an octave above where it's written. */
const LEAD = { transpose: 12 };

/** A little weight on each bar's downbeat. */
const accent = (notes: Note[], by = 10): Note[] =>
  notes.map((n) =>
    n.start % BAR === 0 && n.velocity !== undefined
      ? { ...n, velocity: Math.min(127, n.velocity + by) }
      : n,
  );

const vibes = accent([
  // A: bars 1–8
  ...phrase(`${MOTIF} | ${A_REST} ${A_END}`, {
    ...LEAD,
    at: at(1),
    velocity: 88,
  }),
  // B and A'': bars 17–32
  ...phrase(BRIDGE, { ...LEAD, at: at(17), velocity: 84 }),
  ...phrase(`${MOTIF} | ${A_REST} ${A_CADENCE} | F5:2 r:1 C5:.5 Bb4:.5`, {
    ...LEAD,
    at: at(25),
    velocity: 88,
  }),
]);

const flute = accent([
  // A': bars 9–16
  ...phrase(`${MOTIF} | ${A_REST} ${A_CADENCE} | F5:1 r:3`, {
    ...LEAD,
    at: at(9),
    velocity: 84,
  }),
]);

/** The boarding chime: the motif's head, on beats 2–4 of bar 16. */
const bells = phrase(MOTIF_HEAD, { at: at(16, 1), velocity: 80 });

// --- Accompaniment -------------------------------------------------------------------

/** Bossa bass: root and fifth, a dotted quarter and an eighth per chord. */
const bass: Note[] = chords.flatMap(({ name, start, beats }) => {
  const root = noteToMidi(CHORDS[name].root);
  const fifth = root + 7;
  const half = beats === 2;
  return half
    ? [
        { pitch: root, start, beats: 1.4, velocity: 92 },
        { pitch: fifth, start: start + 1.5, beats: 0.45, velocity: 74 },
      ]
    : [
        { pitch: root, start, beats: 1.4, velocity: 92 },
        { pitch: fifth, start: start + 1.5, beats: 0.45, velocity: 72 },
        { pitch: fifth, start: start + 2, beats: 1.4, velocity: 82 },
        { pitch: root, start: start + 3.5, beats: 0.45, velocity: 70 },
      ];
});

/** Rhodes comping: on the beat, then an off-beat push; one hit per half-bar chord. */
const rhodes: Note[] = chords.flatMap(({ name, start, beats }) => {
  const v = CHORDS[name].voicing;
  return beats === 2
    ? notesOf(v, start, 1.25, 56)
    : [...notesOf(v, start, 1.25, 58), ...notesOf(v, start + 2.5, 1.25, 50)];
});

/** Strings hold each chord through B and A'' (bars 17–32). */
const strings: Note[] = chords
  .filter((c) => c.start >= at(17))
  .flatMap(({ name, start, beats }) =>
    notesOf(CHORDS[name].voicing, start, beats, 62),
  );

// --- Drums (brush kit) -----------------------------------------------------------------

const drums: Note[] = [];
const hit = (key: number, start: number, velocity: number, beats = 0.25) =>
  drums.push({ pitch: key, start, beats, velocity });
for (let bar = 1; bar <= 32; bar++) {
  const b = at(bar);
  hit(DRUMS.kick, b, 64);
  hit(DRUMS.kick, b + 2, 52);
  // Bossa clave on the side stick, two bars long: 1, 2&, 4 | 2, 3&.
  const clave = bar % 2 === 1 ? [0, 1.5, 3] : [1, 2.5];
  for (const beat of clave) hit(DRUMS.sideStick, b + beat, 58);
  const inBridge = bar >= 17 && bar <= 24;
  const hats = (bar >= 9 && bar <= 16) || bar >= 25;
  for (let e = 0; e < 8; e++) {
    if (inBridge) hit(DRUMS.ride, b + e / 2, e % 2 ? 40 : 50, 0.5);
    else if (hats) hit(DRUMS.closedHat, b + e / 2, e % 2 ? 46 : 34);
  }
}

const track: MusicTrack = {
  id: "hall",
  task: "A1",
  title: "Departures (Hall theme)",
  description:
    "Hall theme: 1990s airport-lounge bossa nova that introduces the shared motif (assets-src/audio/music/motif.ts).",
  bpm: 100,
  bars: 32,
  key: "F major",
  sections: [
    {
      bar: 1,
      name: "A",
      description:
        "Motif on vibraphone; Rhodes, fretless bass, kick and side-stick clave",
    },
    {
      bar: 9,
      name: "A'",
      description:
        "Flute takes the tune, hi-hat joins; bar 16 ends on the boarding chime (tubular bells: A C F)",
    },
    {
      bar: 17,
      name: "B",
      description:
        "Bridge in B-flat with a minor iv (Bbm6); vibraphone, strings enter, ride cymbal",
    },
    {
      bar: 25,
      name: "A''",
      description:
        "Motif returns over strings; Fmaj7–C7 turnaround and a C–Bb pickup back to bar 1",
    },
  ],
  parts: [
    {
      name: "Vibraphone (lead)",
      channel: 1,
      program: GM["Vibraphone"],
      volume: 110,
      pan: 74,
      reverb: 56,
      notes: vibes,
    },
    {
      name: "Flute (lead, A')",
      channel: 2,
      program: GM["Flute"],
      volume: 50,
      pan: 54,
      reverb: 60,
      notes: flute,
    },
    {
      name: "Rhodes",
      channel: 3,
      program: GM["Electric Piano 1"],
      volume: 52,
      pan: 46,
      reverb: 44,
      notes: rhodes,
    },
    {
      name: "Fretless bass",
      channel: 4,
      program: GM["Fretless Bass"],
      volume: 63,
      pan: 64,
      reverb: 12,
      notes: bass,
    },
    {
      name: "Boarding chime",
      channel: 5,
      program: GM["Tubular Bells"],
      volume: 64,
      pan: 40,
      reverb: 80,
      notes: bells,
    },
    {
      name: "Strings (B, A'')",
      channel: 6,
      program: GM["String Ensemble 1"],
      volume: 44,
      pan: 84,
      reverb: 70,
      notes: strings,
    },
    {
      name: "Brushes",
      channel: 10,
      program: DRUM_KITS.brush,
      volume: 82,
      pan: 64,
      reverb: 30,
      notes: drums,
    },
  ],
};

export default track;
