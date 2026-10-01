/**
 * Zurich theme: an alpine evening over the lake.
 *
 * Unmistakably Swiss, and still night-gentle. A slow alphorn call opens it,
 * quoting the first phrase of the traditional Ranz des Vaches (the herdsmen's
 * cow-calling tune), with a distant second alphorn answering across the
 * valley. Then a 3/4 Ländler at a moderate tempo: button accordion and
 * clarinet, a double bass on beat 1 and an "oom-pah-pah" afterbeat. In the
 * middle the clarinet (chest voice) and an ocarina (head voice) trade a real
 * yodel, flipping across sixths and octaves with grace notes and slides.
 * Cowbells and herd bells clank sparsely, like cows on a far pasture. The
 * loop ends on the alphorn's low G, so it flows back into the opening call.
 *
 * G major, 96 bpm, 3/4, 40 bars (75 s):
 *
 * - Call (1–8): alphorn alone, the Ranz des Vaches, and its echo. The quote
 *   sits in G, a tone below Rousseau's A major, and two octaves down where
 *   an alphorn speaks. Each written eighth lasts a beat and a half.
 * - A (9–16): the Ländler tune on accordion, clarinet a third below.
 * - B (17–24): the trio in C, clarinet on the tune.
 * - Yodel (25–32): chest voice (clarinet) and head voice (ocarina).
 * - A' (33–36): the tune's first phrase again, softer.
 * - Call (37–40): accordion holds G softly; the alphorn recalls the end of
 *   its call and rests on its low G.
 *
 * The Ländler tune and the yodel are original. Melody sources are in
 * `melodySources`.
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

const BAR = 3;
const BARS = 40;
const at = (bar: number, beat = 0) => (bar - 1) * BAR + beat;
const opts = (bar: number, velocity: number) => ({
  at: at(bar),
  velocity,
  barBeats: BAR,
});

// --- The Ranz des Vaches: the alphorn's call -----------------------------------------

/**
 * "Air Suisse appellé le Ranz des Vaches", Adagio, 3/8, three sharps (A major),
 * bars 1–5, from J.-J. Rousseau's Dictionnaire de musique (1767/1768),
 * Planche N. Pitches are as engraved on the plate; here one written eighth is
 * a beat and a half. Bar 2 and 3 end in a triplet of sixteenths, bar 4 begins
 * with two sixteenths, and bar 5 is the dotted quarter A4, held like a
 * fermata.
 *
 *     bar 1:  D5 F#5 G#5              (three eighths)
 *     bar 2:  A5 (quarter)  B5 A5 G#5 (triplet of sixteenths)
 *     bar 3:  A5 (quarter)  B5 A5 G#5
 *     bar 4:  A5 F#5 (sixteenths)  D5 (quarter)
 *     bar 5:  A4 (dotted quarter)
 */
export const RANZ_PLATE =
  "D5:1.5 F#5:1.5 G#5:1.5 | A5:3 B5:.5 A5:.5 G#5:.5 | A5:3 B5:.5 A5:.5 G#5:.5 | A5:.75 F#5:.75 D5:3 | A4:6";

/** Down a tone to G major, then two octaves down for the alphorn. */
export const RANZ_TRANSPOSE = -2 - 24;
/** Bars 1 and 2 of the call (the head), and the cadence, for the echo and the ending. */
const RANZ_HEAD = "D5:1.5 F#5:1.5 G#5:1.5";

const alphornCall = phrase(RANZ_PLATE, {
  at: 0,
  transpose: RANZ_TRANSPOSE,
  velocity: 92,
  // One written 3/8 bar of the plate is three eighths of 1.5 beats.
  barBeats: 4.5,
});

/** A second alphorn across the valley: the head an octave up, faint. */
const alphornEcho = phrase(RANZ_HEAD, {
  at: 19,
  transpose: RANZ_TRANSPOSE + 12,
  velocity: 44,
});

/** The ending recalls bar 2 (A5 quarter, then the triplet) and rests on bar 5's tonic. */
const alphornEnd = [
  ...phrase("A5:3 B5:.5 A5:.5 G#5:.5", {
    at: at(37),
    transpose: RANZ_TRANSPOSE,
    velocity: 70,
  }),
  ...phrase("A4:7.5", {
    at: at(37, 4.5),
    transpose: RANZ_TRANSPOSE,
    velocity: 66,
  }),
];

// --- Harmony -------------------------------------------------------------------------

/** Bass root and fifth, and the accordion's close afterbeat voicing. */
const CHORDS: Record<string, { root: string; fifth: string; pah: string }> = {
  G: { root: "G2", fifth: "D2", pah: "B3+D4+G4" },
  D7: { root: "D2", fifth: "A2", pah: "A3+C4+F#4" },
  C: { root: "C2", fifth: "G2", pah: "G3+C4+E4" },
  G7: { root: "G2", fifth: "D2", pah: "B3+D4+F4" },
  F: { root: "F2", fifth: "C2", pah: "A3+C4+F4" },
};

// prettier-ignore
const CHART = [
  // Call: no chords.
  ...Array<string>(8).fill(""),
  // A
  "G", "D7", "G", "D7", "G", "C", "D7", "G",
  // B (trio in C)
  "C", "G7", "C", "G7", "F", "C", "G7", "D7",
  // Yodel
  "G", "G", "D7", "D7", "G", "C", "D7", "G",
  // A'
  "G", "D7", "G", "D7",
  // Call
  "G", "G", "G", "G",
];

const chords = CHART.map((name, i) => ({ name, start: i * BAR, bar: i + 1 }));

const notesOf = (
  src: string,
  start: number,
  beats: number,
  velocity: number,
): Note[] =>
  src.split("+").map((n) => ({ pitch: noteToMidi(n), start, beats, velocity }));

// --- The Ländler (original) ----------------------------------------------------------

/** A: chords G D7 G D7 | G C D7 G. */
const A_TUNE = `
  D5:1.5 B4:.5 G4:1 | A4:1 F#4:1 A4:1 | B4:1 D5:1 G5:1 | F#5:1.5 E5:.5 D5:1 |
  D5:1.5 B4:.5 G4:1 | E5:1 G5:1 E5:1 | D5:1 B4:.5 C5:.5 A4:1 | G4:3 |`;
/** B: the trio in C, chords C G7 C G7 | F C G7 D7. */
const B_TUNE = `
  E5:1 G5:1 E5:1 | D5:1.5 B4:.5 D5:1 | C5:1 E5:1 G5:1 | F5:1.5 E5:.5 D5:1 |
  A4:1 C5:1 F5:1 | E5:1.5 D5:.5 C5:1 | B4:1 D5:1 F5:1 | A4:1.5 C5:.5 A4:1 |`;

/** Downbeats a little stronger, the Ländler lilt. */
const lilt = (notes: Note[], by = 8): Note[] =>
  notes.map((n) =>
    n.start % BAR === 0 && n.velocity !== undefined
      ? { ...n, velocity: Math.min(127, n.velocity + by) }
      : n,
  );

/** G major pitch classes, for the clarinet's parallel thirds. */
const G_MAJOR = new Set([7, 9, 11, 0, 2, 4, 6]);
/** Move a pitch down `steps` degrees of G major. */
const diatonicDown = (pitch: number, steps: number) => {
  let p = pitch;
  for (let s = 0; s < steps; s++) {
    p--;
    while (!G_MAJOR.has(p % 12)) p--;
  }
  return p;
};

const A_FIRST_PHRASE = A_TUNE.split("|").slice(0, 4).join("|") + "|";

const accordionTune = [
  ...lilt(phrase(A_TUNE, opts(9, 84))),
  ...lilt(phrase(A_FIRST_PHRASE, opts(33, 62))),
];

/** Clarinet: the tune a third below in A and A'; the tune itself in the trio. */
const clarinetTune = [
  ...lilt(phrase(A_TUNE, opts(9, 62))).map((n) => ({
    ...n,
    pitch: diatonicDown(n.pitch, 2),
  })),
  ...lilt(phrase(B_TUNE, opts(17, 88))),
  ...lilt(phrase(A_FIRST_PHRASE, opts(33, 48))).map((n) => ({
    ...n,
    pitch: diatonicDown(n.pitch, 2),
  })),
];

// --- The yodel (original) ------------------------------------------------------------

const note = (
  pitch: string | number,
  start: number,
  beats: number,
  velocity: number,
): Note => ({
  pitch: typeof pitch === "number" ? pitch : noteToMidi(pitch),
  start,
  beats,
  velocity,
});

/** One chest/head pair: the clarinet's low note and the ocarina's high answer. */
interface Flip {
  chest: string;
  head: string;
}

/**
 * A bar of slow yodel flips: chest on the beat, head on the "and", each head
 * note scooped from a semitone below by a grace note. Sixths and octaves
 * (a sixth is 8 or 9 semitones, an octave 12, both up to 21 with the octave
 * added on top).
 */
const slowBar = (bar: number, flips: [Flip, Flip, Flip]) => {
  const chest: Note[] = [];
  const head: Note[] = [];
  flips.forEach(({ chest: c, head: h }, k) => {
    const t = at(bar, k);
    chest.push(note(c, t, 0.5, 80));
    const main = noteToMidi(h);
    head.push(note(main - 1, t + 0.375, 0.125, 56));
    head.push(note(main, t + 0.5, 0.375, 88));
  });
  return { chest, head };
};

/** A bar of quick flips in eighth-note triplets, then a held chest and head pair. */
const quickBar = (
  bar: number,
  flips: [Flip, Flip, Flip],
  held: Flip,
  heldBeats = 0.875,
) => {
  const chest: Note[] = [];
  const head: Note[] = [];
  const third = 1 / 3;
  flips.forEach(({ chest: c, head: h }, k) => {
    const t = at(bar, k * 2 * third);
    chest.push(note(c, t, third * 0.9, 80));
    head.push(note(h, t + third, third * 0.8, 86));
  });
  const t = at(bar, 2);
  chest.push(note(held.chest, t, heldBeats, 74));
  head.push(note(noteToMidi(held.head) - 1, t - 0.125, 0.125, 56));
  head.push(note(held.head, t, heldBeats, 86));
  return { chest, head };
};

/** A chromatic slide down: 32nd notes from `from` for `count` semitones. */
const slide = (from: string, start: number, count: number, velocity = 76) =>
  Array.from({ length: count }, (_, k) =>
    note(noteToMidi(from) - k, start + k * 0.125, 0.125, velocity),
  );

const y1 = [
  slowBar(25, [
    { chest: "G3", head: "E5" },
    { chest: "B3", head: "G5" },
    { chest: "D4", head: "D5" },
  ]),
  slowBar(26, [
    { chest: "G4", head: "E5" },
    { chest: "D4", head: "B4" },
    { chest: "G4", head: "G5" },
  ]),
  slowBar(27, [
    { chest: "A3", head: "F#5" },
    { chest: "C4", head: "A5" },
    { chest: "D4", head: "D5" },
  ]),
];
const y2 = [
  quickBar(
    29,
    [
      { chest: "G3", head: "E5" },
      { chest: "B3", head: "G5" },
      { chest: "D4", head: "D5" },
    ],
    { chest: "D4", head: "G5" },
  ),
  quickBar(
    30,
    [
      { chest: "C4", head: "A5" },
      { chest: "E4", head: "E5" },
      { chest: "G4", head: "G5" },
    ],
    { chest: "E4", head: "E5" },
  ),
  quickBar(
    31,
    [
      { chest: "A3", head: "F#5" },
      { chest: "C4", head: "A5" },
      { chest: "D4", head: "D5" },
    ],
    { chest: "A3", head: "A5" },
  ),
];

const yodelChest: Note[] = [
  ...y1.flatMap((b) => b.chest),
  // Bar 28: a long chest note under the head voice's slide.
  note("A3", at(28), 1.5, 74),
  ...y2.flatMap((b) => b.chest),
  // Bar 32: the chest voice settles on the tonic.
  note("G3", at(32), 3, 76),
];

const yodelHead: Note[] = [
  ...y1.flatMap((b) => b.head),
  // Bar 28: A5, then a chromatic slide down to D5 and a held D5.
  note("A5", at(28, 1), 0.375, 88),
  ...slide("A5", at(28, 1.5), 7),
  note("D5", at(28, 2.375), 0.625, 84),
  ...y2.flatMap((b) => b.head),
  // Bar 32: G5, a slide down through F#5 F E D# to D5, and a rest on B4.
  note("F#5", at(32) - 0.125, 0.125, 56),
  note("G5", at(32), 1, 88),
  ...slide("G5", at(32, 1), 6),
  note("B4", at(32, 1.75), 1.25, 80),
];

// --- Accompaniment -------------------------------------------------------------------

/** Double bass on beat 1, the root, or the fifth when a chord repeats. */
const bass: Note[] = chords
  .filter(({ bar, name }) => bar >= 9 && bar <= 36 && name !== "")
  .map(({ name, start, bar }) => {
    const c = CHORDS[name];
    const repeat = CHART[bar - 2] === name;
    return {
      pitch: noteToMidi(repeat ? c.fifth : c.root),
      start,
      beats: 0.8,
      velocity: 92,
    };
  });

/** Accordion "pah pah": short chords on beats 2 and 3 of every Ländler bar. */
const afterbeat: Note[] = [
  ...chords
    .filter(({ bar, name }) => bar >= 9 && bar <= 36 && name !== "")
    .flatMap(({ name, start }) => [
      ...notesOf(CHORDS[name].pah, start + 1, 0.5, 68),
      ...notesOf(CHORDS[name].pah, start + 2, 0.5, 58),
    ]),
  // A soft accordion hold under the alphorn's ending.
  ...notesOf("G3+D4+B4", at(37), 11.6, 30),
];

// --- Herd bells ----------------------------------------------------------------------

const bells: Note[] = [];
const ring = (
  start: number,
  pattern: [number, number][],
  key: number,
  velocity: number,
) =>
  pattern.forEach(([offset, scale]) =>
    bells.push({
      pitch: key,
      start: start + offset,
      beats: 0.25,
      velocity: Math.round(velocity * scale),
    }),
  );
/** Clusters of two to four clanks, uneven, dying away as the herd wanders. */
const CLUSTER_A: [number, number][] = [
  [0, 1],
  [0.75, 0.8],
  [1.25, 0.9],
  [2.5, 0.6],
];
const CLUSTER_B: [number, number][] = [
  [0, 1],
  [1.5, 0.7],
  [2.0, 0.85],
];
const CLUSTER_C: [number, number][] = [
  [0, 1],
  [0.5, 0.7],
];

const cowbell: Note[] = [];
const clank = (start: number, pattern: [number, number][], velocity: number) =>
  pattern.forEach(([offset, scale]) =>
    cowbell.push({
      pitch: DRUMS.cowbell,
      start: start + offset,
      beats: 0.25,
      velocity: Math.round(velocity * scale),
    }),
  );

// The call: a few clanks far off.
clank(5.5, CLUSTER_B, 60);
clank(13, CLUSTER_C, 56);
clank(21.5, CLUSTER_A, 58);
// The Ländler: one or two sparse clusters per strain.
clank(at(11, 1.5), CLUSTER_C, 52);
clank(at(15, 2), CLUSTER_C, 50);
clank(at(20, 0.5), CLUSTER_B, 54);
clank(at(23, 1), CLUSTER_C, 50);
clank(at(27, 2), CLUSTER_C, 48);
clank(at(31, 1.5), CLUSTER_C, 48);
clank(at(35, 0.5), CLUSTER_B, 54);
// The ending: the herd settles.
clank(at(37, 2.5), CLUSTER_A, 56);
clank(at(39, 1), CLUSTER_B, 50);

// Pitched herd bells: two notes, a fifth apart, higher and softer.
const D5 = noteToMidi("D5");
const A4 = noteToMidi("A4");
ring(7, [[0, 1]], A4, 62);
ring(
  16.5,
  [
    [0, 1],
    [1.25, 0.8],
  ],
  D5,
  34,
);
ring(
  at(13, 1.5),
  [
    [0, 1],
    [0.75, 0.7],
  ],
  A4,
  34,
);
ring(at(21, 2), [[0, 1]], D5, 54);
ring(
  at(30, 0.5),
  [
    [0, 1],
    [1, 0.8],
  ],
  A4,
  30,
);
ring(
  at(38, 1),
  [
    [0, 1],
    [1.5, 0.8],
  ],
  D5,
  34,
);

// --- Track ---------------------------------------------------------------------------

const track: MusicTrack = {
  id: "zurich",
  task: "A3",
  title: "Ranz des Vaches at Night (Zurich theme)",
  description:
    "Zurich theme: a slow alphorn call quoting the traditional Ranz des Vaches, then a moderate 3/4 Ländler on accordion and clarinet with an oom-pah-pah afterbeat, an instrumental yodel (clarinet chest voice against an ocarina head voice), and sparse cowbells and herd bells. The loop ends on the alphorn.",
  bpm: 96,
  meter: [3, 4],
  bars: BARS,
  key: "G major",
  melodySources: [
    {
      id: "ranz-des-vaches",
      tune: "Ranz des Vaches (Kuhreihen), the Swiss herdsmen's cow-calling tune",
      source:
        "Jean-Jacques Rousseau, Dictionnaire de musique (Geneva, 1767; Paris, 1768), Planche N, 'Air Suisse appellé le Ranz des Vaches', the Adagio strain in 3/8 with three sharps (A major), bars 1–5 (bars 6–7 repeat bar 1–2). Read from the Internet Archive scan of the 1767 edition (item dictionnairedem00rous, page image n623). The oldest notated version, Theodor Zwinger's Cantilena Helvetica in his Dissertatio medica (Basel, 1710), is a different reading of the same herding call.",
      publicDomain:
        "Yes. A traditional Swiss herding call printed in 1710 and 1767; Rousseau died in 1778 and Zwinger in 1724. Public domain everywhere.",
      use: "The alphorn's opening call quotes bars 1–5, with the same pitches and rhythm proportions, one written eighth as a beat and a half at 96 bpm, in G major (down a tone from the plate) and two octaves down; the final dotted quarter is held like a fermata. The distant echo repeats bar 1 an octave higher, and the ending recalls bar 2 and bar 5.",
      verification:
        "Pitches and rhythm were read by eye from the engraved plate at high zoom; the plate's double beam over three notes in bars 2 and 3 is taken as a triplet of sixteenths. Checked by scripts/assets/__tests__/music-pd-melodies.test.ts against a separate transcription of the plate. A second reading by a musician is welcome.",
    },
    {
      id: "zurich-landler",
      tune: "Ländler tune (bars 9–36) and yodel (bars 25–32)",
      source:
        "Original composition for this project, in the manner of a Swiss Ländler and a yodel. No existing tune is quoted.",
      publicDomain: "Not applicable: original to this project.",
      use: "The dance tune on accordion and clarinet, and the clarinet and ocarina yodel.",
    },
  ],
  sections: [
    {
      bar: 1,
      name: "Call",
      description:
        "Alphorn alone quoting the Ranz des Vaches, a distant echo, faint cowbells",
    },
    {
      bar: 9,
      name: "A",
      description:
        "Ländler tune on accordion, clarinet a third below; double bass on beat 1, accordion afterbeat",
    },
    {
      bar: 17,
      name: "B",
      description: "Trio in C, clarinet on the tune",
    },
    {
      bar: 25,
      name: "Yodel",
      description:
        "Clarinet (chest voice) against ocarina (head voice): sixths and octaves, grace notes, slides",
    },
    {
      bar: 33,
      name: "A'",
      description: "The tune's first phrase again, softer",
    },
    {
      bar: 37,
      name: "Call",
      description:
        "Soft accordion hold on G; the alphorn recalls the end of its call and rests on its low G",
    },
  ],
  parts: [
    {
      name: "Alphorn (call)",
      channel: 1,
      program: GM["French Horn"],
      volume: 110,
      pan: 60,
      reverb: 127,
      notes: [...alphornCall, ...alphornEnd],
    },
    {
      name: "Alphorn (echo)",
      channel: 2,
      program: GM["French Horn"],
      volume: 96,
      pan: 100,
      reverb: 127,
      notes: alphornEcho,
    },
    {
      name: "Accordion (tune)",
      channel: 3,
      program: GM["Accordion"],
      volume: 112,
      pan: 50,
      reverb: 34,
      notes: accordionTune,
    },
    {
      name: "Accordion (afterbeat and hold)",
      channel: 4,
      program: GM["Accordion"],
      volume: 98,
      pan: 68,
      reverb: 30,
      notes: afterbeat,
    },
    {
      name: "Clarinet (tune and chest voice)",
      channel: 5,
      program: GM["Clarinet"],
      volume: 88,
      pan: 76,
      reverb: 40,
      notes: [...clarinetTune, ...yodelChest],
    },
    {
      name: "Ocarina (head voice)",
      channel: 6,
      program: GM["Ocarina"],
      volume: 96,
      pan: 40,
      reverb: 50,
      notes: yodelHead,
    },
    {
      name: "Double bass",
      channel: 7,
      program: GM["Acoustic Bass"],
      volume: 96,
      pan: 64,
      reverb: 22,
      notes: bass,
    },
    {
      name: "Herd bells",
      channel: 8,
      program: GM["Agogo"],
      volume: 118,
      pan: 22,
      reverb: 90,
      notes: bells,
    },
    {
      name: "Cowbell",
      channel: 10,
      program: DRUM_KITS.standard,
      volume: 120,
      pan: 96,
      reverb: 100,
      notes: cowbell,
    },
  ],
};

export default track;
