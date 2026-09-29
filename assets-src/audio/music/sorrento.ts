/**
 * Sorrento theme: a kitchen over the Gulf of Naples (docs/art-spec.md, Audio).
 *
 * A light Neapolitan tarantella in 6/8: mandolin tremolo over a nylon
 * guitar's "um-pa-pa" and an upright bass, with an accordion for the minor
 * strain. The shared motif (motif.ts) comes home to F, re-rhythmed into
 * running eighths (A C F E C A | Bb A G), and the minor strain opens with
 * the same motif in D minor (F A D C# A F | G F E).
 *
 * The mandolin and the accordion are FluidR3_GM's real instruments outside
 * General MIDI: the Mandolin (bank 16) and the Italian Accordion (bank 8).
 * The mandolin is played the way a mandolin sustains: every note longer than
 * an eighth is a tremolo of alternating sixteenth-note strokes.
 *
 * F major (with a D minor strain), 160 bpm (a dotted quarter about 107),
 * 6/8, 56 bars (63 s):
 *
 * - Intro (1–4): guitar, bass, and tambourine vamp on F–C7.
 * - A (5–20): the motif on mandolin, sequenced on B-flat; ends on F.
 * - B (21–36): the accordion's strain in D minor, opening with the motif in
 *   minor; it pivots to C7 to come home.
 * - A' (37–52): the mandolin again, the accordion a third below it, as
 *   Neapolitan duets do.
 * - Tag (53–56): the motif passed between mandolin and accordion, and a run
 *   back into the vamp at bar 1.
 */
import {
  DRUMS,
  DRUM_KITS,
  FLUIDR3_PRESETS,
  GM,
  noteToMidi,
  phrase,
  type MusicTrack,
  type Note,
} from "../../../scripts/assets/music";

/** Quarter-note beats per 6/8 bar. */
const BAR = 3;
const BARS = 56;
const at = (bar: number, beat = 0) => (bar - 1) * BAR + beat;
const opts = (bar: number, velocity: number) => ({
  at: at(bar),
  velocity,
  barBeats: BAR,
});

// --- Harmony -------------------------------------------------------------------------

/** Bass root and fifth, and the guitar's "pa" voicing. */
const CHORDS: Record<string, { root: string; fifth: string; pa: string }> = {
  F: { root: "F2", fifth: "C2", pa: "F3+A3+C4" },
  C7: { root: "C2", fifth: "G2", pa: "E3+G3+Bb3+C4" },
  Bb: { root: "Bb1", fifth: "F2", pa: "F3+Bb3+D4" },
  Dm: { root: "D2", fifth: "A1", pa: "F3+A3+D4" },
  A7: { root: "A1", fifth: "E2", pa: "E3+G3+C#4" },
  Gm: { root: "G1", fifth: "D2", pa: "G3+Bb3+D4" },
};

const A_CHART = "F C7 C7 F Bb F C7 C7 F C7 C7 F Bb F C7 F";
const CHART = [
  "F C7 F C7", // Intro
  A_CHART, // A
  "Dm A7 A7 Dm Dm Gm A7 Dm Dm A7 A7 Dm Dm Gm A7 C7", // B
  A_CHART, // A'
  "F C7 F C7", // Tag
]
  .join(" ")
  .split(" ");

const chords = CHART.map((name, i) => ({ name, start: i * BAR }));

const notesOf = (
  src: string,
  start: number,
  beats: number,
  velocity: number,
): Note[] =>
  src.split("+").map((n) => ({ pitch: noteToMidi(n), start, beats, velocity }));

// --- Tune ----------------------------------------------------------------------------

/** The motif in 6/8 running eighths: A C F E C A | Bb A G (held). */
const MOTIF_6_8 = "A4:.5 C5:.5 F5:.5 E5:.5 C5:.5 A4:.5 | Bb4:.5 A4:.5 G4:2";

/** A: the motif, an answer, the motif sequenced on B-flat, and a half close. */
const A_FIRST = `${MOTIF_6_8} |
  G4:.5 Bb4:.5 E5:.5 D5:.5 Bb4:.5 G4:.5 | A4:.5 Bb4:.5 C5:.5 F4:1.5 |
  D5:.5 F5:.5 Bb5:.5 A5:.5 F5:.5 D5:.5 | C5:.5 Bb4:.5 A4:.5 A4:1.5 |`;
const A_HALF = `Bb4:.5 A4:.5 G4:.5 D5:.5 C5:.5 Bb4:.5 | G4:1.5 E4:.5 F4:.5 G4:.5 |`;
const A_CLOSE = `G4:.5 A4:.5 Bb4:.5 C5:.5 D5:.5 E5:.5 | F5:1.5 r:1.5`;
const A_TUNE = `${A_FIRST} ${A_HALF} ${A_FIRST} ${A_CLOSE}`;

/** B: the motif in D minor (F A D C# A F | G F E), then a running strain. */
const B_FIRST = `
  F4:.5 A4:.5 D5:.5 C#5:.5 A4:.5 F4:.5 | G4:.5 F4:.5 E4:2 |
  E4:.5 G4:.5 C#5:.5 Bb4:.5 G4:.5 E4:.5 | F4:.5 E4:.5 D4:.5 D4:1.5 |
  F4:.5 A4:.5 D5:.5 F5:.5 E5:.5 D5:.5 | D5:.5 Bb4:.5 G4:.5 G5:1.5 |`;
const B_TUNE = `${B_FIRST}
  E5:.5 F5:.5 E5:.5 C#5:.5 Bb4:.5 A4:.5 | D5:1.5 r:1.5 | ${B_FIRST}
  E5:.5 C#5:.5 A4:.5 G4:.5 E4:.5 C#4:.5 | C5:.5 Bb4:.5 G4:.5 E4:.5 G4:.5 Bb4:.5`;

/**
 * Mandolin sustain: a note longer than an eighth becomes a tremolo of
 * sixteenth-note strokes, down strokes a little louder than up strokes.
 */
const tremolo = (notes: Note[]): Note[] =>
  notes.flatMap((n) => {
    if (n.beats <= 0.5) return [n];
    const strokes = Math.round(n.beats / 0.25);
    const v = n.velocity ?? 90;
    return Array.from({ length: strokes }, (_, k) => ({
      pitch: n.pitch,
      start: n.start + k * 0.25,
      beats: 0.25,
      velocity: k === 0 ? v : k % 2 ? v - 16 : v - 8,
    }));
  });

/** F major pitch classes, for the accordion's parallel thirds. */
const F_MAJOR = new Set([5, 7, 9, 10, 0, 2, 4]);
/** Move a pitch down `steps` degrees of F major. */
const diatonicDown = (pitch: number, steps: number) => {
  let p = pitch;
  for (let s = 0; s < steps; s++) {
    p--;
    while (!F_MAJOR.has(p % 12)) p--;
  }
  return p;
};

/** Downbeats (each dotted quarter) a little stronger. */
const lilt = (notes: Note[], by = 8): Note[] =>
  notes.map((n) =>
    n.start % 1.5 === 0 && n.velocity !== undefined
      ? { ...n, velocity: Math.min(127, n.velocity + by) }
      : n,
  );

const aTune = (bar: number, velocity: number) =>
  lilt(phrase(A_TUNE, opts(bar, velocity)));

const mandolin = tremolo([
  ...aTune(5, 88),
  ...aTune(37, 92),
  // Tag: the motif's head, then its whole first bar.
  ...phrase("A4:.5 C5:.5 F5:.5 r:1.5", opts(53, 94)),
  ...phrase("A4:.5 C5:.5 F5:.5 E5:.5 C5:.5 A4:.5", opts(55, 94)),
]);

const accordion = [
  ...lilt(phrase(B_TUNE, opts(21, 84))),
  // A': a third below the mandolin, softer.
  ...aTune(37, 50).map((n) => ({ ...n, pitch: diatonicDown(n.pitch, 2) })),
  // Tag: the answer (E C A), then the motif's sigh as a run into bar 1.
  ...phrase("E5:.5 C5:.5 A4:.5 r:1.5", opts(54, 84)),
  ...phrase("Bb4:.5 A4:.5 G4:.5 E4:.5 G4:.5 Bb4:.5", opts(56, 80)),
];

// --- Accompaniment -------------------------------------------------------------------

/** Upright bass: root on the first dotted quarter, fifth on the second. */
const bass: Note[] = chords.flatMap(({ name, start }) => {
  const c = CHORDS[name];
  return [
    { pitch: noteToMidi(c.root), start, beats: 0.9, velocity: 88 },
    {
      pitch: noteToMidi(c.fifth),
      start: start + 1.5,
      beats: 0.9,
      velocity: 76,
    },
  ];
});

/** Nylon guitar "pa-pa" on the second and third eighth of each half-bar. */
const guitar: Note[] = chords.flatMap(({ name, start }) =>
  [0.5, 1, 2, 2.5].flatMap((beat, k) =>
    notesOf(CHORDS[name].pa, start + beat, 0.35, k % 2 ? 46 : 54),
  ),
);

// --- Percussion ----------------------------------------------------------------------

const drums: Note[] = [];
const hit = (key: number, start: number, velocity: number) =>
  drums.push({ pitch: key, start, beats: 0.25, velocity });
for (let bar = 1; bar <= BARS; bar++) {
  const b = at(bar);
  hit(DRUMS.tambourine, b, 66);
  hit(DRUMS.tambourine, b + 1.5, 56);
  // From A on, the tambourine shakes the in-between eighths too.
  if (bar >= 5)
    for (const e of [0.5, 1, 2, 2.5]) hit(DRUMS.tambourine, b + e, 30);
}

const track: MusicTrack = {
  id: "sorrento",
  task: "E2",
  title: "Tarantella del Golfo (Sorrento theme)",
  description:
    "Sorrento theme: a light Neapolitan tarantella in 6/8 for mandolin (tremolo), Italian accordion, nylon guitar, and upright bass, with the shared motif (assets-src/audio/music/motif.ts) home in F and, in the strain, in D minor. Composed in A2; E2 swapped the General MIDI stand-ins for FluidR3_GM's Mandolin (bank 16) and Italian Accordion (bank 8).",
  bpm: 160,
  meter: [6, 8],
  bars: BARS,
  key: "F major (D minor strain)",
  sections: [
    {
      bar: 1,
      name: "Intro",
      description: "Guitar, bass, and tambourine vamp on F–C7",
    },
    {
      bar: 5,
      name: "A",
      description:
        "Motif on mandolin in 6/8 running eighths, sequenced on B-flat; ends on F",
    },
    {
      bar: 21,
      name: "B",
      description:
        "Accordion strain in D minor, opening with the motif in minor; pivots to C7",
    },
    {
      bar: 37,
      name: "A'",
      description: "Mandolin tune with the accordion a third below",
    },
    {
      bar: 53,
      name: "Tag",
      description:
        "Motif passed between mandolin (A C F) and accordion (E C A), run back into the vamp",
    },
  ],
  parts: [
    {
      name: "Mandolin",
      channel: 1,
      ...FLUIDR3_PRESETS["Mandolin"],
      // 110 and 104 keep the A2 balance: each stem measures within 0.1 LU of
      // the General MIDI stand-in it replaces.
      volume: 110,
      pan: 76,
      reverb: 40,
      notes: mandolin,
    },
    {
      name: "Italian accordion",
      channel: 2,
      ...FLUIDR3_PRESETS["Italian Accordion"],
      volume: 104,
      pan: 48,
      reverb: 44,
      notes: accordion,
    },
    {
      name: "Nylon guitar",
      channel: 3,
      program: GM["Acoustic Guitar (nylon)"],
      volume: 74,
      pan: 56,
      reverb: 30,
      notes: guitar,
    },
    {
      name: "Upright bass",
      channel: 4,
      program: GM["Acoustic Bass"],
      volume: 84,
      pan: 64,
      reverb: 20,
      notes: bass,
    },
    {
      name: "Tambourine",
      channel: 10,
      program: DRUM_KITS.standard,
      volume: 56,
      pan: 88,
      reverb: 30,
      notes: drums,
    },
  ],
};

export default track;
