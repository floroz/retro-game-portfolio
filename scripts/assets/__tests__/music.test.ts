// @vitest-environment node
import { describe, expect, test } from "vitest";
import hall from "../../../assets-src/audio/music/hall";
import { MOTIF, motif } from "../../../assets-src/audio/music/motif";
import {
  CHANNELS,
  FLUIDR3_PRESETS,
  GM,
  GM_PROGRAMS,
  PPQ,
  SAMPLE_RATE,
  beatsToTicks,
  buildMidi,
  checkTrack,
  codecNoiseDb,
  decodeF32,
  encodeWavFloat,
  foldTail,
  layoutLoop,
  loopPoints,
  loopTiming,
  midiToNote,
  noteToMidi,
  parseEbur128,
  phrase,
  phraseBeats,
  presetName,
  seamReport,
  swing,
  type MusicTrack,
} from "../music";

// --- A minimal Standard MIDI File reader, to check what buildMidi writes ---

interface ParsedNote {
  channel: number;
  pitch: number;
  velocity: number;
  on: number;
  off: number;
}

function readMidi(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (at: number) =>
    String.fromCharCode(...bytes.subarray(at, at + 4));
  expect(text(0)).toBe("MThd");
  const format = view.getUint16(8);
  const trackCount = view.getUint16(10);
  const division = view.getUint16(12);
  let pos = 14;
  const notes: ParsedNote[] = [];
  const programs = new Map<number, number>();
  const controllers: {
    channel: number;
    cc: number;
    value: number;
    tick: number;
  }[] = [];
  const markers: { text: string; tick: number }[] = [];
  let tempo = 0;
  let length = 0;
  for (let t = 0; t < trackCount; t++) {
    expect(text(pos)).toBe("MTrk");
    const end = pos + 8 + view.getUint32(pos + 4);
    pos += 8;
    let tick = 0;
    let status = 0;
    const open = new Map<string, { on: number; velocity: number }>();
    const vlq = () => {
      let v = 0;
      for (;;) {
        const b = bytes[pos++];
        v = (v << 7) | (b & 0x7f);
        if (!(b & 0x80)) return v;
      }
    };
    while (pos < end) {
      tick += vlq();
      if (bytes[pos] & 0x80) status = bytes[pos++];
      if (status === 0xff) {
        const type = bytes[pos++];
        const len = vlq();
        const data = bytes.subarray(pos, pos + len);
        pos += len;
        if (type === 0x51) tempo = (data[0] << 16) | (data[1] << 8) | data[2];
        if (type === 0x06)
          markers.push({ text: String.fromCharCode(...data), tick });
        if (type === 0x2f) length = Math.max(length, tick);
        continue;
      }
      const kind = status & 0xf0;
      const channel = (status & 0x0f) + 1;
      if (kind === 0xc0) {
        programs.set(channel, bytes[pos++]);
      } else if (kind === 0xb0) {
        controllers.push({
          channel,
          cc: bytes[pos],
          value: bytes[pos + 1],
          tick,
        });
        pos += 2;
      } else if (kind === 0x90 || kind === 0x80) {
        const pitch = bytes[pos];
        const velocity = bytes[pos + 1];
        pos += 2;
        const key = `${channel}:${pitch}`;
        if (kind === 0x90 && velocity > 0) {
          expect(open.has(key), `overlapping ${key} at ${tick}`).toBe(false);
          open.set(key, { on: tick, velocity });
        } else {
          const o = open.get(key);
          expect(o, `note-off without note-on ${key} at ${tick}`).toBeDefined();
          notes.push({
            channel,
            pitch,
            velocity: o!.velocity,
            on: o!.on,
            off: tick,
          });
          open.delete(key);
        }
      } else {
        throw new Error(`unexpected status ${status.toString(16)}`);
      }
    }
    expect(open.size).toBe(0);
  }
  notes.sort(
    (a, b) => a.on - b.on || a.channel - b.channel || a.pitch - b.pitch,
  );
  return {
    format,
    trackCount,
    division,
    tempo,
    notes,
    programs,
    controllers,
    markers,
    length,
  };
}

const tiny = (over: Partial<MusicTrack> = {}): MusicTrack => ({
  id: "tiny",
  task: "A1",
  title: "Tiny",
  bpm: 100,
  bars: 2,
  key: "C major",
  parts: [
    {
      name: "Lead",
      channel: 1,
      program: GM["Vibraphone"],
      velocity: 80,
      notes: phrase("C4:1 C4:1 E4:.5@100 G4:1.5 | C4+E4+G4:4"),
    },
    {
      name: "Drums",
      channel: 10,
      program: 40,
      notes: phrase("n36:1 r:1 n36:1"),
    },
  ],
  ...over,
});

describe("notation", () => {
  test("note names map to MIDI numbers and back", () => {
    expect(noteToMidi("C4")).toBe(60);
    expect(noteToMidi("A4")).toBe(69);
    expect(noteToMidi("Bb1")).toBe(34);
    expect(noteToMidi("F#3")).toBe(54);
    expect(noteToMidi("C-1")).toBe(0);
    expect(() => noteToMidi("H2")).toThrow();
    expect(noteToMidi("G9")).toBe(127);
    expect(() => noteToMidi("A9")).toThrow(/range/);
    expect(midiToNote(70)).toBe("Bb4");
    expect(midiToNote(60)).toBe("C4");
  });

  test("phrases parse pitches, chords, rests, velocities, and triplets", () => {
    const notes = phrase("A4:.5 r:.5 C4+E4:1@100 D4:1/3", {
      at: 8,
      velocity: 70,
    });
    expect(notes).toEqual([
      { pitch: 69, start: 8, beats: 0.5, velocity: 70 },
      { pitch: 60, start: 9, beats: 1, velocity: 100 },
      { pitch: 64, start: 9, beats: 1, velocity: 100 },
      { pitch: 62, start: 10, beats: 1 / 3, velocity: 70 },
    ]);
    expect(phrase("C4:1", { transpose: 12 })[0].pitch).toBe(72);
    expect(phrase("n42:.25")[0].pitch).toBe(42);
    expect(phraseBeats("A4:.5 r:1.5 | C4+E4:2")).toBe(4);
  });

  test("bar lines catch miscounted bars", () => {
    expect(() => phrase("C4:1 D4:1 E4:1 | F4:1")).toThrow(/bar boundary/);
    expect(() =>
      phrase("C4:1 D4:1 E4:1 | F4:1", { barBeats: 3 }),
    ).not.toThrow();
    expect(() => phrase("C4")).toThrow();
    expect(() => phrase("C4:0")).toThrow(/positive/);
    expect(() => phrase("C4:1@200")).toThrow(/velocity/);
  });

  test("swing moves off-beat eighths and keeps the grid", () => {
    const swung = swing(phrase("C4:.5 D4:.5 E4:1"), 2 / 3);
    const want = [
      [0, 2 / 3],
      [2 / 3, 1 / 3],
      [1, 1],
    ];
    swung.forEach((n, i) => {
      expect(n.start).toBeCloseTo(want[i][0], 9);
      expect(n.beats).toBeCloseTo(want[i][1], 9);
    });
    // Swung eighths still land on whole ticks.
    expect(swung.map((n) => beatsToTicks(n.start))).toEqual([0, 320, 480]);
  });
});

describe("timing and loop points", () => {
  test("beats become whole ticks or fail", () => {
    expect(beatsToTicks(1)).toBe(PPQ);
    expect(beatsToTicks(1 / 3)).toBe(160);
    expect(beatsToTicks(0.45)).toBe(216);
    expect(() => beatsToTicks(1 / 7)).toThrow(/whole number of ticks/);
  });

  test("loop length is a whole number of samples", () => {
    const t = loopTiming({ bpm: 100, bars: 32 });
    expect(t.beatFrames).toBe(28800);
    expect(t.loopBeats).toBe(128);
    expect(t.loopSeconds).toBeCloseTo(76.8, 9);
    expect(t.loopFrames).toBe(3_686_400);
    expect(loopTiming({ bpm: 90, bars: 4, meter: [6, 8] }).loopBeats).toBe(12);
    // 48000 * 60 / 7 isn't whole.
    expect(() => loopTiming({ bpm: 7, bars: 1 })).toThrow(/samples per beat/);
  });

  test("loop points sit after the pre-roll", () => {
    const p = loopPoints(3_686_400, 28_800, 28_800);
    expect(p).toEqual({
      loopStart: 0.6,
      loopEnd: 77.4,
      loopStartFrame: 28_800,
      loopEndFrame: 3_715_200,
      fileFrames: 3_744_000,
      sampleRate: SAMPLE_RATE,
    });
    expect(() => loopPoints(100, 200, 0)).toThrow(/shorter/);
    expect(() => loopPoints(100.5, 0, 0)).toThrow(/whole/);
  });
});

describe("MIDI generation", () => {
  test("writes tempo, programs, controllers, and every note at its tick", () => {
    const track = tiny();
    const midi = readMidi(buildMidi(track, { leadInBeats: 1, tailBeats: 4 }));
    expect(midi.format).toBe(1);
    expect(midi.trackCount).toBe(3);
    expect(midi.division).toBe(PPQ);
    expect(midi.tempo).toBe(600_000); // 100 bpm
    expect(midi.programs.get(1)).toBe(GM["Vibraphone"]);
    expect(midi.programs.get(10)).toBe(40);
    // Chorus is off on every channel.
    expect(
      midi.controllers.filter((c) => c.cc === 93).map((c) => c.value),
    ).toEqual([0, 0]);
    expect(midi.markers).toEqual([
      { text: "loopStart", tick: PPQ },
      { text: "loopEnd", tick: PPQ + 8 * PPQ },
      { text: "tailEnd", tick: PPQ + 12 * PPQ },
    ]);
    expect(midi.length).toBe(13 * PPQ);

    const expected = track.parts
      .flatMap((p) =>
        p.notes.map((n) => ({
          channel: p.channel,
          pitch: n.pitch,
          velocity: n.velocity ?? p.velocity ?? 90,
          on: PPQ + n.start * PPQ,
          off: PPQ + (n.start + n.beats) * PPQ,
        })),
      )
      .sort(
        (a, b) => a.on - b.on || a.channel - b.channel || a.pitch - b.pitch,
      );
    expect(midi.notes).toEqual(expected);
  });

  test("selects a soundfont bank before the program change", () => {
    const track = tiny({
      parts: [
        {
          name: "Mandolin",
          channel: 1,
          ...FLUIDR3_PRESETS["Mandolin"],
          notes: phrase("C4:1"),
        },
        { name: "Guitar", channel: 2, program: 24, notes: phrase("C4:1") },
      ],
    });
    expect(checkTrack(track)).toEqual([]);
    const bytes = buildMidi(track);
    const midi = readMidi(bytes);
    expect(midi.programs.get(1)).toBe(25);
    const banks = midi.controllers.filter((c) => c.cc === 0);
    expect(banks).toEqual([{ channel: 1, cc: 0, value: 16, tick: 0 }]);
    // CC0 on channel 1 (0xb0 0x00 0x10) comes before its program change (0xc0 25).
    const hex = Buffer.from(bytes).toString("hex");
    expect(hex.indexOf("b00010")).toBeGreaterThan(-1);
    expect(hex.indexOf("b00010")).toBeLessThan(hex.indexOf("c019"));
  });

  test("a part without a bank writes no bank select", () => {
    const midi = readMidi(buildMidi(tiny()));
    expect(midi.controllers.filter((c) => c.cc === 0)).toEqual([]);
  });

  test("names FluidR3_GM's variation presets", () => {
    expect(presetName(25, 16)).toBe("Mandolin");
    expect(presetName(21, 8)).toBe("Italian Accordion");
    expect(presetName(21)).toBe("Accordion");
    expect(presetName(3, 16)).toBe("bank 16 program 3");
  });

  test("a repeated pitch is released before it's struck again", () => {
    const midi = readMidi(buildMidi(tiny()));
    const cs = midi.notes.filter((n) => n.channel === 1 && n.pitch === 60);
    expect(cs.map((n) => [n.on, n.off])).toEqual([
      [480, 960],
      [960, 1440],
      [2400, 4320],
    ]);
  });

  test("checkTrack catches notes past the loop, bad channels, and off-grid timing", () => {
    expect(checkTrack(tiny())).toEqual([]);
    const bad = tiny({
      id: "Bad_Id",
      parts: [
        { name: "a", channel: 1, program: 0, notes: phrase("C4:9") },
        {
          name: "b",
          channel: 1,
          program: 200,
          notes: [{ pitch: 60, start: 1 / 7, beats: 1 }],
        },
        { name: "c", channel: 10, program: 0, bank: 200, notes: [] },
      ],
    });
    const errors = checkTrack(bad).join("\n");
    expect(errors).toMatch(/kebab-case/);
    expect(errors).toMatch(/runs past the end/);
    expect(errors).toMatch(/shares channel 1/);
    expect(errors).toMatch(/program must be 0–127/);
    expect(errors).toMatch(/whole number of ticks/);
    expect(errors).toMatch(/bank must be 0–127/);
    expect(errors).toMatch(/channel 10 plays drum kits/);
  });
});

describe("loop building", () => {
  test("folding a tail gives what the second pass sounds like", () => {
    // A loop of 4 frames (mono), followed by a 3-frame tail.
    const render = new Float32Array([1, 2, 3, 4, 0.5, 0.25, 0.125]);
    expect(Array.from(foldTail(render, 0, 4, 1))).toEqual([
      1.5, 2.25, 3.125, 4,
    ]);
    // With an offset (a lead-in) and a tail longer than the loop, it wraps again.
    const long = new Float32Array([9, 1, 1, 1, 1, 1, 1]);
    expect(Array.from(foldTail(long, 1, 2, 1))).toEqual([3, 3]);
  });

  test("layout puts the loop's end before it and its start after it", () => {
    const loop = new Float32Array([1, 2, 3, 4, 5]);
    expect(Array.from(layoutLoop(loop, 2, 1, 1))).toEqual([
      4, 5, 1, 2, 3, 4, 5, 1,
    ]);
    // Stereo frames stay together.
    const st = new Float32Array([1, -1, 2, -2, 3, -3]);
    expect(Array.from(layoutLoop(st, 1, 1, 2))).toEqual([
      3, -3, 1, -1, 2, -2, 3, -3, 1, -1,
    ]);
  });

  test("a laid-out loop is identical around both loop points", () => {
    const frames = 4800;
    const loop = new Float32Array(frames * CHANNELS);
    for (let i = 0; i < frames; i++) {
      loop[i * 2] = Math.sin((2 * Math.PI * 7 * i) / frames);
      loop[i * 2 + 1] = Math.cos((2 * Math.PI * 3 * i) / frames);
    }
    const file = layoutLoop(loop, 480, 480);
    const p = loopPoints(frames, 480, 480);
    const r = seamReport(file, p.loopStartFrame, p.loopEndFrame, 400);
    expect(r.identical).toBe(true);
    expect(r.differenceDb).toBeNull();
    expect(r.bestLag).toBe(0);
    expect(r.wrapStepRatio).toBeLessThan(1.01);
  });

  test("a click at the wrap shows up in the seam report", () => {
    const frames = 4800;
    const loop = new Float32Array(frames * CHANNELS);
    // A ramp: the jump from its end back to its start is a click.
    for (let i = 0; i < frames; i++)
      loop[i * 2] = loop[i * 2 + 1] = i / frames - 0.5;
    const file = new Float32Array((frames + 960) * CHANNELS);
    file.set(loop, 480 * CHANNELS);
    const r = seamReport(file, 480, 480 + frames, 400);
    expect(r.identical).toBe(false);
    expect(r.wrapStepRatio).toBeGreaterThan(10);
  });

  test("codec noise compares a decode with its source", () => {
    const src = new Float32Array([1, 1, 1, 1]);
    const dec = new Float32Array([1.1, 0.9, 1.1, 0.9]);
    expect(codecNoiseDb(dec, src, 0, 2)).toBeCloseTo(-20, 5);
  });
});

describe("files and meters", () => {
  test("float WAV header and data round-trip", () => {
    const s = new Float32Array([0, 0.5, -0.5, 1]);
    const wav = encodeWavFloat(s, 2, 48000);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.readUInt16LE(20)).toBe(3);
    expect(wav.readUInt16LE(22)).toBe(2);
    expect(wav.readUInt32LE(24)).toBe(48000);
    expect(wav.readUInt32LE(40)).toBe(16);
    expect(Array.from(decodeF32(wav.subarray(44)))).toEqual([0, 0.5, -0.5, 1]);
  });

  test("parses ffmpeg's EBU R128 summary", () => {
    const stderr = `[Parsed_ebur128_0 @ 0x1] t: 1.0 M: -30 S: -30 I: -31.0 LUFS LRA: 0.0 LU
[Parsed_ebur128_0 @ 0x1] Summary:

  Integrated loudness:
    I:         -20.4 LUFS
    Threshold: -30.6 LUFS

  Loudness range:
    LRA:         2.2 LU
    Threshold: -40.6 LUFS
    LRA low:   -21.4 LUFS
    LRA high:  -19.2 LUFS

  True peak:
    Peak:       -5.9 dBFS`;
    expect(parseEbur128(stderr)).toEqual({
      integratedLufs: -20.4,
      lraLu: 2.2,
      truePeakDbtp: -5.9,
    });
    expect(() => parseEbur128("nothing")).toThrow();
  });
});

describe("the motif and the Hall theme", () => {
  test("the motif is two bars in F major", () => {
    expect(phraseBeats(MOTIF)).toBe(8);
    expect(motif().map((n) => midiToNote(n.pitch))).toEqual([
      "A4",
      "C5",
      "F5",
      "E5",
      "C5",
      "A4",
      "Bb4",
      "A4",
      "G4",
    ]);
  });

  test("the Hall theme meets the art spec: 60–90 s, a bass line, sparse GM", () => {
    expect(checkTrack(hall)).toEqual([]);
    const { loopSeconds } = loopTiming(hall);
    expect(loopSeconds).toBeGreaterThanOrEqual(60);
    expect(loopSeconds).toBeLessThanOrEqual(90);
    expect(hall.loop ?? true).toBe(true);
    expect(hall.parts.length).toBeLessThanOrEqual(8);
    const bass = hall.parts.find((p) =>
      GM_PROGRAMS[p.program].includes("Bass"),
    );
    expect(bass).toBeDefined();
    expect(Math.max(...bass!.notes.map((n) => n.pitch))).toBeLessThan(
      noteToMidi("E3"),
    );
  });

  test("the Hall theme opens with the motif, an octave up, and brings it back", () => {
    const lead = hall.parts[0].notes;
    const at = (beat: number) =>
      lead
        .filter((n) => n.start >= beat && n.start < beat + 8)
        .map((n) => [n.start - beat, n.pitch - 12, n.beats]);
    const m = motif().map((n) => [n.start, n.pitch, n.beats]);
    expect(at(0)).toEqual(m); // bar 1
    expect(at(24 * 4)).toEqual(m); // bar 25
    const flute = hall.parts.find((p) => p.name.startsWith("Flute"))!.notes;
    expect(
      flute
        .filter((n) => n.start < 8 * 4 + 8)
        .map((n) => [n.start - 32, n.pitch - 12, n.beats]),
    ).toEqual(m); // bar 9
  });
});
