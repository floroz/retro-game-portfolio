/**
 * London theme: a late-70s punk band that slides into ska (docs/art-spec.md,
 * Audio).
 *
 * An original arrangement of the public-domain tune "London Bridge Is Falling
 * Down", played the way a 1977–79 London band would wreck a nursery rhyme:
 * distorted power chords over a driving eighth-note bass at 150 bpm, then a
 * slide into a half-time ska section (offbeat guitar skank, a busy melodic
 * bass, a rimshot on 3, an organ bubble), and back to full punk for a last
 * pass where a stacked unison of two lead guitars and an organ plays the tune
 * like a shouting crowd. No vocals.
 *
 * Only generic genre elements are used: power chords, the ska offbeat, an
 * eighth-note root bass, a bubbling organ. The guitar riffs, bass lines,
 * hooks and rhythms are this project's own writing and are not modelled on
 * any particular record.
 *
 * G major, 150 bpm, 4/4, 48 bars (76.8 s):
 *
 * - Intro (1–4): bass and drums, power-chord chugs from bar 3, fill.
 * - Verse, punk (5–12): "London Bridge" on overdriven lead guitar.
 * - Slide (13–16): C5–D5 power chords, then the drums drop to half time and
 *   the skank starts.
 * - Ska 1 (17–24): half-time; the tune on clean guitar over the skank, the
 *   organ bubble and a busy bass.
 * - Ska 2 (25–32): the tune on the organ, the skank and bubble continue.
 * - Build (33–36): ska turns back into punk with a snare roll into bar 37.
 * - Last pass, punk (37–44): the tune in unison on two overdriven guitars and
 *   an organ, with a crash on every bar.
 * - Tag (45–48): C5–D5–G5 hits, a big G chord on bar 48, and a quick fill
 *   that leads back to the intro.
 *
 * The melody's source and public-domain status are in `melodySources`.
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
const BARS = 48;
const at = (bar: number, beat = 0) => (bar - 1) * BAR + beat;
const opts = (bar: number, velocity: number) => ({
  at: at(bar),
  velocity,
  barBeats: BAR,
});
const inRange = (bar: number, from: number, to: number) =>
  bar >= from && bar <= to;

// --- Harmony -------------------------------------------------------------------------

interface Chord {
  /** Power chord: root, fifth, octave, for the distorted guitar. */
  power: string;
  /** Triad for the skank and the organ. */
  triad: string;
  /** Bass root for punk (low) and for ska (higher, where it moves around). */
  punkRoot: string;
  skaRoot: string;
  /** Semitones from the ska root to the chord's third. */
  third: number;
}

const CHORDS: Record<string, Chord> = {
  G: {
    power: "G2+D3+G3",
    triad: "B3+D4+G4",
    punkRoot: "G1",
    skaRoot: "G2",
    third: 4,
  },
  C: {
    power: "C3+G3+C4",
    triad: "C4+E4+G4",
    punkRoot: "C2",
    skaRoot: "C3",
    third: 4,
  },
  D: {
    power: "D3+A3+D4",
    triad: "D4+F#4+A4",
    punkRoot: "D2",
    skaRoot: "D3",
    third: 4,
  },
  Em: {
    power: "E3+B3+E4",
    triad: "E4+G4+B4",
    punkRoot: "E1",
    skaRoot: "E2",
    third: 3,
  },
};

/** One chord per bar. */
// prettier-ignore
const CHART = [
  // Intro
  "G", "G", "C", "D",
  // Verse
  "G", "C", "D", "Em", "G", "C", "D", "G",
  // Slide
  "C", "D", "G", "D",
  // Ska 1
  "G", "C", "D", "Em", "G", "C", "D", "G",
  // Ska 2
  "G", "C", "D", "Em", "G", "C", "D", "G",
  // Build
  "C", "D", "C", "D",
  // Last pass
  "G", "C", "D", "Em", "G", "C", "D", "G",
  // Tag
  "C", "D", "G", "G",
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

// --- Guitars -------------------------------------------------------------------------

/** Punk chug: the power chord on every eighth, palm-muted, bar downbeats hit harder. */
const chug = (name: string, bar: number, velocity: number): Note[] =>
  Array.from({ length: 8 }, (_, k) =>
    notesOf(
      CHORDS[name].power,
      at(bar, k * 0.5),
      0.4,
      k % 4 === 0 ? velocity + 10 : k % 2 === 0 ? velocity : velocity - 14,
    ),
  ).flat();

const PUNK_BARS: [number, number][] = [
  [3, 16], // intro chugs, verse, slide's first two bars
  [35, 48], // build's last two bars, last pass, tag (the tag gets its own hits)
];
const isPunkChug = (bar: number) =>
  PUNK_BARS.some(([from, to]) => inRange(bar, from, to)) &&
  !inRange(bar, 15, 16) &&
  !inRange(bar, 45, 48);

const chugs: Note[] = chords
  .filter(({ bar }) => isPunkChug(bar))
  .flatMap(({ name, bar }) => chug(name, bar, inRange(bar, 37, 44) ? 92 : 84));

/** Tag: hits on C5, D5, G5, then one big G chord; the guitars hold it on bar 48. */
const tagHits: Note[] = [
  // Bar 45 (C5): beats 1, 2&, 3, 4
  ...[0, 1.5, 2, 3].flatMap((b) =>
    notesOf(CHORDS.C.power, at(45, b), 0.45, 100),
  ),
  // Bar 46 (D5)
  ...[0, 1.5, 2, 3].flatMap((b) =>
    notesOf(CHORDS.D.power, at(46, b), 0.45, 100),
  ),
  // Bar 47 (G5): three hits and a rest
  ...[0, 1.5, 2].flatMap((b) => notesOf(CHORDS.G.power, at(47, b), 0.45, 104)),
  // Bar 48: the big chord, G5 with the octave doubled, rings for two beats.
  ...notesOf("G2+D3+G3+D4+G4", at(48), 2, 112),
];

/** Lead guitar on the tune: the verse and the last pass (on two guitars). */
const leadVerse: Note[] = tune(5, 96);
const leadLast: Note[] = tune(37, 100);

// --- Ska guitars and organ -----------------------------------------------------------

/** Skank: short upstroke triads on every offbeat eighth, from the slide into the build. */
const skank: Note[] = chords
  .filter(({ bar }) => inRange(bar, 15, 34))
  .flatMap(({ name, start }) =>
    [0.5, 1.5, 2.5, 3.5].flatMap((b) =>
      notesOf(CHORDS[name].triad, start + b, 0.25, 92),
    ),
  );

/** Clean guitar takes the tune in the first ska strain. */
const skaLead: Note[] = tune(17, 92);

/** Organ takes the tune in the second ska strain, and joins the last pass. */
const organTune: Note[] = [...tune(25, 88), ...tune(37, 84)];

/**
 * Organ bubble: in each beat, short hits on the "and" and the "a" (the offbeat
 * sixteenths), alternating a fifth and a third so the pulse bubbles.
 */
const bubble: Note[] = chords
  .filter(({ bar }) => inRange(bar, 15, 34))
  .flatMap(({ name, start }) => {
    const [, mid, top] = CHORDS[name].triad.split("+").map(noteToMidi);
    return [0, 1, 2, 3].flatMap((beat) => [
      { pitch: mid, start: start + beat + 0.5, beats: 0.2, velocity: 62 },
      { pitch: top, start: start + beat + 0.75, beats: 0.2, velocity: 46 },
    ]);
  });

// --- Bass ----------------------------------------------------------------------------

const midiOf = (name: string) => noteToMidi(name);

/** Punk: a root on every eighth, hard on the beat, with an approach note at phrase ends. */
const punkBass: Note[] = chords
  .filter(({ bar }) => !inRange(bar, 15, 34))
  .flatMap(({ name, start, bar }) => {
    const root = midiOf(CHORDS[name].punkRoot);
    const next = chords[bar];
    const approach = next ? midiOf(CHORDS[next.name].punkRoot) - 1 : root;
    const phraseEnd = [4, 8, 12, 14, 36, 44, 46].includes(bar);
    return Array.from({ length: 8 }, (_, k) => ({
      pitch: phraseEnd && k === 7 ? approach : root,
      start: start + k * 0.5,
      beats: 0.4375,
      velocity: k % 2 === 0 ? 102 : 84,
    }));
  });

/**
 * Ska: a busy melodic line of this project's own, built from the chord's
 * root, third, fifth, sixth, and octave. Three bar shapes cycle, each ending
 * with a chromatic approach to the next root.
 */
type Step = [
  beat: number,
  semitones: number | "third" | "approach",
  beats: number,
];
const SKA_SHAPES: Step[][] = [
  [
    [0, 0, 0.5],
    [0.5, 7, 0.5],
    [1, "third", 0.5],
    [1.5, 7, 0.5],
    [2, 12, 0.5],
    [2.5, 7, 0.5],
    [3, "third", 0.5],
    [3.5, "approach", 0.5],
  ],
  [
    [0, 0, 0.75],
    [0.75, 0, 0.25],
    [1, 7, 0.5],
    [1.5, 9, 0.5],
    [2, 12, 0.75],
    [2.75, 9, 0.25],
    [3, 7, 0.5],
    [3.5, "approach", 0.5],
  ],
  [
    [0, 0, 0.5],
    [0.5, 12, 0.5],
    [1, 7, 0.5],
    [1.5, "third", 0.5],
    [2, 0, 0.5],
    [2.5, -5, 0.5],
    [3, 0, 0.5],
    [3.5, "approach", 0.5],
  ],
];

const skaBass: Note[] = chords
  .filter(({ bar }) => inRange(bar, 15, 34))
  .flatMap(({ name, start, bar }) => {
    const c = CHORDS[name];
    const root = midiOf(c.skaRoot);
    const next = chords[bar];
    const nextRoot = next ? midiOf(CHORDS[next.name].skaRoot) : root;
    const approach = root <= nextRoot ? nextRoot - 1 : nextRoot + 1;
    const shape = SKA_SHAPES[(bar - 15) % 3];
    return shape.map(([beat, step, beats]) => {
      const pitch =
        step === "approach"
          ? approach
          : step === "third"
            ? root + c.third
            : root + step;
      return {
        pitch,
        start: start + beat,
        beats: beats * 0.9,
        velocity: beat % 1 === 0 ? 96 : 82,
      };
    });
  });

// --- Drums ---------------------------------------------------------------------------

const drums: Note[] = [];
const hit = (key: number, start: number, velocity: number, beats = 0.25) =>
  drums.push({ pitch: key, start, beats, velocity });

const isSka = (bar: number) => inRange(bar, 15, 34);
/** Bars whose last beat is a fill. */
const FILL_BARS = new Set([4, 12, 14, 16, 24, 32, 34, 36, 44, 48]);

for (let bar = 1; bar <= BARS; bar++) {
  const b = at(bar);
  const ska = isSka(bar);
  const fillBar = FILL_BARS.has(bar);
  const lastPass = inRange(bar, 37, 44);

  // Crash accents: section starts, every other bar of the verse, every bar of the last pass.
  const crash =
    [1, 5, 13, 17, 25, 33, 37, 45, 48].includes(bar) ||
    (inRange(bar, 5, 12) && bar % 2 === 1) ||
    lastPass;
  if (crash) hit(DRUMS.crash, b, lastPass ? 100 : 92, 1);

  if (!ska) {
    // Punk: straight eighths on the hat, kick on 1, 3 and the "and" of 3, snare on 2 and 4.
    for (let k = 0; k < 8; k++)
      hit(DRUMS.closedHat, b + k * 0.5, k % 2 ? 62 : 82);
    if (bar >= 2) {
      hit(DRUMS.kick, b, 110);
      hit(DRUMS.kick, b + 2, 104);
      if (bar % 2 === 0) hit(DRUMS.kick, b + 2.5, 92);
      hit(DRUMS.snare, b + 1, 116);
      if (!fillBar) hit(DRUMS.snare, b + 3, 116);
    } else {
      hit(DRUMS.kick, b, 110);
      hit(DRUMS.kick, b + 2, 104);
      hit(DRUMS.snare, b + 1, 100);
      hit(DRUMS.snare, b + 3, 100);
    }
  } else {
    // Ska, half time: kick on 1 (and a push), rimshot on 3, offbeat hat.
    hit(DRUMS.kick, b, 100);
    if (bar % 2 === 0) hit(DRUMS.kick, b + 1.5, 80);
    hit(DRUMS.sideStick, b + 2, 112);
    if (!fillBar) hit(DRUMS.sideStick, b + 3.5, 60);
    for (let beat = 0; beat < 4; beat++) {
      hit(DRUMS.closedHat, b + beat, 54);
      hit(beat === 3 ? DRUMS.openHat : DRUMS.closedHat, b + beat + 0.5, 78);
    }
  }

  if (fillBar) {
    const f = b + 3;
    if (bar === 36) {
      // The build: a snare roll in sixteenths, louder as it goes.
      for (let k = 0; k < 8; k++)
        hit(DRUMS.snare, b + 2 + k * 0.25, 70 + k * 7, 0.2);
    } else if (bar === 48) {
      // Quick fill into the loop: the big chord rings two beats, then sixteenths.
      hit(DRUMS.snare, f, 110);
      hit(DRUMS.snare, f + 0.25, 100);
      hit(DRUMS.highTom, f + 0.5, 108);
      hit(DRUMS.midTom, f + 0.75, 112);
    } else {
      hit(DRUMS.snare, f, 104);
      hit(DRUMS.snare, f + 0.25, 92);
      hit(DRUMS.highTom, f + 0.5, 104);
      hit(DRUMS.midTom, f + 0.75, 104);
    }
  }
}

// --- Track ---------------------------------------------------------------------------

const track: MusicTrack = {
  id: "london",
  task: "A3",
  title: "London Bridge Is Falling Down, Again (London theme)",
  description:
    'London theme: a late-70s London punk band that slides into ska, playing the public-domain tune "London Bridge Is Falling Down": distorted power chords over an eighth-note bass at 150 bpm, a half-time ska section (offbeat skank, rimshot, busy bass, organ bubble), and a last pass with a stacked unison of two lead guitars and an organ. Generic genre elements only; not modelled on any particular record.',
  bpm: 150,
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
      use: "Played note for note, in G major at 150 bpm: on overdriven lead guitar in the verse (bars 5–12), on clean guitar in the first ska strain (17–24), on the organ in the second (25–32), and in unison on two overdriven guitars and the organ in the last pass (37–44).",
      verification:
        "Typed from the standard traditional version and checked against its solfège by scripts/assets/__tests__/music-pd-melodies.test.ts. Not compared against a scan of the 1879 print, which was not reachable offline.",
    },
    {
      id: "london-punk-original",
      tune: "Everything else: power-chord chugs, tag, skank, organ bubble, ska bass line, drum patterns",
      source:
        'Original composition for this project, using only generic genre elements: power chords, the ska offbeat, an eighth-note root bass, a bubbling organ, a half-time rimshot. It deliberately does not imitate any specific Clash, Sex Pistols, Jam, Specials or Madness riff, bass line, hook or signature rhythm, including the guitar and bass figure of "London Calling", the bass line of "Guns of Brixton", the riff of "Should I Stay or Should I Go", or the figures of "White Riot".',
      publicDomain: "Not applicable: original to this project.",
      use: "Accompaniment, the ska bass line, the tag, and the drums.",
    },
  ],
  sections: [
    {
      bar: 1,
      name: "Intro",
      description:
        "Eighth-note root bass and drums, power-chord chugs from bar 3, fill",
    },
    {
      bar: 5,
      name: "Verse (punk)",
      description:
        "London Bridge on overdriven lead guitar over power chords, crash accents",
    },
    {
      bar: 13,
      name: "Slide",
      description:
        "C5-D5 power chords, then half-time drums and the first skanks",
    },
    {
      bar: 17,
      name: "Ska 1",
      description:
        "Half time: tune on clean guitar, offbeat skank, organ bubble, busy bass, rimshot on 3",
    },
    {
      bar: 25,
      name: "Ska 2",
      description: "The tune moves to the organ; skank and bubble continue",
    },
    {
      bar: 33,
      name: "Build",
      description: "Ska turns back into punk with a snare roll into bar 37",
    },
    {
      bar: 37,
      name: "Last pass (punk)",
      description:
        "Stacked unison: two overdriven guitars and organ on the tune, a crash on every bar",
    },
    {
      bar: 45,
      name: "Tag",
      description:
        "C5-D5-G5 hits, a big G chord on bar 48, a quick fill into the loop",
    },
  ],
  parts: [
    {
      name: "Distortion guitar (power chords)",
      channel: 1,
      program: GM["Distortion Guitar"],
      volume: 78,
      pan: 40,
      reverb: 18,
      notes: [...chugs, ...tagHits],
    },
    {
      name: "Overdriven guitar (lead)",
      channel: 2,
      program: GM["Overdriven Guitar"],
      volume: 76,
      pan: 56,
      reverb: 20,
      notes: [...leadVerse, ...leadLast],
    },
    {
      name: "Overdriven guitar (unison double)",
      channel: 3,
      program: GM["Overdriven Guitar"],
      volume: 70,
      pan: 88,
      reverb: 20,
      notes: leadLast,
    },
    {
      name: "Muted guitar (skank)",
      channel: 4,
      program: GM["Electric Guitar (muted)"],
      volume: 112,
      pan: 34,
      reverb: 22,
      notes: skank,
    },
    {
      name: "Clean guitar (ska lead)",
      channel: 5,
      program: GM["Electric Guitar (clean)"],
      volume: 100,
      pan: 70,
      reverb: 24,
      notes: skaLead,
    },
    {
      name: "Rock organ (tune)",
      channel: 6,
      program: GM["Rock Organ"],
      volume: 100,
      pan: 76,
      reverb: 24,
      notes: organTune,
    },
    {
      name: "Percussive organ (bubble)",
      channel: 7,
      program: GM["Percussive Organ"],
      volume: 120,
      pan: 58,
      reverb: 22,
      notes: bubble,
    },
    {
      name: "Electric bass",
      channel: 8,
      program: GM["Electric Bass (pick)"],
      volume: 96,
      pan: 64,
      reverb: 12,
      notes: [...punkBass, ...skaBass],
    },
    {
      name: "Drums, rimshot, and crashes",
      channel: 10,
      program: DRUM_KITS.standard,
      volume: 112,
      pan: 64,
      reverb: 20,
      notes: drums,
    },
  ],
};

export default track;
