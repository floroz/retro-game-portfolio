/**
 * London theme, Merseybeat cut: a pub jukebox in 1964.
 *
 * KEPT AS AN ALTERNATIVE, not used by the scene: the game's London theme is
 * the punk/ska cut (london.ts). To bring this one back, point `music` in
 * src/config/scenes/london.ts at /audio/music/london-merseybeat.mp3 with the
 * loop points from assets-src/provenance/music-london-merseybeat.json.
 *
 * An original British Invasion / Merseybeat arrangement, as if a beat group
 * had covered a nursery rhyme for a laugh: the public-domain tune "London
 * Bridge Is Falling Down" on jangling clean electric guitar over a 12-string
 * strum, a combo organ that answers it, a melodic walking bass, and a bright
 * beat (straight eighths, snare backbeat, tambourine on 2 and 4). The
 * progressions are the era's plain vocabulary (I–vi–IV–V, a borrowed
 * flat-VII, a major-III lift), not those of any particular record.
 *
 * G major, 128 bpm, 4/4, 40 bars (75 s):
 *
 * - Intro (1–4): 12-string strum and hi-hat on G–Em–C–D7, a guitar tag, and a
 *   drum fill.
 * - A (5–12): "London Bridge" on clean guitar (the tune, two bars per line,
 *   G–C–D7–Em–G–C–D7–G). Organ pad from bar 9. Fill.
 * - Answer (13–16): the combo organ answers. Its phrase is the shared motif
 *   (motif.ts) a tone up in G (B D G F# D B | C B A), then the same shape on C.
 * - A' (17–24): the tune passes to the organ; hand claps on 2 and 4.
 * - Middle eight (25–32): an original tune on guitar, lifting to the major
 *   III (B7) and out through the borrowed flat-VII (F) back to G. Bass pumps
 *   eighths.
 * - A'' (33–40): the tune returns on guitar with organ off-beat stabs. The
 *   last chord is G6 (the "added sixth"), and a snare-and-tom fill leads back
 *   to the intro.
 *
 * The melody's source and public-domain status are in `melodySources`.
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

const BAR = 4;
const BARS = 40;
const at = (bar: number, beat = 0) => (bar - 1) * BAR + beat;
const opts = (bar: number, velocity: number) => ({
  at: at(bar),
  velocity,
  barBeats: BAR,
});

// --- Harmony -------------------------------------------------------------------------

interface Chord {
  /** Guitar strum voicing (open-chord shapes, low to high). */
  strum: string;
  /** Organ voicing, close, in the middle register. */
  organ: string;
  /** Bass root and walking notes: root, third, fifth. */
  walk: [string, string, string];
}

const CHORDS: Record<string, Chord> = {
  G: {
    strum: "G3+B3+D4+G4",
    organ: "D4+G4+B4",
    walk: ["G2", "B2", "D3"],
  },
  C: {
    strum: "G3+C4+E4+G4",
    organ: "E4+G4+C5",
    walk: ["C3", "E3", "G3"],
  },
  D7: {
    strum: "D4+F#4+A4+C5",
    organ: "C4+F#4+A4",
    walk: ["D3", "F#3", "A3"],
  },
  Em: {
    strum: "E3+B3+E4+G4",
    organ: "E4+G4+B4",
    walk: ["E2", "G2", "B2"],
  },
  B7: {
    strum: "B3+D#4+F#4+A4",
    organ: "D#4+F#4+A4",
    walk: ["B2", "D#3", "F#3"],
  },
  F: {
    strum: "F3+A3+C4+F4",
    organ: "F4+A4+C5",
    walk: ["F2", "A2", "C3"],
  },
  // G with an added sixth (E): the last chord of the arrangement.
  G6: {
    strum: "G3+B3+E4+G4",
    organ: "E4+G4+B4",
    walk: ["G2", "B2", "D3"],
  },
};

/** One chord per bar. */
// prettier-ignore
const CHART = [
  // Intro
  "G", "Em", "C", "D7",
  // A
  "G", "C", "D7", "Em", "G", "C", "D7", "G",
  // Answer
  "G", "D7", "C", "D7",
  // A'
  "G", "C", "D7", "Em", "G", "C", "D7", "G",
  // Middle eight: major III, then the borrowed flat-VII (F) home to G
  "B7", "Em", "C", "D7", "B7", "Em", "C", "F",
  // A''
  "G", "C", "D7", "Em", "G", "C", "D7", "G6",
];

const chords = CHART.map((name, i) => ({ name, start: i * BAR, bar: i + 1 }));

const notesOf = (
  src: string,
  start: number,
  beats: number,
  velocity: number,
): Note[] =>
  src.split("+").map((n) => ({ pitch: noteToMidi(n), start, beats, velocity }));

// --- The tune: "London Bridge Is Falling Down" ---------------------------------------

/**
 * The traditional tune, in G major, two bars of 4/4 per line (the nursery
 * rhyme's 2/4 bars, each note twice as long). In solfège, so-la-so-fa-mi-fa-so
 * / re-mi-fa / mi-fa-so / (again) / re-so / mi-do, that is:
 *
 *     Lon-don Bridge is  fall-ing down,  fall-ing down,  fall-ing down,
 *     D.  E  D    C      B   C   D       A   B   C       B   C   D
 *     Lon-don Bridge is  fall-ing down,  My   fair  la-  dy.
 *     D.  E  D    C      B   C   D       A    D     B     G
 */
const LB_LINE_1 = "D5:1.5 E5:.5 D5:1 C5:1 | B4:1 C5:1 D5:2 |";
const LB_LINE_2 = "A4:1 B4:1 C5:2 | B4:1 C5:1 D5:2 |";
const LB_LINE_4 = "A4:2 D5:2 | B4:2 G4:2 |";
const LONDON_BRIDGE = `${LB_LINE_1} ${LB_LINE_2} ${LB_LINE_1} ${LB_LINE_4}`;

/** A little weight on each downbeat and backbeat of a melody. */
const accent = (notes: Note[], by = 8): Note[] =>
  notes.map((n) =>
    n.start % 2 === 0 && n.velocity !== undefined
      ? { ...n, velocity: Math.min(127, n.velocity + by) }
      : n,
  );

const tune = (bar: number, velocity: number) =>
  accent(phrase(LONDON_BRIDGE, opts(bar, velocity)));

/** The last line ends on G6, so its final note is short and a fill follows. */
const tuneWithFill = (bar: number, velocity: number) => {
  const notes = tune(bar, velocity);
  const last = notes[notes.length - 1];
  return [...notes.slice(0, -1), { ...last, beats: 1 }];
};

// --- The organ's answer (original; the motif's shape) --------------------------------

/**
 * The shared motif a tone up in G, in its own rhythm from motif.ts:
 * B D G F# D B | C B A, then the same arch on C (E G C B G E | F E D), and a
 * closing lick that lands on the dominant for the tune's return.
 */
const ANSWER = `
  B4:.5 D5:.5 G5:1 F#5:.5 D5:1 B4:.5 | C5:.5 B4:.5 A4:1 r:2 |
  E5:.5 G5:.5 C6:1 B5:.5 G5:1 E5:.5 | F#5:.5 E5:.5 D5:1 A4:.5 C5:.5 F#5:.5 A5:.5 |`;

const organAnswer = phrase(ANSWER, opts(13, 88));

// --- The middle eight (original) -----------------------------------------------------

/** Guitar melody over B7 | Em | C | D7 | B7 | Em | C | F. */
const MIDDLE_EIGHT = `
  F#5:1 D#5:1 B4:1 D#5:1 | E5:2 G5:1 E5:1 | E5:1.5 D5:.5 C5:1 E5:1 | D5:2 C5:1 A4:1 |
  F#5:1 D#5:1 B4:1 B5:1 | E5:1 G5:1 B5:2 | G5:1.5 E5:.5 C5:2 | A5:1 C6:1 A5:1 F5:1 |`;

// --- Lines ---------------------------------------------------------------------------

const lead: Note[] = [
  // Intro tag
  ...phrase("E5:.5 G5:.5 C6:1 B5:1 G5:1", opts(3, 84)),
  ...phrase("A5:1 F#5:1 D5:1 r:1", opts(4, 84)),
  // A and A''
  ...tune(5, 90),
  ...tuneWithFill(33, 94),
  // Middle eight
  ...accent(phrase(MIDDLE_EIGHT, opts(25, 90))),
];

/** The organ takes the tune in A', and doubles the guitar an octave down in A''. */
const organLead: Note[] = [
  ...organAnswer,
  ...tune(17, 84),
  ...tuneWithFill(33, 56).map((n) => ({ ...n, pitch: n.pitch - 12 })),
];

/** Guitar strum: straight eighths, down-strokes staggered a hair across the strings. */
const strumBar = (
  voicing: string,
  bar: number,
  velocity: number,
  octave = 0,
): Note[] => {
  const pitches = voicing.split("+").map((n) => noteToMidi(n) + octave);
  const weights = [1, 0.62, 1.14, 0.62, 1, 0.62, 1.14, 0.62];
  return weights.flatMap((w, k) =>
    pitches.map((pitch, s) => ({
      pitch,
      start: at(bar) + k * 0.5 + (s * 5) / 480,
      beats: 0.4375,
      velocity: Math.round(Math.min(120, velocity * w)),
    })),
  );
};

const strum12: Note[] = chords.flatMap(({ name, bar }) => {
  // Quieter while the guitar carries the tune, fuller behind the organ.
  const inA = (bar >= 5 && bar <= 12) || bar >= 33;
  const inMiddle = bar >= 25 && bar <= 32;
  const v = inA ? 50 : inMiddle ? 58 : bar >= 17 && bar <= 24 ? 68 : 62;
  return strumBar(CHORDS[name].strum, bar, v, 12);
});

/** The electric guitar strums under the organ in A', and in the intro. */
const strumElectric: Note[] = chords
  .filter(({ bar }) => bar <= 4 || (bar >= 17 && bar <= 24))
  .flatMap(({ name, bar }) => strumBar(CHORDS[name].strum, bar, 56));

/** Organ pad: whole-note chords behind the guitar tune and the middle eight. */
const organPad: Note[] = chords
  .filter(({ bar }) => (bar >= 9 && bar <= 12) || (bar >= 25 && bar <= 32))
  .flatMap(({ name, start }) => notesOf(CHORDS[name].organ, start, BAR, 40));

/** Organ off-beat stabs in A'': combo-organ chops on every "and". */
const organStabs: Note[] = chords
  .filter(({ bar }) => bar >= 33 && bar <= 39)
  .flatMap(({ name, start }) =>
    [0.5, 1.5, 2.5, 3.5].flatMap((beat) =>
      notesOf(CHORDS[name].organ, start + beat, 0.3, 58),
    ),
  );

/** The finishing G6: organ and strum hold it as the fill starts. */
const finalChord: Note[] = notesOf(CHORDS.G6.organ, at(40, 2), 1.8, 78);

// --- Bass ----------------------------------------------------------------------------

/** Bass root for a chord name; the finishing G6 shares G's root. */
const rootOf = (name: string) => noteToMidi(CHORDS[name].walk[0]);

/**
 * A melodic walking bass: root, third, fifth, and a chromatic approach to the
 * next bar's root (from below when the line is rising, otherwise from above).
 * The middle eight pumps eighth notes instead.
 */
const bass: Note[] = chords.flatMap(({ name, start, bar }, i) => {
  const [root, third, fifth] = CHORDS[name].walk.map(noteToMidi);
  const nextName = chords[(i + 1) % chords.length].name;
  const next = rootOf(nextName);
  const approach = fifth <= next ? next - 1 : next + 1;
  const pump = bar >= 25 && bar <= 32;
  if (pump) {
    // Eighth-note pump: root, root, octave, root ... with the approach on the last "and".
    return [0, 0, 12, 0, 0, 0, 12, 0].map((up, k) => ({
      pitch: k === 7 ? approach : root + up,
      start: start + k * 0.5,
      beats: 0.45,
      velocity: k % 2 === 0 ? 92 : 74,
    }));
  }
  const line = [root, third, fifth, approach];
  return line.map((pitch, k) => ({
    pitch,
    start: start + k,
    beats: 0.9,
    velocity: k === 0 ? 96 : 82,
  }));
});

// --- Percussion ----------------------------------------------------------------------

const HAND_CLAP = 39;
const drums: Note[] = [];
const hit = (key: number, start: number, velocity: number, beats = 0.25) =>
  drums.push({ pitch: key, start, beats, velocity });

/** Snare and tom fill on the last beat of a bar. */
const fill = (bar: number) => {
  const b = at(bar, 3);
  hit(DRUMS.snare, b, 96);
  hit(DRUMS.snare, b + 0.25, 84);
  hit(DRUMS.highTom, b + 0.5, 100);
  hit(DRUMS.midTom, b + 0.75, 100);
};
const FILL_BARS = new Set([4, 12, 16, 24, 32, 40]);
const CRASH_BARS = new Set([1, 5, 17, 25, 33]);

for (let bar = 1; bar <= BARS; bar++) {
  const b = at(bar);
  const intro = bar <= 2;
  const tambourine = bar >= 5;
  const claps = bar >= 17 && bar <= 24;
  if (CRASH_BARS.has(bar)) hit(DRUMS.crash, b, 88, 1);
  // Hi-hat: straight eighths, open on the "and" of 4 at the end of each line.
  for (let k = 0; k < 8; k++) {
    const openHat = k === 7 && bar % 2 === 0 && !FILL_BARS.has(bar);
    hit(
      openHat ? DRUMS.openHat : DRUMS.closedHat,
      b + k * 0.5,
      k % 2 ? 46 : 66,
    );
  }
  // Kick on 1 and 3, and a push on the "and" of 3 every other bar.
  hit(DRUMS.kick, b, 104);
  if (!intro || bar === 2) hit(DRUMS.kick, b + 2, 96);
  if (bar % 2 === 0 && !FILL_BARS.has(bar)) hit(DRUMS.kick, b + 2.5, 80);
  // Snare backbeat on 2 and 4 (from the second bar of the intro).
  if (bar >= 2) {
    hit(DRUMS.snare, b + 1, 108);
    if (!FILL_BARS.has(bar)) hit(DRUMS.snare, b + 3, 108);
  }
  if (tambourine) {
    hit(DRUMS.tambourine, b + 1, 76);
    if (!FILL_BARS.has(bar)) hit(DRUMS.tambourine, b + 3, 76);
  }
  if (claps) {
    hit(HAND_CLAP, b + 1, 96);
    if (!FILL_BARS.has(bar)) hit(HAND_CLAP, b + 3, 96);
  }
  if (FILL_BARS.has(bar)) fill(bar);
}
// The last bar's final chord rings; the fill after it leads back into bar 1.

// --- Track ---------------------------------------------------------------------------

const track: MusicTrack = {
  id: "london-merseybeat",
  task: "A3",
  title: "The Bridge Is Falling (London theme, Merseybeat cut)",
  description:
    'London theme, Merseybeat cut. KEPT AS AN ALTERNATIVE and unused by the scene (the scene plays music-london, the punk/ska cut; to revert, point src/config/scenes/london.ts at this file with these loop points). An original 1964 British Invasion / Merseybeat pub-jukebox track on the public-domain tune "London Bridge Is Falling Down": jangling clean electric guitar over a 12-string strum, a combo organ answering with the shared motif (assets-src/audio/music/motif.ts) a tone up in G, a melodic walking bass, and a bright straight-eighths beat with tambourine and hand claps.',
  bpm: 128,
  meter: [4, 4],
  bars: BARS,
  key: "G major",
  melodySources: [
    {
      id: "london-bridge",
      tune: "London Bridge Is Falling Down",
      source:
        "Traditional English nursery rhyme and singing game (Roud Folk Song Index 502). The tune sung today was first recorded in A. H. Rosewig, Illustrated National Songs and Games (USA, 1879), according to the rhyme's Wikipedia entry. The notes are the standard traditional melody, so-la-so-fa-mi-fa-so / re-mi-fa / mi-fa-so / so-la-so-fa-mi-fa-so / re-so / mi-do, written in G major with each 2/4 bar stretched over a 4/4 bar.",
      publicDomain:
        "Yes. A traditional tune in print since the 19th century with no living author or rights holder; public domain in the UK, EU, and US.",
      use: "Played note for note on guitar in A (bars 5–12) and A'' (33–40), and on the combo organ in A' (17–24), in G major, at 128 bpm.",
      verification:
        "Typed from the standard traditional version and checked against its solfège by scripts/assets/__tests__/music-pd-melodies.test.ts. Not compared against a scan of the 1879 print, which was not reachable offline.",
    },
    {
      id: "london-organ-answer",
      tune: "Organ answer phrase (bars 13–16)",
      source:
        "Original composition for this project, built on the shared motif (assets-src/audio/music/motif.ts) a tone up in G.",
      publicDomain: "Not applicable: original to this project.",
      use: "The organ's reply after the first tune.",
    },
    {
      id: "london-middle-eight",
      tune: "Middle eight (bars 25–32) and intro tag (bars 3–4)",
      source: "Original composition for this project.",
      publicDomain: "Not applicable: original to this project.",
      use: "The bridge and the intro guitar tag. The chord progressions (I–vi–IV–V, the major-III lift, the borrowed flat-VII, the closing G6) are generic to the era, not taken from a particular song.",
    },
  ],
  sections: [
    {
      bar: 1,
      name: "Intro",
      description:
        "12-string strum and hi-hat on G–Em–C–D7, guitar tag, drum fill",
    },
    {
      bar: 5,
      name: "A",
      description:
        "London Bridge on clean guitar over walking bass; organ pad from bar 9; fill",
    },
    {
      bar: 13,
      name: "Answer",
      description:
        "Combo organ answers with the motif's shape (original), on G, D7, C, D7",
    },
    {
      bar: 17,
      name: "A'",
      description: "Tune on the organ, hand claps on 2 and 4",
    },
    {
      bar: 25,
      name: "Middle eight",
      description:
        "Original tune on guitar: major-III lift (B7), then the borrowed flat-VII (F) home; bass pumps eighths",
    },
    {
      bar: 33,
      name: "A''",
      description:
        "Tune on guitar, organ off-beat stabs and octave doubling; ends on G6, fill into the repeat",
    },
  ],
  parts: [
    {
      name: "Electric guitar (clean)",
      channel: 1,
      program: GM["Electric Guitar (clean)"],
      volume: 104,
      pan: 44,
      reverb: 26,
      notes: lead,
    },
    {
      name: "Electric guitar (strum)",
      channel: 2,
      program: GM["Electric Guitar (clean)"],
      volume: 92,
      pan: 40,
      reverb: 26,
      notes: strumElectric,
    },
    {
      name: "12-string guitar (strum)",
      channel: 3,
      ...FLUIDR3_PRESETS["12 String Guitar"],
      volume: 104,
      pan: 88,
      reverb: 30,
      notes: strum12,
    },
    {
      name: "Combo organ (lead)",
      channel: 4,
      program: GM["Percussive Organ"],
      volume: 84,
      pan: 76,
      reverb: 28,
      notes: organLead,
    },
    {
      name: "Combo organ (pad and stabs)",
      channel: 5,
      program: GM["Drawbar Organ"],
      volume: 96,
      pan: 82,
      reverb: 28,
      notes: [...organPad, ...organStabs, ...finalChord],
    },
    {
      name: "Electric bass",
      channel: 6,
      program: GM["Electric Bass (finger)"],
      volume: 92,
      pan: 64,
      reverb: 14,
      notes: bass,
    },
    {
      name: "Drums, tambourine, and claps",
      channel: 10,
      program: DRUM_KITS.standard,
      volume: 96,
      pan: 64,
      reverb: 22,
      notes: drums,
    },
  ],
};

export default track;
