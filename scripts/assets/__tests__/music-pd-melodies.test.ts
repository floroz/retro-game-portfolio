// @vitest-environment node
import { describe, expect, test } from "vitest";
import london from "../../../assets-src/audio/music/london";
import merseybeat from "../../../assets-src/audio/music/london-merseybeat";
import zurich from "../../../assets-src/audio/music/zurich";
import { GM, checkTrack, noteToMidi, type Note } from "../music";

/**
 * The public-domain tunes quoted by the London and Zurich themes, checked
 * against transcriptions written out separately here, so a typo in a track
 * file can't pass for the tune. Nothing in either track is taken from a
 * copyrighted song: the two borrowed melodies are the traditional nursery tune
 * "London Bridge Is Falling Down" and the opening of the Ranz des Vaches as
 * engraved in Rousseau's Dictionnaire de musique (1767/1768).
 */

const part = (track: typeof london, name: string) => {
  const p = track.parts.find((x) => x.name === name);
  if (!p) throw new Error(`no part "${name}"`);
  return p;
};

const inBars = (notes: Note[], from: number, to: number, barBeats: number) =>
  notes
    .filter(
      (n) => n.start >= (from - 1) * barBeats && n.start < (to - 1) * barBeats,
    )
    .sort((a, b) => a.start - b.start || a.pitch - b.pitch);

// The traditional tune in G major, two 4/4 bars per line. Pitches are MIDI
// numbers (D5 is 74), durations are quarter-note beats.
//   so la so fa mi fa so | re mi fa | mi fa so | (again) | re so | mi do
const LINE_1: [number, number][] = [
  [74, 1.5],
  [76, 0.5],
  [74, 1],
  [72, 1],
  [71, 1],
  [72, 1],
  [74, 2],
];
const LINE_2: [number, number][] = [
  [69, 1],
  [71, 1],
  [72, 2],
  [71, 1],
  [72, 1],
  [74, 2],
];
const LINE_4: [number, number][] = [
  [69, 2],
  [74, 2],
  [71, 2],
  [67, 2],
];
const TUNE = [...LINE_1, ...LINE_2, ...LINE_1, ...LINE_4];

const expected = (firstBar: number) => {
  let start = (firstBar - 1) * 4;
  return TUNE.map(([pitch, beats]) => {
    const n = { pitch, start, beats };
    start += beats;
    return n;
  });
};
const summary = (notes: Note[]) =>
  notes.map(({ pitch, start, beats }) => ({ pitch, start, beats }));

describe("both tracks", () => {
  test("pass the track checks and keep to 60–90 s", () => {
    for (const track of [london, merseybeat, zurich]) {
      expect(checkTrack(track)).toEqual([]);
      const seconds = (track.bars * (track.meter?.[0] ?? 4) * 60) / track.bpm;
      expect(seconds).toBeGreaterThanOrEqual(60);
      expect(seconds).toBeLessThanOrEqual(90);
    }
  });

  test("record a melody source and public-domain status for every tune", () => {
    for (const track of [london, merseybeat, zurich]) {
      expect(track.melodySources?.length).toBeGreaterThan(0);
      for (const s of track.melodySources ?? []) {
        expect(s.source.length).toBeGreaterThan(20);
        expect(s.publicDomain.length).toBeGreaterThan(5);
      }
    }
  });
});

describe("London (Merseybeat cut, kept but unused): London Bridge Is Falling Down", () => {
  test("the guitar plays the whole tune in bars 5–12", () => {
    const guitar = part(merseybeat, "Electric guitar (clean)").notes;
    expect(summary(inBars(guitar, 5, 13, 4))).toEqual(expected(5));
  });

  test("the organ plays it in bars 17–24", () => {
    const organ = part(merseybeat, "Combo organ (lead)").notes;
    expect(summary(inBars(organ, 17, 25, 4))).toEqual(expected(17));
  });

  test("the guitar returns to it in bars 33–40, the last note cut short for the fill", () => {
    const guitar = part(merseybeat, "Electric guitar (clean)").notes;
    const want = expected(33);
    want[want.length - 1] = { ...want[want.length - 1], beats: 1 };
    expect(summary(inBars(guitar, 33, 41, 4))).toEqual(want);
  });

  test("uses the agreed instruments: clean and 12-string guitars, combo organ, bass, claps", () => {
    const programs = merseybeat.parts.map((p) => [p.bank ?? 0, p.program]);
    expect(programs).toContainEqual([0, GM["Electric Guitar (clean)"]]);
    expect(programs).toContainEqual([8, 25]);
    expect(programs).toContainEqual([0, GM["Percussive Organ"]]);
    expect(programs).toContainEqual([0, GM["Drawbar Organ"]]);
    expect(programs).toContainEqual([0, GM["Electric Bass (finger)"]]);
    const drums = part(merseybeat, "Drums, tambourine, and claps").notes;
    const keys = new Set(drums.map((n) => n.pitch));
    // Kick, snare, closed hat, tambourine, hand clap.
    for (const key of [36, 38, 42, 54, 39]) expect(keys).toContain(key);
    // Hand claps only in A' (bars 17–24).
    const claps = drums.filter((n) => n.pitch === 39);
    expect(Math.min(...claps.map((n) => n.start))).toBeGreaterThanOrEqual(64);
    expect(Math.max(...claps.map((n) => n.start))).toBeLessThan(96);
  });

  test("ends on a G chord with an added sixth (E)", () => {
    const last = inBars(
      part(merseybeat, "Combo organ (pad and stabs)").notes,
      40,
      41,
      4,
    ).filter((n) => n.start >= 39 * 4 + 2);
    expect(last.map((n) => n.pitch % 12).sort((a, b) => a - b)).toEqual([
      4, 7, 11,
    ]);
  });
});

describe("London (punk/ska cut): London Bridge Is Falling Down", () => {
  const lead = part(london, "Overdriven guitar (lead)").notes;
  const double = part(london, "Overdriven guitar (unison double)").notes;
  const clean = part(london, "Clean guitar (ska lead)").notes;
  const organ = part(london, "Rock organ (tune)").notes;

  test("the overdriven lead guitar plays the tune in the verse, bars 5–12", () => {
    expect(summary(inBars(lead, 5, 13, 4))).toEqual(expected(5));
  });

  test("the clean guitar plays it in the first ska strain, bars 17–24", () => {
    expect(summary(inBars(clean, 17, 25, 4))).toEqual(expected(17));
  });

  test("the organ plays it in the second ska strain, bars 25–32", () => {
    expect(summary(inBars(organ, 25, 33, 4))).toEqual(expected(25));
  });

  test("the last pass, bars 37–44, stacks two guitars and the organ in unison", () => {
    for (const notes of [lead, double, organ])
      expect(summary(inBars(notes, 37, 45, 4))).toEqual(expected(37));
  });

  test("runs at a punk tempo with the agreed instruments", () => {
    expect(london.bpm).toBeGreaterThanOrEqual(150);
    expect(london.bpm).toBeLessThanOrEqual(165);
    const programs = london.parts
      .filter((p) => p.channel !== 10)
      .map((p) => p.program);
    for (const name of [
      "Distortion Guitar",
      "Overdriven Guitar",
      "Electric Guitar (muted)",
      "Electric Guitar (clean)",
      "Percussive Organ",
      "Rock Organ",
      "Electric Bass (pick)",
    ] as const)
      expect(programs).toContain(GM[name]);
  });

  test("the verse bass is eighth-note roots; the ska bass is busier", () => {
    const bass = part(london, "Electric bass").notes;
    const verseBar = inBars(bass, 6, 7, 4);
    expect(verseBar).toHaveLength(8);
    expect(new Set(verseBar.map((n) => n.pitch)).size).toBe(1);
    // Ska bars have 8 notes or more and more than three different pitches.
    for (let bar = 17; bar <= 32; bar++) {
      const notes = inBars(bass, bar, bar + 1, 4);
      expect(notes.length, `bar ${bar}`).toBeGreaterThanOrEqual(8);
      expect(
        new Set(notes.map((n) => n.pitch)).size,
        `bar ${bar}`,
      ).toBeGreaterThan(3);
    }
  });

  test("the ska section is half time: rimshot on 3, skank on the offbeats", () => {
    const drums = part(london, "Drums, rimshot, and crashes").notes;
    const barNotes = inBars(drums, 18, 19, 4);
    const rim = barNotes.filter((n) => n.pitch === 37);
    expect(rim.some((n) => n.start % 4 === 2)).toBe(true);
    expect(barNotes.some((n) => n.pitch === 38)).toBe(false);
    const skank = inBars(part(london, "Muted guitar (skank)").notes, 18, 19, 4);
    expect(new Set(skank.map((n) => n.start % 1))).toEqual(new Set([0.5]));
  });

  test("ends on a big G chord and a quick fill", () => {
    const chord = inBars(
      part(london, "Distortion guitar (power chords)").notes,
      48,
      49,
      4,
    );
    expect(new Set(chord.map((n) => n.pitch % 12))).toEqual(new Set([7, 2]));
    const drums = inBars(
      part(london, "Drums, rimshot, and crashes").notes,
      48,
      49,
      4,
    );
    expect(drums.filter((n) => n.start >= 47 * 4 + 3).length).toBeGreaterThan(
      3,
    );
  });
});

describe("Zurich: the Ranz des Vaches", () => {
  // Rousseau's plate (Planche N, "Air Suisse appellé le Ranz des Vaches",
  // Adagio, 3/8, A major): [pitch in A major as engraved, length in written
  // eighths]. Sixteenth-note triplets are a third of an eighth each, and the
  // two opening sixteenths of bar 4 are a half of an eighth each.
  const PLATE: [number, number][] = [
    [74, 1], // bar 1: D5 F#5 G#5
    [78, 1],
    [80, 1],
    [81, 2], // bar 2: A5, then B5 A5 G#5
    [83, 1 / 3],
    [81, 1 / 3],
    [80, 1 / 3],
    [81, 2], // bar 3: the same
    [83, 1 / 3],
    [81, 1 / 3],
    [80, 1 / 3],
    [81, 0.5], // bar 4: A5 F#5 (sixteenths), D5 (quarter)
    [78, 0.5],
    [74, 2],
    [69, 3], // bar 5: A4, dotted quarter
  ];
  /** The call sounds in G, a tone below the plate, and two octaves down. */
  const SHIFT = -26;
  const EIGHTH = 1.5;

  const call = () => {
    const horn = part(zurich, "Alphorn (call)").notes;
    return inBars(horn, 1, 9, 3);
  };

  test("the alphorn plays the plate's pitches and proportions", () => {
    const played = call();
    expect(played).toHaveLength(PLATE.length);
    let start = 0;
    PLATE.forEach(([pitch, eighths], i) => {
      expect(played[i].pitch).toBe(pitch + SHIFT);
      expect(played[i].start).toBeCloseTo(start * EIGHTH, 9);
      if (i < PLATE.length - 1)
        expect(played[i].beats).toBeCloseTo(eighths * EIGHTH, 9);
      start += eighths;
    });
    // The last note (A4, bar 5) is the plate's dotted quarter, held longer.
    expect(played[played.length - 1].beats).toBeGreaterThanOrEqual(3 * EIGHTH);
  });

  test("the call is in the alphorn's low register, on French Horn", () => {
    const horn = part(zurich, "Alphorn (call)");
    expect(horn.program).toBe(GM["French Horn"]);
    for (const n of horn.notes) {
      expect(n.pitch).toBeGreaterThanOrEqual(noteToMidi("G2"));
      expect(n.pitch).toBeLessThanOrEqual(noteToMidi("A3"));
    }
  });

  test("the loop ends on the alphorn's low tonic", () => {
    const horn = part(zurich, "Alphorn (call)").notes;
    const last = horn[horn.length - 1];
    expect(last.pitch).toBe(noteToMidi("G2"));
    expect(last.start + last.beats).toBeGreaterThan(39 * 3 + 2);
  });

  test("the yodel flips between a low clarinet and a high ocarina across sixths and octaves", () => {
    const chest = inBars(
      part(zurich, "Clarinet (tune and chest voice)").notes,
      25,
      33,
      3,
    );
    const head = inBars(part(zurich, "Ocarina (head voice)").notes, 25, 33, 3)
      // Leave out the 32nd-note grace notes and slides.
      .filter((n) => n.beats >= 0.2);
    expect(chest.length).toBeGreaterThan(10);
    expect(head.length).toBeGreaterThan(10);
    expect(part(zurich, "Ocarina (head voice)").program).toBe(GM["Ocarina"]);
    // Every head note sits a sixth, an octave, or an octave and a sixth or
    // more above the chest note sounding just before it.
    const SIXTHS_AND_OCTAVES = new Set([8, 9, 12, 20, 21, 24]);
    let flips = 0;
    for (const h of head) {
      const c = [...chest].reverse().find((n) => n.start <= h.start);
      if (!c) continue;
      const interval = h.pitch - c.pitch;
      if (SIXTHS_AND_OCTAVES.has(interval)) flips++;
    }
    expect(flips).toBeGreaterThanOrEqual(head.length - 4);
    // Slides: runs of 32nd notes in the ocarina.
    const slides = part(zurich, "Ocarina (head voice)").notes.filter(
      (n) => n.beats === 0.125,
    );
    expect(slides.length).toBeGreaterThanOrEqual(8);
  });

  test("uses no sung-voice General MIDI instruments", () => {
    const voices = [
      GM["Choir Aahs"],
      GM["Voice Oohs"],
      GM["Synth Voice"],
      GM["Pad 4 (choir)"],
      GM["Lead 6 (voice)"],
    ];
    for (const p of zurich.parts.filter((x) => x.channel !== 10))
      expect(voices).not.toContain(p.program);
  });

  test("has cowbells and a bass on beat 1 of every Ländler bar", () => {
    const cowbells = part(zurich, "Cowbell").notes;
    expect(cowbells.length).toBeGreaterThan(8);
    expect(cowbells.every((n) => n.pitch === 56)).toBe(true);
    const bass = part(zurich, "Double bass").notes;
    expect(bass.every((n) => n.start % 3 === 0)).toBe(true);
    expect(bass).toHaveLength(28);
  });
});
