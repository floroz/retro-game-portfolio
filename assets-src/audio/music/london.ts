/**
 * London theme: a pub on a rainy evening (docs/art-spec.md, Audio).
 *
 * A music-hall singalong on a pub's upright: honky-tonk piano in octaves
 * over a tuba oom-pah, with a clarinet that takes a verse and then argues
 * back. The shared motif (motif.ts) is moved up a fourth to B-flat and given
 * a dotted, knees-up bounce.
 *
 * B-flat major, 120 bpm, 4/4, 36 bars (72 s), AABA plus a 4-bar tag:
 *
 * - A (1–8): the motif on honky-tonk piano in octaves, tuba on 1 and 3,
 *   piano "pah" chords on 2 and 4.
 * - A' (9–16): the clarinet sings the verse and the brushes join; it
 *   cadences home on B-flat.
 * - B (17–24): the bridge on the IV chord with a minor iv (Ebm6), then the
 *   ragtime circle G7–C7–F7. Banjo on the off-beat chords.
 * - A'' (25–32): the motif back on piano, the clarinet under it in long notes.
 * - Tag (33–36): the pub joins in: the motif's head on piano, answered by
 *   the clarinet, over a Bb–G7–Cm7–F7 turnaround that leads back to bar 1.
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

const BAR = 4;
const BARS = 36;
const at = (bar: number, beat = 0) => (bar - 1) * BAR + beat;

// --- Harmony -------------------------------------------------------------------------

/** Tuba root and fifth (oom on 1, oom on 3), and the piano's "pah" voicing. */
const CHORDS: Record<string, { root: string; fifth: string; pah: string }> = {
  Bb6: { root: "Bb1", fifth: "F2", pah: "F3+G3+Bb3+D4" },
  Cm7: { root: "C2", fifth: "G2", pah: "G3+Bb3+C4+Eb4" },
  F7: { root: "F2", fifth: "C2", pah: "F3+A3+C4+Eb4" },
  G7: { root: "G2", fifth: "D2", pah: "F3+G3+B3+D4" },
  Dm7: { root: "D2", fifth: "A1", pah: "F3+A3+C4+D4" },
  Eb6: { root: "Eb2", fifth: "Bb1", pah: "G3+Bb3+C4+Eb4" },
  Ebm6: { root: "Eb2", fifth: "Bb1", pah: "Gb3+Bb3+C4+Eb4" },
  C7: { root: "C2", fifth: "G1", pah: "E3+G3+Bb3+C4" },
};

/** One entry per bar; two chords split the bar in half. */
// prettier-ignore
const CHART = [
  // A
  "Bb6", "Cm7 F7", "Bb6", "G7", "Cm7", "F7", "Dm7 G7", "Cm7 F7",
  // A'
  "Bb6", "Cm7 F7", "Bb6", "G7", "Cm7", "F7", "Cm7 F7", "Bb6",
  // B
  "Eb6", "Ebm6", "Bb6", "G7", "C7", "C7", "F7", "F7",
  // A''
  "Bb6", "Cm7 F7", "Bb6", "G7", "Cm7", "F7", "Cm7 F7", "Bb6",
  // Tag
  "Bb6 G7", "Cm7 F7", "Bb6 G7", "Cm7 F7",
];

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

/**
 * The motif (A C F E C A | Bb A G in F) a fourth up, D F Bb A F D | Eb D C,
 * with a dotted music-hall bounce on each climb.
 */
const MOTIF_LONDON =
  "D5:.75 F5:.25 Bb5:1 A5:.5 F5:1 D5:.5 | Eb5:.75 D5:.25 C5:2 r:1";

/** Bars 3–8: the answer, then up to Cm and back round to the dominant. */
const A_REST = `
  F5:.75 G5:.25 F5:.5 D5:.5 Bb4:1 C5:.5 D5:.5 | B4:.75 D5:.25 G5:1 F5:1 D5:1 |
  Eb5:.75 D5:.25 Eb5:.5 G5:.5 C6:1 Bb5:1 | A5:.75 G5:.25 F5:.5 Eb5:.5 C5:2 |`;
const A_OPEN =
  "D5:.75 F5:.25 A5:1 G5:.75 F5:.25 D5:1 | Eb5:1 D5:.5 C5:.5 A4:1 r:1";
const A_HOME = "C5:.75 D5:.25 Eb5:.5 G5:.5 F5:1 A4:1 | Bb4:2 r:2";
const BRIDGE = `
  G5:1.5 F5:.5 Eb5:1 G5:1 | Gb5:1.5 F5:.5 Eb5:2 | F5:1.5 D5:.5 Bb4:1 D5:1 | F5:1.5 D5:.5 B4:2 |
  E5:.75 F5:.25 G5:1 Bb5:1 G5:1 | E5:.75 D5:.25 C5:2 r:1 |
  F5:.75 G5:.25 A5:1 C6:1 A5:1 | Eb5:1 C5:1 A4:1 r:1`;

/** Honky-tonk right hand: the tune with its lower octave. */
const octaves = (notes: Note[]): Note[] =>
  notes.flatMap((n) => [
    n,
    { ...n, pitch: n.pitch - 12, velocity: (n.velocity ?? 90) - 12 },
  ]);

/** A little weight on each bar's downbeat. */
const accent = (notes: Note[], by = 8): Note[] =>
  notes.map((n) =>
    n.start % BAR === 0 && n.velocity !== undefined
      ? { ...n, velocity: Math.min(127, n.velocity + by) }
      : n,
  );

const pianoLead = octaves(
  accent([
    // A: bars 1–8
    ...phrase(`${MOTIF_LONDON} | ${A_REST} ${A_OPEN}`, {
      at: at(1),
      velocity: 86,
    }),
    // B: bars 17–24
    ...phrase(BRIDGE, { at: at(17), velocity: 92 }),
    // A'': bars 25–32
    ...phrase(`${MOTIF_LONDON} | ${A_REST} ${A_HOME}`, {
      at: at(25),
      velocity: 88,
    }),
    // Tag: the motif's head, twice, left hanging for the clarinet (bars 33, 35).
    ...phrase("D5:.5 F5:.5 Bb5:1 r:2", { at: at(33), velocity: 90 }),
    ...phrase("D5:.5 F5:.5 Bb5:1 r:2", { at: at(35), velocity: 84 }),
  ]),
);

const clarinet = accent([
  // A': bars 9–16, the verse
  ...phrase(`${MOTIF_LONDON} | ${A_REST} ${A_HOME}`, {
    at: at(9),
    velocity: 84,
  }),
  // A'': bars 25–32, long notes under the piano
  ...phrase(
    `D4:2 F4:2 | G4:2 A4:2 | Bb4:2 G4:2 | B4:2 F4:2 |
     G4:2 Eb4:2 | Eb4:2 A4:2 | G4:2 A4:2 | Bb4:2 r:2`,
    { at: at(25), velocity: 64 },
  ),
  // Tag: the answer, the motif's sigh (Eb D C), then a run back to the top.
  ...phrase("Eb5:.75 D5:.25 C5:2 r:1", { at: at(34), velocity: 80 }),
  ...phrase("Eb5:.5 D5:.5 C5:.5 A4:.5 F4:1 r:1", {
    at: at(36),
    velocity: 76,
  }),
]);

// --- Accompaniment -------------------------------------------------------------------

/** Tuba oom: root on beat 1, fifth on beat 3 (one root per half-bar chord). */
const tuba: Note[] = chords.flatMap(({ name, start, beats }) => {
  const c = CHORDS[name];
  return beats === 2
    ? [{ pitch: noteToMidi(c.root), start, beats: 0.9, velocity: 88 }]
    : [
        { pitch: noteToMidi(c.root), start, beats: 0.9, velocity: 90 },
        {
          pitch: noteToMidi(c.fifth),
          start: start + 2,
          beats: 0.9,
          velocity: 78,
        },
      ];
});

/** Piano left hand pah: short chords on beats 2 and 4. */
const pah: Note[] = chords.flatMap(({ name, start, beats }) => {
  const v = CHORDS[name].pah;
  return beats === 2
    ? notesOf(v, start + 1, 0.45, 60)
    : [...notesOf(v, start + 1, 0.45, 62), ...notesOf(v, start + 3, 0.45, 56)];
});

/** Banjo off-beat chords in the bridge (bars 17–24), an octave above the pah. */
const banjo: Note[] = chords
  .filter((c) => c.start >= at(17) && c.start < at(25))
  .flatMap(({ name, start }) =>
    [1, 3].flatMap((beat) =>
      notesOf(CHORDS[name].pah, start + beat, 0.4, 58).map((n) => ({
        ...n,
        pitch: n.pitch + 12,
      })),
    ),
  );

// --- Drums (brush kit) -----------------------------------------------------------------

const drums: Note[] = [];
const hit = (key: number, start: number, velocity: number, beats = 0.25) =>
  drums.push({ pitch: key, start, beats, velocity });
for (let bar = 9; bar <= BARS; bar++) {
  const b = at(bar);
  hit(DRUMS.brushSlap, b + 1, 44);
  hit(DRUMS.brushSlap, b + 3, 40);
  if (bar >= 17 && bar <= 24) hit(DRUMS.brushSwirl, b, 30, 2);
}

const track: MusicTrack = {
  id: "london",
  task: "A2",
  title: "Last Orders (London theme)",
  description:
    "London theme: a music-hall pub singalong on honky-tonk piano and tuba, the shared motif (assets-src/audio/music/motif.ts) up a fourth in B-flat with a dotted bounce.",
  bpm: 120,
  bars: BARS,
  key: "B-flat major",
  sections: [
    {
      bar: 1,
      name: "A",
      description:
        "Motif on honky-tonk piano in octaves; tuba oom on 1 and 3, piano pah on 2 and 4",
    },
    {
      bar: 9,
      name: "A'",
      description: "Clarinet sings the verse, brushes join; cadence on B-flat",
    },
    {
      bar: 17,
      name: "B",
      description:
        "Bridge on Eb6 and Ebm6, then the ragtime circle G7–C7–F7; banjo off-beats",
    },
    {
      bar: 25,
      name: "A''",
      description: "Motif back on piano, clarinet under it in long notes",
    },
    {
      bar: 33,
      name: "Tag",
      description:
        "Motif head on piano answered by the clarinet's sigh; Bb–G7–Cm7–F7 turnaround back to bar 1",
    },
  ],
  parts: [
    {
      name: "Honky-tonk piano (tune)",
      channel: 1,
      program: GM["Honky-tonk Piano"],
      volume: 96,
      pan: 58,
      reverb: 34,
      notes: pianoLead,
    },
    {
      name: "Honky-tonk piano (pah)",
      channel: 2,
      program: GM["Honky-tonk Piano"],
      volume: 70,
      pan: 58,
      reverb: 30,
      notes: pah,
    },
    {
      name: "Tuba",
      channel: 3,
      program: GM["Tuba"],
      volume: 84,
      pan: 64,
      reverb: 20,
      notes: tuba,
    },
    {
      name: "Clarinet",
      channel: 4,
      program: GM["Clarinet"],
      volume: 74,
      pan: 80,
      reverb: 44,
      notes: clarinet,
    },
    {
      name: "Banjo (B)",
      channel: 5,
      program: GM["Banjo"],
      volume: 52,
      pan: 36,
      reverb: 30,
      notes: banjo,
    },
    {
      name: "Brushes",
      channel: 10,
      program: DRUM_KITS.brush,
      volume: 70,
      pan: 64,
      reverb: 28,
      notes: drums,
    },
  ],
};

export default track;
