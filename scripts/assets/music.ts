/**
 * MIDI source as code → .mid → FluidSynth → MP3 (docs/art-spec.md, Audio).
 *
 *   npm run assets:music -- [track...] [--preview] [--soundfont <file.sf2>]
 *
 * Each track is `assets-src/audio/music/<track>.ts`, whose default export is a
 * `MusicTrack`. With no track names, every track in that folder is rendered.
 * A track renders to `public/audio/music/<track>.mp3` and writes its
 * provenance record, `assets-src/provenance/music-<track>.json`, including the
 * Web Audio loop points. `--preview` writes only to `assets-src/review/audio/`.
 *
 * How a loop is made seamless:
 *
 * 1. The MIDI file is one pass of the loop, after a one-beat lead-in, followed
 *    by a silent tail long enough for reverb and releases to die away.
 * 2. FluidSynth renders it to raw float PCM (chorus off, so nothing drifts).
 * 3. The tail is folded back onto the start of the loop ("tail folding"): the
 *    result is exactly what the loop sounds like on its second and later
 *    passes, when the end of the previous pass rings into the start.
 * 4. The MP3 holds a one-beat pre-roll (the loop's last beat), the loop, and a
 *    one-beat post-roll (its first beat), so `loopStart`/`loopEnd` sit inside
 *    continuous audio. Any constant decoder offset, such as MP3 encoder delay
 *    a browser doesn't trim, shifts both points equally and the seam still
 *    holds. Playback may start at 0: the pre-roll works as a pickup.
 * 5. A static gain brings the loop to the loudness target (no dynamic
 *    normalisation, which would break the loop), then ffmpeg encodes the MP3.
 * 6. The MP3 is decoded again, and its loudness and loop seam are measured
 *    and written to the provenance record.
 *
 * External tools: FluidSynth and ffmpeg on the PATH. The General MIDI
 * soundfont (FluidR3_GM, MIT licence) is downloaded once into a cache folder
 * outside the repository, never committed: see `ensureSoundfont`.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
// midi-writer-js ships its types, but its package.json "exports" map doesn't
// point at them, so TypeScript can't resolve them from the package name. The
// untyped import is cast to the shipped declarations right below.
// @ts-expect-error TS7016: no types resolvable through "exports".
import MidiWriterUntyped from "midi-writer-js";
import type MidiWriterTypes from "../../node_modules/midi-writer-js/build/types/main";
import { PROVENANCE_DIR, REPO_ROOT, REVIEW_DIR, cliPath, fail } from "./lib";

const MidiWriter = MidiWriterUntyped as typeof MidiWriterTypes;

// --- Constants ---------------------------------------------------------------------------

/** Render and MP3 sample rate. At 48 kHz every tempo used here gives whole-sample beats. */
export const SAMPLE_RATE = 48000;
export const CHANNELS = 2;
/** MIDI ticks per quarter note: divisible by 2, 3, 4, 5, 8, 16 and 32. */
export const PPQ = 480;
/** Loudness target for music (docs/art-spec.md, Audio: Levels). */
export const MUSIC_LUFS = -20;
/** Highest true peak allowed after gain. */
export const MAX_TRUE_PEAK_DBTP = -1;
export const MP3_BITRATE = "128k";

export const MUSIC_SRC_DIR = resolve(REPO_ROOT, "assets-src/audio/music");
export const MUSIC_OUT_DIR = resolve(REPO_ROOT, "public/audio/music");
export const AUDIO_REVIEW_DIR = resolve(REVIEW_DIR, "audio");

/**
 * General MIDI program names, 0-based, as FluidSynth lists them (program 0 is
 * Acoustic Grand Piano). Tracks pick instruments with `GM.<name>`.
 */
export const GM_PROGRAMS = [
  "Acoustic Grand Piano",
  "Bright Acoustic Piano",
  "Electric Grand Piano",
  "Honky-tonk Piano",
  "Electric Piano 1",
  "Electric Piano 2",
  "Harpsichord",
  "Clavinet",
  "Celesta",
  "Glockenspiel",
  "Music Box",
  "Vibraphone",
  "Marimba",
  "Xylophone",
  "Tubular Bells",
  "Dulcimer",
  "Drawbar Organ",
  "Percussive Organ",
  "Rock Organ",
  "Church Organ",
  "Reed Organ",
  "Accordion",
  "Harmonica",
  "Tango Accordion",
  "Acoustic Guitar (nylon)",
  "Acoustic Guitar (steel)",
  "Electric Guitar (jazz)",
  "Electric Guitar (clean)",
  "Electric Guitar (muted)",
  "Overdriven Guitar",
  "Distortion Guitar",
  "Guitar Harmonics",
  "Acoustic Bass",
  "Electric Bass (finger)",
  "Electric Bass (pick)",
  "Fretless Bass",
  "Slap Bass 1",
  "Slap Bass 2",
  "Synth Bass 1",
  "Synth Bass 2",
  "Violin",
  "Viola",
  "Cello",
  "Contrabass",
  "Tremolo Strings",
  "Pizzicato Strings",
  "Orchestral Harp",
  "Timpani",
  "String Ensemble 1",
  "String Ensemble 2",
  "Synth Strings 1",
  "Synth Strings 2",
  "Choir Aahs",
  "Voice Oohs",
  "Synth Voice",
  "Orchestra Hit",
  "Trumpet",
  "Trombone",
  "Tuba",
  "Muted Trumpet",
  "French Horn",
  "Brass Section",
  "Synth Brass 1",
  "Synth Brass 2",
  "Soprano Sax",
  "Alto Sax",
  "Tenor Sax",
  "Baritone Sax",
  "Oboe",
  "English Horn",
  "Bassoon",
  "Clarinet",
  "Piccolo",
  "Flute",
  "Recorder",
  "Pan Flute",
  "Blown Bottle",
  "Shakuhachi",
  "Whistle",
  "Ocarina",
  "Lead 1 (square)",
  "Lead 2 (sawtooth)",
  "Lead 3 (calliope)",
  "Lead 4 (chiff)",
  "Lead 5 (charang)",
  "Lead 6 (voice)",
  "Lead 7 (fifths)",
  "Lead 8 (bass + lead)",
  "Pad 1 (new age)",
  "Pad 2 (warm)",
  "Pad 3 (polysynth)",
  "Pad 4 (choir)",
  "Pad 5 (bowed)",
  "Pad 6 (metallic)",
  "Pad 7 (halo)",
  "Pad 8 (sweep)",
  "FX 1 (rain)",
  "FX 2 (soundtrack)",
  "FX 3 (crystal)",
  "FX 4 (atmosphere)",
  "FX 5 (brightness)",
  "FX 6 (goblins)",
  "FX 7 (echoes)",
  "FX 8 (sci-fi)",
  "Sitar",
  "Banjo",
  "Shamisen",
  "Koto",
  "Kalimba",
  "Bagpipe",
  "Fiddle",
  "Shanai",
  "Tinkle Bell",
  "Agogo",
  "Steel Drums",
  "Woodblock",
  "Taiko Drum",
  "Melodic Tom",
  "Synth Drum",
  "Reverse Cymbal",
  "Guitar Fret Noise",
  "Breath Noise",
  "Seashore",
  "Bird Tweet",
  "Telephone Ring",
  "Helicopter",
  "Applause",
  "Gunshot",
] as const;

export type GmProgramName = (typeof GM_PROGRAMS)[number];

/** Program number by name, e.g. `GM["Vibraphone"]` is 11. */
export const GM = Object.fromEntries(
  GM_PROGRAMS.map((name, i) => [name, i]),
) as Record<GmProgramName, number>;

/**
 * FluidR3_GM's variation presets outside General MIDI's bank 0, as FluidSynth
 * lists them (`inst 1`). A part picks one with `bank` and `program`, e.g.
 * `...FLUIDR3_PRESETS["Mandolin"]`. Unlike the GM stand-ins, these are real
 * instruments: bank 16 has a mandolin, bank 8 an Italian accordion.
 */
export const FLUIDR3_PRESETS = {
  "Detuned EP 1": { bank: 8, program: 4 },
  "Detuned EP 2": { bank: 8, program: 5 },
  "Coupled Harpsichord": { bank: 8, program: 6 },
  "Church Bell": { bank: 8, program: 14 },
  "Detuned Organ 1": { bank: 8, program: 16 },
  "Detuned Organ 2": { bank: 8, program: 17 },
  "Church Organ 2": { bank: 8, program: 19 },
  "Italian Accordion": { bank: 8, program: 21 },
  Ukulele: { bank: 8, program: 24 },
  "12 String Guitar": { bank: 8, program: 25 },
  "Hawaiian Guitar": { bank: 8, program: 26 },
  "Funk Guitar": { bank: 8, program: 28 },
  "Feedback Guitar": { bank: 8, program: 30 },
  "Guitar Feedback": { bank: 8, program: 31 },
  "Synth Bass 3": { bank: 8, program: 38 },
  "Synth Bass 4": { bank: 8, program: 39 },
  "Slow Violin": { bank: 8, program: 40 },
  "Orchestral Pad": { bank: 8, program: 48 },
  "Synth Strings 3": { bank: 8, program: 50 },
  "Brass 2": { bank: 8, program: 61 },
  "Synth Brass 3": { bank: 8, program: 62 },
  "Synth Brass 4": { bank: 8, program: 63 },
  "Sine Wave": { bank: 8, program: 80 },
  "Taisho Koto": { bank: 8, program: 107 },
  Castanets: { bank: 8, program: 115 },
  "Concert Bass Drum": { bank: 8, program: 116 },
  "Melo Tom 2": { bank: 8, program: 117 },
  "808 Tom": { bank: 8, program: 118 },
  "Burst Noise": { bank: 9, program: 125 },
  Mandolin: { bank: 16, program: 25 },
} as const satisfies Record<string, { bank: number; program: number }>;

/** Instrument name for a bank and program: a FluidR3_GM variation, or General MIDI. */
export function presetName(program: number, bank = 0): string {
  if (bank === 0) return GM_PROGRAMS[program];
  const hit = Object.entries(FLUIDR3_PRESETS).find(
    ([, p]) => p.bank === bank && p.program === program,
  );
  return hit ? hit[0] : `bank ${bank} program ${program}`;
}

/**
 * Drum kits on channel 10, by program number (FluidR3_GM bank 128). In General
 * MIDI terms these are the GS kit numbers; 0 is the standard kit.
 */
export const DRUM_KITS = {
  standard: 0,
  room: 8,
  power: 16,
  electronic: 24,
  tr808: 25,
  jazz: 32,
  brush: 40,
  orchestra: 48,
} as const;

/** General MIDI percussion keys on channel 10 (the brush kit maps 38–40 to brushes). */
export const DRUMS = {
  kick: 36,
  sideStick: 37,
  snare: 38,
  brushSlap: 39,
  brushSwirl: 40,
  closedHat: 42,
  pedalHat: 44,
  openHat: 46,
  lowTom: 45,
  midTom: 47,
  highTom: 50,
  crash: 49,
  ride: 51,
  rideBell: 53,
  tambourine: 54,
  cowbell: 56,
  bongoHigh: 60,
  bongoLow: 61,
  congaHigh: 63,
  congaLow: 64,
  cabasa: 69,
  maracas: 70,
  claves: 75,
  woodblockHigh: 76,
  woodblockLow: 77,
  triangleMute: 80,
  triangleOpen: 81,
} as const;

// --- Notation ----------------------------------------------------------------------------

const NOTE_NAME = /^([A-G])(#|b)?(-?\d)$/;
const PITCH_CLASS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Scientific pitch name to MIDI number: `C4` is 60, `A4` is 69, `Bb1` is 34. */
export function noteToMidi(name: string): number {
  const m = NOTE_NAME.exec(name);
  if (!m) throw new Error(`"${name}" isn't a note name like C4, F#3, or Bb2`);
  const accidental = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  const midi = (Number(m[3]) + 1) * 12 + PITCH_CLASS[m[1]] + accidental;
  if (midi < 0 || midi > 127) throw new Error(`${name} is outside MIDI range`);
  return midi;
}

const FLAT_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

/** MIDI number to a pitch name, spelled with flats: 70 is `Bb4`. */
export function midiToNote(midi: number): string {
  return `${FLAT_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** One note. `start` and `beats` are in quarter-note beats from the start of the loop. */
export interface Note {
  pitch: number;
  start: number;
  beats: number;
  /** MIDI velocity 1–127; defaults to the part's velocity. */
  velocity?: number;
}

export interface PhraseOptions {
  /** Beat where the phrase starts. Default 0. */
  at?: number;
  /** Semitones added to every pitch. */
  transpose?: number;
  /** Velocity for notes without an `@` suffix. */
  velocity?: number;
  /** Quarter-note beats per bar, to check each `|` bar line. Default 4. */
  barBeats?: number;
}

function parseBeats(text: string, token: string): number {
  const frac = /^(\d+)\/(\d+)$/.exec(text);
  const value = frac ? Number(frac[1]) / Number(frac[2]) : Number(text);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`"${token}": duration must be a positive number of beats`);
  }
  return value;
}

/**
 * Parse a phrase written as text, one token per note:
 *
 *     A4:.5 C5:.5 F5:1@96 | Bb4+D5:2 r:2
 *
 * - `<pitch>:<beats>`: a note name and its length in quarter-note beats
 *   (`1/3` works for triplets).
 * - `A3+C4+E4:1` is a chord, `r:1` a rest, `@96` sets the velocity.
 * - `|` is a bar line: parsing fails unless it falls on a bar boundary, which
 *   catches miscounted bars. Drums use `n36` for key 36.
 */
export function phrase(src: string, options: PhraseOptions = {}): Note[] {
  const { at = 0, transpose = 0, velocity, barBeats = 4 } = options;
  const notes: Note[] = [];
  let beat = 0;
  for (const token of src.trim().split(/\s+/)) {
    if (token === "") continue;
    if (token === "|") {
      const bars = beat / barBeats;
      if (Math.abs(bars - Math.round(bars)) > 1e-9) {
        throw new Error(
          `bar line at beat ${beat} isn't on a bar boundary (bars are ${barBeats} beats)`,
        );
      }
      continue;
    }
    const m = /^([^:@]+):([^@]+)(?:@(\d+))?$/.exec(token);
    if (!m) throw new Error(`"${token}" isn't <pitch>:<beats>[@velocity]`);
    const beats = parseBeats(m[2], token);
    if (m[1] !== "r") {
      const vel = m[3] !== undefined ? Number(m[3]) : velocity;
      if (vel !== undefined && (vel < 1 || vel > 127)) {
        throw new Error(`"${token}": velocity must be 1–127`);
      }
      for (const name of m[1].split("+")) {
        const pitch =
          (name.startsWith("n") ? Number(name.slice(1)) : noteToMidi(name)) +
          transpose;
        if (!Number.isInteger(pitch) || pitch < 0 || pitch > 127) {
          throw new Error(`"${token}": pitch out of range`);
        }
        notes.push({
          pitch,
          start: at + beat,
          beats,
          ...(vel !== undefined ? { velocity: vel } : {}),
        });
      }
    }
    beat += beats;
  }
  return notes;
}

/** Total length in beats of a phrase string, rests included. */
export function phraseBeats(src: string): number {
  return src
    .trim()
    .split(/\s+/)
    .filter((t) => t !== "|" && t !== "")
    .reduce((sum, t) => sum + parseBeats(t.split(":")[1].split("@")[0], t), 0);
}

/**
 * Swing the off-beat eighths: a note starting halfway through a beat moves to
 * `ratio` of the beat (2/3 is triplet swing), and the notes around it are
 * lengthened or shortened to keep their ends on the same grid.
 */
export function swing(notes: Note[], ratio: number): Note[] {
  const warp = (t: number) => {
    const beat = Math.floor(t + 1e-9);
    const f = t - beat;
    return f <= 0.5
      ? beat + (f / 0.5) * ratio
      : beat + ratio + ((f - 0.5) / 0.5) * (1 - ratio);
  };
  return notes.map((n) => {
    const start = warp(n.start);
    return { ...n, start, beats: warp(n.start + n.beats) - start };
  });
}

// --- Track model -------------------------------------------------------------------------

export interface ControllerChange {
  beat: number;
  controller: number;
  value: number;
}

export interface Part {
  name: string;
  /** MIDI channel 1–16; 10 is drums. */
  channel: number;
  /** 0-based GM program (`GM["Vibraphone"]`), or a `DRUM_KITS` entry on channel 10. */
  program: number;
  /**
   * Soundfont bank for `program`, sent as bank select (CC0) before the
   * program change. Default 0, General MIDI. Use it for FluidR3_GM's real
   * instruments outside GM (`FLUIDR3_PRESETS`). Not on channel 10, which
   * FluidSynth plays from the drum bank.
   */
  bank?: number;
  /** Channel volume, CC7 (0–127). Default 100. */
  volume?: number;
  /** Pan, CC10 (0 left, 64 centre, 127 right). Default 64. */
  pan?: number;
  /** Reverb send, CC91 (0–127). Default 40. */
  reverb?: number;
  /** Default note velocity (1–127). Default 90. */
  velocity?: number;
  notes: Note[];
  /** Optional automation, e.g. CC11 expression swells. */
  controllers?: ControllerChange[];
}

/** Where a borrowed melody comes from, and why it is free to use. */
export interface MelodySource {
  /** Short id, e.g. "london-bridge". */
  id: string;
  /** The tune's name. */
  tune: string;
  /** Edition or transcription the notes were taken from. */
  source: string;
  /** Public-domain reasoning (author's death, publication date, tradition). */
  publicDomain: string;
  /** What the track takes from it and how it changes it (key, octave, tempo). */
  use: string;
  /** Caveats on how well the note-level transcription was verified. */
  verification?: string;
}

export interface MusicTrack {
  /** Track id: `hall` → `music-hall`, `public/audio/music/hall.mp3`. */
  id: string;
  /** Task id from the execution map, for the provenance record. */
  task: string;
  title: string;
  /** Quarter notes per minute. */
  bpm: number;
  /** Time signature. Default [4, 4]. */
  meter?: [number, number];
  /** Length in bars. A looping track loops over all of them. */
  bars: number;
  /** Key, for the report, e.g. "F major". */
  key: string;
  /** Default true. A non-looping track (a sting) is rendered with its tail and trimmed. */
  loop?: boolean;
  /** Section labels for the report, e.g. { bar: 1, name: "A" }. 1-based bars. */
  sections?: { bar: number; name: string; description?: string }[];
  /** A short description for the provenance record. */
  description?: string;
  /** Every borrowed melody, with its source and public-domain status. */
  melodySources?: MelodySource[];
  parts: Part[];
}

/** Quarter-note beats per bar. */
export function barBeats(track: Pick<MusicTrack, "meter">): number {
  const [num, den] = track.meter ?? [4, 4];
  return (num * 4) / den;
}

/** Beats to ticks, failing when a beat position doesn't land on a whole tick. */
export function beatsToTicks(beats: number): number {
  const ticks = beats * PPQ;
  const rounded = Math.round(ticks);
  if (Math.abs(ticks - rounded) > 1e-6) {
    throw new Error(
      `beat ${beats} isn't a whole number of ticks at PPQ ${PPQ}`,
    );
  }
  return rounded;
}

export interface LoopTiming {
  beatSeconds: number;
  loopBeats: number;
  loopSeconds: number;
  /** Loop length in sample frames at SAMPLE_RATE. Always a whole number. */
  loopFrames: number;
  /** One beat in frames: the pre-roll and post-roll around the loop. */
  beatFrames: number;
}

/**
 * Timing for a track. Fails unless one beat and the whole loop are whole
 * numbers of samples, so the loop points are exact.
 */
export function loopTiming(
  track: Pick<MusicTrack, "bpm" | "bars" | "meter">,
  sampleRate = SAMPLE_RATE,
): LoopTiming {
  const beatSeconds = 60 / track.bpm;
  const loopBeats = track.bars * barBeats(track);
  const beatFrames = beatSeconds * sampleRate;
  const loopFrames = loopBeats * beatFrames;
  if (!Number.isInteger(Math.round(beatFrames * 1e6) / 1e6)) {
    throw new Error(
      `${track.bpm} bpm gives ${beatFrames} samples per beat at ${sampleRate} Hz; pick a tempo that divides ${sampleRate * 60}`,
    );
  }
  return {
    beatSeconds,
    loopBeats,
    loopSeconds: loopBeats * beatSeconds,
    loopFrames: Math.round(loopFrames),
    beatFrames: Math.round(beatFrames),
  };
}

export interface LoopPoints {
  /** Seconds, for AudioBufferSourceNode.loopStart. */
  loopStart: number;
  /** Seconds, for AudioBufferSourceNode.loopEnd. */
  loopEnd: number;
  loopStartFrame: number;
  loopEndFrame: number;
  /** Total frames in the file: pre-roll + loop + post-roll. */
  fileFrames: number;
  sampleRate: number;
}

/** Loop points for a file laid out as [pre-roll][loop][post-roll]. */
export function loopPoints(
  loopFrames: number,
  prerollFrames: number,
  postrollFrames: number,
  sampleRate = SAMPLE_RATE,
): LoopPoints {
  for (const [name, v] of [
    ["loop", loopFrames],
    ["pre-roll", prerollFrames],
    ["post-roll", postrollFrames],
  ] as const) {
    if (!Number.isInteger(v) || v < 0)
      throw new Error(`${name} must be a whole number of frames`);
  }
  if (prerollFrames > loopFrames || postrollFrames > loopFrames) {
    throw new Error("pre-roll and post-roll must be shorter than the loop");
  }
  return {
    loopStart: prerollFrames / sampleRate,
    loopEnd: (prerollFrames + loopFrames) / sampleRate,
    loopStartFrame: prerollFrames,
    loopEndFrame: prerollFrames + loopFrames,
    fileFrames: prerollFrames + loopFrames + postrollFrames,
    sampleRate,
  };
}

/**
 * Check a track against the art spec and itself: channels, programs, notes
 * inside the loop, whole-tick timing. Returns error strings.
 */
export function checkTrack(track: MusicTrack): string[] {
  const errors: string[] = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(track.id))
    errors.push(`track id "${track.id}" isn't kebab-case`);
  let timing: LoopTiming | undefined;
  try {
    timing = loopTiming(track);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  const channels = new Map<number, string>();
  for (const part of track.parts) {
    const where = `${track.id}/${part.name}`;
    if (
      !Number.isInteger(part.channel) ||
      part.channel < 1 ||
      part.channel > 16
    )
      errors.push(`${where}: channel must be 1–16`);
    const other = channels.get(part.channel);
    if (other)
      errors.push(`${where}: shares channel ${part.channel} with ${other}`);
    channels.set(part.channel, part.name);
    if (
      !Number.isInteger(part.program) ||
      part.program < 0 ||
      part.program > 127
    )
      errors.push(`${where}: program must be 0–127`);
    if (part.bank !== undefined) {
      if (!Number.isInteger(part.bank) || part.bank < 0 || part.bank > 127)
        errors.push(`${where}: bank must be 0–127`);
      if (part.channel === 10)
        errors.push(`${where}: channel 10 plays drum kits; leave out bank`);
    }
    for (const [key, v] of [
      ["volume", part.volume],
      ["pan", part.pan],
      ["reverb", part.reverb],
    ] as const) {
      if (v !== undefined && (!Number.isInteger(v) || v < 0 || v > 127))
        errors.push(`${where}: ${key} must be 0–127`);
    }
    for (const n of part.notes) {
      const at = `${where}: ${midiToNote(n.pitch)} at beat ${n.start}`;
      try {
        beatsToTicks(n.start);
        beatsToTicks(n.beats);
      } catch (e) {
        errors.push(`${at}: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (n.start < 0) errors.push(`${at}: starts before the track`);
      if (timing && n.start + n.beats > timing.loopBeats + 1e-9)
        errors.push(`${at}: runs past the end (${timing.loopBeats} beats)`);
      if (n.velocity !== undefined && (n.velocity < 1 || n.velocity > 127))
        errors.push(`${at}: velocity must be 1–127`);
    }
  }
  return errors;
}

// --- MIDI --------------------------------------------------------------------------------

interface MidiNoteEvent {
  tick: number;
  on: boolean;
  pitch: number;
  velocity: number;
}

/** midi-writer-js takes velocities as 1–100 and rounds them to 0–127. */
const writerVelocity = (v: number) => (v * 100) / 127;

export interface MidiOptions {
  /** Silence before the loop, in beats, so program changes settle. Default 1. */
  leadInBeats?: number;
  /** Silence after the loop, in beats, for tails. Default 4 bars. */
  tailBeats?: number;
}

/**
 * Build a format-1 MIDI file: a conductor track (tempo, meter, loop markers,
 * and a final marker that sets the file's length), then one track per part.
 * Note events are written in tick order, note-offs before note-ons at the
 * same tick, so repeated notes never cut each other off.
 */
export function buildMidi(
  track: MusicTrack,
  options: MidiOptions = {},
): Uint8Array {
  const { loopBeats } = loopTiming(track);
  const leadIn = beatsToTicks(options.leadInBeats ?? 1);
  const tail = beatsToTicks(options.tailBeats ?? barBeats(track) * 4);
  const loopTicks = beatsToTicks(loopBeats);
  const [num, den] = track.meter ?? [4, 4];

  const conductor = new MidiWriter.Track();
  conductor.addTrackName(track.title);
  conductor.setTempo(track.bpm);
  conductor.setTimeSignature(num, den, 24, 8);
  conductor.addEvent(
    new MidiWriter.MarkerEvent({ text: "loopStart", delta: leadIn }),
  );
  conductor.addEvent(
    new MidiWriter.MarkerEvent({ text: "loopEnd", delta: loopTicks }),
  );
  conductor.addEvent(
    new MidiWriter.MarkerEvent({ text: "tailEnd", delta: tail }),
  );

  const tracks = [conductor];
  for (const part of track.parts) {
    const t = new MidiWriter.Track();
    t.addTrackName(part.name);
    const channel = part.channel;
    // Bank select (MSB only: FluidSynth's default "gs" mode ignores CC32).
    // Only when a part asks for a bank, so GM-only tracks write the same file.
    if (part.bank !== undefined) t.controllerChange(0, part.bank, channel);
    // midi-writer-js numbers channels from 0 here, and from 1 everywhere else.
    t.addEvent(
      new MidiWriter.ProgramChangeEvent({
        instrument: part.program,
        channel: channel - 1,
      }),
    );
    t.controllerChange(7, part.volume ?? 100, channel);
    t.controllerChange(10, part.pan ?? 64, channel);
    t.controllerChange(91, part.reverb ?? 40, channel);
    t.controllerChange(93, 0, channel);

    const events: (MidiNoteEvent | { tick: number; cc: ControllerChange })[] =
      [];
    for (const n of part.notes) {
      const start = leadIn + beatsToTicks(n.start);
      const velocity = n.velocity ?? part.velocity ?? 90;
      events.push({ tick: start, on: true, pitch: n.pitch, velocity });
      events.push({
        tick: start + beatsToTicks(n.beats),
        on: false,
        pitch: n.pitch,
        velocity: 64,
      });
    }
    for (const cc of part.controllers ?? []) {
      events.push({ tick: leadIn + beatsToTicks(cc.beat), cc });
    }
    // Controllers first, then note-offs, then note-ons at the same tick.
    const rank = (e: (typeof events)[number]) => ("cc" in e ? 0 : e.on ? 2 : 1);
    events.sort((a, b) => a.tick - b.tick || rank(a) - rank(b));

    let cursor = 0;
    for (const e of events) {
      const delta = e.tick - cursor;
      cursor = e.tick;
      if ("cc" in e) {
        t.controllerChange(e.cc.controller, e.cc.value, channel, delta);
      } else if (e.on) {
        t.addEvent(
          new MidiWriter.NoteOnEvent({
            pitch: e.pitch,
            velocity: writerVelocity(e.velocity),
            channel,
            wait: `T${delta}`,
          }),
        );
      } else {
        t.addEvent(
          new MidiWriter.NoteOffEvent({
            pitch: e.pitch,
            velocity: writerVelocity(e.velocity),
            channel,
            duration: `T${delta}`,
            delta,
          }),
        );
      }
    }
    tracks.push(t);
  }
  return new MidiWriter.Writer(tracks, { ticksPerBeat: PPQ }).buildFile();
}

// --- Sample buffers ----------------------------------------------------------------------

/**
 * Fold everything after the loop back onto its start. `render` is interleaved
 * PCM; the loop is `loopFrames` long starting at `offsetFrames`. Frames past
 * the loop (reverb and release tails) are added to the start, as they would be
 * when the loop plays again, wrapping as many times as needed.
 */
export function foldTail(
  render: Float32Array,
  offsetFrames: number,
  loopFrames: number,
  channels = CHANNELS,
): Float32Array {
  const loop = new Float32Array(loopFrames * channels);
  const total = Math.floor(render.length / channels);
  for (let f = offsetFrames; f < total; f++) {
    const at = ((f - offsetFrames) % loopFrames) * channels;
    for (let c = 0; c < channels; c++) loop[at + c] += render[f * channels + c];
  }
  return loop;
}

/**
 * Lay a loop out as [its last `prerollFrames`][the loop][its first
 * `postrollFrames`], so audio on either side of both loop points is continuous.
 */
export function layoutLoop(
  loop: Float32Array,
  prerollFrames: number,
  postrollFrames: number,
  channels = CHANNELS,
): Float32Array {
  const loopFrames = loop.length / channels;
  const out = new Float32Array(
    (prerollFrames + loopFrames + postrollFrames) * channels,
  );
  out.set(loop.subarray((loopFrames - prerollFrames) * channels), 0);
  out.set(loop, prerollFrames * channels);
  out.set(
    loop.subarray(0, postrollFrames * channels),
    (prerollFrames + loopFrames) * channels,
  );
  return out;
}

/** Multiply in place by a gain in dB. */
export function applyGainDb(samples: Float32Array, db: number): Float32Array {
  const g = 10 ** (db / 20);
  for (let i = 0; i < samples.length; i++) samples[i] *= g;
  return samples;
}

/** Linear fade-in over the first `frames` frames, in place. */
export function fadeIn(
  samples: Float32Array,
  frames: number,
  channels = CHANNELS,
) {
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < channels; c++) samples[f * channels + c] *= f / frames;
  }
  return samples;
}

/** Linear fade-out over the last `frames` frames, in place. */
export function fadeOut(
  samples: Float32Array,
  frames: number,
  channels = CHANNELS,
) {
  const total = samples.length / channels;
  for (let f = 0; f < frames; f++) {
    const at = (total - 1 - f) * channels;
    for (let c = 0; c < channels; c++) samples[at + c] *= f / frames;
  }
  return samples;
}

const toDb = (v: number) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const round = (v: number, places = 2) =>
  Number.isFinite(v) ? Math.round(v * 10 ** places) / 10 ** places : v;

/** Peak absolute sample value in dBFS. */
export function peakDbfs(samples: Float32Array): number {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  return toDb(peak);
}

/** RMS of a frame range in dBFS (all channels). */
export function rmsDbfs(
  samples: Float32Array,
  fromFrame = 0,
  toFrame = samples.length / CHANNELS,
  channels = CHANNELS,
): number {
  let sum = 0;
  for (let i = fromFrame * channels; i < toFrame * channels; i++)
    sum += samples[i] ** 2;
  return toDb(Math.sqrt(sum / Math.max(1, (toFrame - fromFrame) * channels)));
}

/**
 * Last frame whose level is above `thresholdDb`, plus one: where a non-looping
 * render can be cut.
 */
export function endOfSound(
  samples: Float32Array,
  thresholdDb = -80,
  channels = CHANNELS,
) {
  const t = 10 ** (thresholdDb / 20);
  for (let i = samples.length - 1; i >= 0; i--) {
    if (Math.abs(samples[i]) > t) return Math.floor(i / channels) + 1;
  }
  return 0;
}

export interface SeamReport {
  /** Frames compared on each side of the loop points. */
  windowFrames: number;
  /** True when the audio around both loop points is sample-for-sample identical. */
  identical: boolean;
  /**
   * Level of (audio around loopEnd − audio around loopStart), relative to the
   * level of the audio itself. What the ear hears at the wrap is this
   * difference, so very negative means seamless; null when identical.
   */
  differenceDb: number | null;
  /** Largest absolute sample difference in that window. */
  maxAbsDifference: number;
  /** Signal level in the window, dBFS. */
  signalDbfs: number;
  /**
   * The sample-to-sample step across the wrap (last frame before loopEnd to
   * the frame at loopStart), against the 99th percentile of steps in the
   * window. Below 1 means the wrap is no bigger a jump than ordinary audio.
   */
  wrapStepRatio: number;
  /** Lag (frames) that best aligns the two windows. 0 means no drift. */
  bestLag: number;
}

/**
 * Compare the audio around `loopEndFrame` with the audio around
 * `loopStartFrame`. When playback wraps from loopEnd to loopStart, whatever
 * differs between the two is what the listener hears as a seam.
 */
export function seamReport(
  samples: Float32Array,
  loopStartFrame: number,
  loopEndFrame: number,
  windowFrames: number,
  channels = CHANNELS,
): SeamReport {
  const total = samples.length / channels;
  const w = Math.min(windowFrames, loopStartFrame, total - loopEndFrame);
  if (w <= 0) throw new Error("no room around the loop points to compare");
  let diff = 0;
  let sig = 0;
  let maxAbs = 0;
  for (let d = -w; d < w; d++) {
    for (let c = 0; c < channels; c++) {
      const a = samples[(loopStartFrame + d) * channels + c];
      const b = samples[(loopEndFrame + d) * channels + c];
      diff += (a - b) ** 2;
      sig += a ** 2;
      maxAbs = Math.max(maxAbs, Math.abs(a - b));
    }
  }
  const steps: number[] = [];
  for (let d = -w + 1; d < w; d++) {
    for (let c = 0; c < channels; c++) {
      steps.push(
        Math.abs(
          samples[(loopStartFrame + d) * channels + c] -
            samples[(loopStartFrame + d - 1) * channels + c],
        ),
      );
    }
  }
  steps.sort((a, b) => a - b);
  const p99 = steps[Math.floor(steps.length * 0.99)] || 1e-12;
  let wrapStep = 0;
  for (let c = 0; c < channels; c++) {
    wrapStep = Math.max(
      wrapStep,
      Math.abs(
        samples[loopStartFrame * channels + c] -
          samples[(loopEndFrame - 1) * channels + c],
      ),
    );
  }
  // Cross-correlation over a small lag range: the peak should sit at 0.
  const maxLag = Math.min(64, Math.floor(w / 2));
  let bestLag = 0;
  let best = -Infinity;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let acc = 0;
    for (let d = -w + maxLag; d < w - maxLag; d++) {
      for (let c = 0; c < channels; c++) {
        acc +=
          samples[(loopStartFrame + d) * channels + c] *
          samples[(loopEndFrame + d + lag) * channels + c];
      }
    }
    if (acc > best) {
      best = acc;
      bestLag = lag;
    }
  }
  const n = 2 * w * channels;
  return {
    windowFrames: w,
    identical: maxAbs === 0,
    differenceDb:
      maxAbs === 0
        ? null
        : round(toDb(Math.sqrt(diff / n)) - toDb(Math.sqrt(sig / n))),
    maxAbsDifference: Number(maxAbs.toPrecision(3)),
    signalDbfs: round(toDb(Math.sqrt(sig / n))),
    wrapStepRatio: round(wrapStep / p99, 3),
    bestLag,
  };
}

/** Interleaved float samples → a 32-bit float WAV file. */
export function encodeWavFloat(
  samples: Float32Array,
  channels = CHANNELS,
  sampleRate = SAMPLE_RATE,
): Buffer {
  const data = samples.length * 4;
  const buf = Buffer.alloc(44 + data);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + data, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(3, 20); // IEEE float
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * 4, 28);
  buf.writeUInt16LE(channels * 4, 32);
  buf.writeUInt16LE(32, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(data, 40);
  Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength).copy(
    buf,
    44,
  );
  return buf;
}

/** Raw little-endian float32 bytes → samples. */
export function decodeF32(bytes: Buffer): Float32Array {
  const copy = new Uint8Array(bytes.byteLength - (bytes.byteLength % 4));
  copy.set(bytes.subarray(0, copy.length));
  return new Float32Array(copy.buffer);
}

// --- Loudness ----------------------------------------------------------------------------

export interface Loudness {
  integratedLufs: number;
  truePeakDbtp: number;
  lraLu: number;
}

/** Parse the summary that ffmpeg's `ebur128=peak=true` filter prints to stderr. */
export function parseEbur128(stderr: string): Loudness {
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const num = (re: RegExp) => {
    const m = re.exec(summary);
    if (!m) throw new Error(`ebur128 summary has no match for ${re}`);
    return m[1] === "-inf" ? -Infinity : Number(m[1]);
  };
  return {
    integratedLufs: num(/I:\s+(-?[\d.]+|-inf) LUFS/),
    lraLu: num(/LRA:\s+(-?[\d.]+) LU/),
    truePeakDbtp: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/),
  };
}

// --- External tools ----------------------------------------------------------------------

function run(cmd: string, args: string[], input?: Buffer) {
  const r = spawnSync(cmd, args, {
    input,
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (r.error) {
    const missing = (r.error as NodeJS.ErrnoException).code === "ENOENT";
    throw new Error(
      missing
        ? `${cmd} isn't installed or isn't on the PATH (macOS: brew install fluid-synth ffmpeg)`
        : `${cmd}: ${r.error.message}`,
    );
  }
  if (r.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(" ")} failed:\n${r.stderr.toString().slice(-2000)}`,
    );
  }
  return { stdout: r.stdout, stderr: r.stderr.toString() };
}

/** The first line of `<tool> -version`, for the provenance record. */
export function toolVersion(tool: "fluidsynth" | "ffmpeg"): string {
  const { stdout } = run(tool, [tool === "ffmpeg" ? "-version" : "--version"]);
  return stdout.toString().split("\n")[0].trim();
}

/** Measure a WAV or MP3 file with ffmpeg's EBU R128 meter (true peak on). */
export function measureLoudness(file: string): Loudness {
  const { stderr } = run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    file,
    "-af",
    "ebur128=peak=true",
    "-f",
    "null",
    "-",
  ]);
  return parseEbur128(stderr);
}

/** Decode any audio file to interleaved float32 at `sampleRate`. */
export function decodeAudio(
  file: string,
  channels = CHANNELS,
  sampleRate = SAMPLE_RATE,
): Float32Array {
  const { stdout } = run("ffmpeg", [
    "-hide_banner",
    "-v",
    "error",
    "-i",
    file,
    "-f",
    "f32le",
    "-ac",
    String(channels),
    "-ar",
    String(sampleRate),
    "-",
  ]);
  return decodeF32(stdout);
}

/** Encode a WAV to a constant-bitrate MP3 with LAME, keeping the gapless (Info) tag. */
export function encodeMp3(wav: string, mp3: string, bitrate = MP3_BITRATE) {
  mkdirSync(dirname(mp3), { recursive: true });
  run("ffmpeg", [
    "-hide_banner",
    "-v",
    "error",
    "-y",
    "-i",
    wav,
    "-codec:a",
    "libmp3lame",
    "-b:a",
    bitrate,
    "-map_metadata",
    "-1",
    "-fflags",
    "+bitexact",
    "-flags:a",
    "+bitexact",
    mp3,
  ]);
}

// --- Soundfont ---------------------------------------------------------------------------

/**
 * FluidR3_GM by Frank Wen, MIT licence, from Debian's `fluid-soundfont-gm`
 * package. Both hashes are pinned: the package's matches Debian's Packages
 * index, and the extracted soundfont's is checked on every run.
 */
export const SOUNDFONT = {
  name: "FluidR3_GM",
  file: "FluidR3_GM.sf2",
  sha256: "74594e8f4250680adf590507a306655a299935343583256f3b722c48a1bc1cb0",
  licence: "MIT",
  copyright: "2000-2002, 2008 Frank Wen; 2008 Toby Smithe",
  package: {
    url: "https://deb.debian.org/debian/pool/main/f/fluid-soundfont/fluid-soundfont-gm_3.1-6_all.deb",
    sha256: "9965fbcc6acee17d6f72b685d28c7f968ec64eba14645445b476d5c6cc2eee4c",
    member: "usr/share/sounds/sf2/FluidR3_GM.sf2",
    licenceFile: "usr/share/doc/fluid-soundfont-gm/copyright",
  },
} as const;

/** Where downloaded tools data lives: `$RGP_AUDIO_CACHE`, else `~/.cache/rgp-audio`. */
export function audioCacheDir(): string {
  return process.env.RGP_AUDIO_CACHE ?? join(homedir(), ".cache", "rgp-audio");
}

const sha256 = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

/**
 * Return the path to FluidR3_GM.sf2, downloading and verifying it on first
 * use. The cache is outside the repository (shared by every worktree), so the
 * 148 MB soundfont is never committed.
 */
export async function ensureSoundfont(): Promise<string> {
  const dir = audioCacheDir();
  const sf2 = join(dir, SOUNDFONT.file);
  if (existsSync(sf2)) {
    if (sha256(sf2) !== SOUNDFONT.sha256)
      throw new Error(
        `${sf2} doesn't match the pinned SHA-256; delete it to download again`,
      );
    return sf2;
  }
  mkdirSync(dir, { recursive: true });
  const deb = join(dir, basename(SOUNDFONT.package.url));
  if (!existsSync(deb)) {
    console.log(`Downloading ${SOUNDFONT.package.url} (120 MB) into ${dir}`);
    const res = await fetch(SOUNDFONT.package.url);
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
    writeFileSync(`${deb}.part`, Buffer.from(await res.arrayBuffer()));
    renameSync(`${deb}.part`, deb);
  }
  if (sha256(deb) !== SOUNDFONT.package.sha256)
    throw new Error(
      `${deb} doesn't match the pinned SHA-256; delete it to download again`,
    );
  const work = join(dir, "extract");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work);
  const ar = spawnSync("ar", ["x", deb, "data.tar.xz"], { cwd: work });
  if (ar.status !== 0) throw new Error(`ar couldn't unpack ${deb}`);
  run("tar", [
    "-xJf",
    join(work, "data.tar.xz"),
    "-C",
    work,
    SOUNDFONT.package.member,
    SOUNDFONT.package.licenceFile,
  ]);
  renameSync(join(work, SOUNDFONT.package.member), sf2);
  renameSync(
    join(work, SOUNDFONT.package.licenceFile),
    join(dir, "FluidR3_GM.copyright"),
  );
  rmSync(work, { recursive: true, force: true });
  if (sha256(sf2) !== SOUNDFONT.sha256)
    throw new Error(`extracted ${sf2} doesn't match the pinned SHA-256`);
  return sf2;
}

// --- Rendering ---------------------------------------------------------------------------

/** FluidSynth settings. Chorus is off: its LFO would drift across the loop. */
export const FLUIDSYNTH_SETTINGS = {
  gain: 0.5,
  reverb: {
    "synth.reverb.room-size": 0.5,
    "synth.reverb.damp": 0.4,
    "synth.reverb.width": 0.8,
    "synth.reverb.level": 0.6,
  },
  chorus: false,
  polyphony: 256,
} as const;

/** Render a MIDI file with FluidSynth to interleaved stereo float32. */
export function renderMidi(
  midiPath: string,
  soundfont: string,
  rawPath: string,
): Float32Array {
  run("fluidsynth", [
    "-q",
    "-n",
    "-i",
    "-R",
    "1",
    "-C",
    "0",
    "-g",
    String(FLUIDSYNTH_SETTINGS.gain),
    "-r",
    String(SAMPLE_RATE),
    "-o",
    `synth.polyphony=${FLUIDSYNTH_SETTINGS.polyphony}`,
    // FluidSynth's default, pinned: CC0 alone selects the bank (see Part.bank).
    "-o",
    "synth.midi-bank-select=gs",
    ...Object.entries(FLUIDSYNTH_SETTINGS.reverb).flatMap(([k, v]) => [
      "-o",
      `${k}=${v}`,
    ]),
    "-T",
    "raw",
    "-O",
    "float",
    "-E",
    "little",
    "-F",
    rawPath,
    soundfont,
    midiPath,
  ]);
  return decodeF32(readFileSync(rawPath));
}

const rel = (p: string) => relative(REPO_ROOT, p).split("\\").join("/");
const today = () => new Date().toISOString().slice(0, 10);

/** Load `assets-src/audio/music/<id>.ts` (or a path) and check it. */
export async function loadTrack(
  nameOrPath: string,
): Promise<{ track: MusicTrack; path: string }> {
  const path = nameOrPath.endsWith(".ts")
    ? cliPath(nameOrPath)
    : join(MUSIC_SRC_DIR, `${nameOrPath}.ts`);
  if (!existsSync(path)) throw new Error(`no track at ${rel(path)}`);
  const mod = (await import(pathToFileURL(path).href)) as {
    default?: MusicTrack;
  };
  if (!mod.default) throw new Error(`${rel(path)} has no default export`);
  const errors = checkTrack(mod.default);
  if (errors.length) throw new Error(errors.join("\n"));
  return { track: mod.default, path };
}

/** Every track file in assets-src/audio/music/ (modules that don't export a track, like motif.ts, are skipped). */
export async function allTracks(): Promise<string[]> {
  if (!existsSync(MUSIC_SRC_DIR)) return [];
  const names: string[] = [];
  for (const file of readdirSync(MUSIC_SRC_DIR)
    .filter((f) => f.endsWith(".ts"))
    .sort()) {
    const mod = (await import(
      pathToFileURL(join(MUSIC_SRC_DIR, file)).href
    )) as {
      default?: unknown;
    };
    if (mod.default) names.push(file.slice(0, -3));
  }
  return names;
}

/** A human-readable summary for the report: parts, ranges, note counts. */
export function describeTrack(track: MusicTrack) {
  const timing = loopTiming(track);
  return {
    title: track.title,
    key: track.key,
    tempoBpm: track.bpm,
    meter: (track.meter ?? [4, 4]).join("/"),
    bars: track.bars,
    loopSeconds: timing.loopSeconds,
    sections: track.sections ?? [],
    parts: track.parts.map((p) => {
      const pitches = p.notes.map((n) => n.pitch);
      const drums = p.channel === 10;
      const kit = Object.entries(DRUM_KITS).find(
        ([, v]) => v === p.program,
      )?.[0];
      return {
        name: p.name,
        channel: p.channel,
        instrument: drums
          ? `drum kit: ${kit ?? p.program}`
          : presetName(p.program, p.bank),
        bank: drums ? 128 : (p.bank ?? 0),
        program: p.program,
        notes: p.notes.length,
        range:
          drums || !pitches.length
            ? undefined
            : `${midiToNote(Math.min(...pitches))}–${midiToNote(Math.max(...pitches))}`,
        barsPlaying: [
          ...new Set(
            p.notes.map((n) => Math.floor(n.start / barBeats(track)) + 1),
          ),
        ].length,
      };
    }),
  };
}

export interface RenderResult {
  mp3: string;
  loop?: LoopPoints;
  loudness: Loudness & { gainDb: number; targetLufs: number };
  seam?: {
    wav: SeamReport;
    mp3: SeamReport;
    mp3WithDecoderOffset: SeamReport;
    mp3CodecNoiseDb: number;
    foldedTailDb: number;
    decodedFrames: number;
    expectedFrames: number;
  };
}

/** Render one track: MIDI → FluidSynth → fold → gain → MP3 → measure. */
export async function renderTrack(
  track: MusicTrack,
  soundfont: string,
  { preview = false } = {},
): Promise<RenderResult> {
  const timing = loopTiming(track);
  const looping = track.loop ?? true;
  const work = join(AUDIO_REVIEW_DIR, "music", track.id);
  mkdirSync(work, { recursive: true });

  const leadInBeats = 1;
  const midiPath = join(work, `${track.id}.mid`);
  writeFileSync(midiPath, buildMidi(track, { leadInBeats }));
  const render = renderMidi(midiPath, soundfont, join(work, `${track.id}.raw`));
  const offset = leadInBeats * timing.beatFrames;

  let body: Float32Array;
  let loop: LoopPoints | undefined;
  let foldedTailDb = -Infinity;
  if (looping) {
    const renderFrames = render.length / CHANNELS;
    const tailEnd = rmsDbfs(
      render,
      renderFrames - timing.beatFrames,
      renderFrames,
    );
    if (tailEnd > -90) {
      throw new Error(
        `${track.id}: the render is still ringing at the end (${round(tailEnd)} dBFS); lengthen tailBeats`,
      );
    }
    const folded = foldTail(render, offset, timing.loopFrames);
    // How loud the ringing carried over the wrap is, against the loop itself.
    const tail = render.subarray((offset + timing.loopFrames) * CHANNELS);
    foldedTailDb = rmsDbfs(tail, 0, timing.beatFrames) - rmsDbfs(folded);
    // Pre-roll and post-roll: one beat each.
    loop = loopPoints(timing.loopFrames, timing.beatFrames, timing.beatFrames);
    body = layoutLoop(folded, timing.beatFrames, timing.beatFrames);
    fadeIn(body, Math.round(SAMPLE_RATE * 0.005));
  } else {
    const trimmed = render.slice(offset * CHANNELS);
    const end = Math.min(endOfSound(trimmed), trimmed.length / CHANNELS);
    body = trimmed.slice(0, end * CHANNELS);
    fadeOut(body, Math.min(end, Math.round(SAMPLE_RATE * 0.02)));
  }

  const mp3 = preview
    ? join(work, `${track.id}.mp3`)
    : join(MUSIC_OUT_DIR, `${track.id}.mp3`);
  const encoded = encodeToTarget({
    samples: body,
    range: loop ? [loop.loopStartFrame, loop.loopEndFrame] : undefined,
    target: { lufs: MUSIC_LUFS },
    work: join(work, track.id),
    mp3,
  });

  let seam: RenderResult["seam"];
  if (loop) {
    // Half a beat each side: far more than any MP3 encoder delay (about 25 ms).
    const window = Math.floor(timing.beatFrames / 2);
    seam = {
      wav: seamReport(
        encoded.source,
        loop.loopStartFrame,
        loop.loopEndFrame,
        window,
      ),
      mp3: seamReport(
        encoded.decoded,
        loop.loopStartFrame,
        loop.loopEndFrame,
        window,
      ),
      mp3WithDecoderOffset: seamReport(
        encoded.decoded,
        loop.loopStartFrame + LAME_DELAY_FRAMES,
        loop.loopEndFrame + LAME_DELAY_FRAMES,
        window - LAME_DELAY_FRAMES,
      ),
      mp3CodecNoiseDb: codecNoiseDb(
        encoded.decoded,
        encoded.source,
        loop.loopStartFrame - window,
        loop.loopStartFrame + window,
      ),
      foldedTailDb: round(foldedTailDb),
      decodedFrames: encoded.decoded.length / CHANNELS,
      expectedFrames: loop.fileFrames,
    };
  }
  return {
    mp3,
    loop,
    loudness: {
      ...encoded.loudness,
      gainDb: encoded.gainDb,
      targetLufs: MUSIC_LUFS,
    },
    seam,
  };
}

/**
 * Encoder delay of a LAME MP3 (576-sample encoder delay + 529-sample decoder
 * delay). ffmpeg and most browsers trim it using the MP3's Info tag; the
 * seam is also checked as if a decoder didn't.
 */
export const LAME_DELAY_FRAMES = 1105;

/** Level of (decoded − source) relative to the source over a frame range, in dB. */
export function codecNoiseDb(
  decoded: Float32Array,
  source: Float32Array,
  fromFrame: number,
  toFrame: number,
  channels = CHANNELS,
): number {
  let noise = 0;
  let sig = 0;
  for (let i = fromFrame * channels; i < toFrame * channels; i++) {
    noise += (decoded[i] - source[i]) ** 2;
    sig += source[i] ** 2;
  }
  return round(10 * Math.log10(noise / sig));
}

export interface EncodeOptions {
  /** Interleaved samples at SAMPLE_RATE. Not modified. */
  samples: Float32Array;
  /** Frame range to measure; default all of it (a loop measures only the loop). */
  range?: [number, number];
  /** Integrated loudness target, or a sample-peak target for one-shot effects. */
  target: { lufs: number } | { peakDbfs: number };
  /** Path prefix for intermediate WAVs (gitignored review folder). */
  work: string;
  mp3: string;
  channels?: number;
  bitrate?: string;
}

export interface Encoded {
  gainDb: number;
  loudness: Loudness & { samplePeakDbfs: number };
  /** The gained source that was encoded. */
  source: Float32Array;
  /** The MP3 decoded again, as it ships. */
  decoded: Float32Array;
}

/**
 * Apply one static gain, encode the MP3, decode it, and measure what ships.
 * MP3 encoding shifts the level slightly (about −0.4 dB with LAME at 128k),
 * so the gain is corrected from the decoded audio, up to three passes, until
 * the shipped file is within 0.1 dB of the target.
 */
export function encodeToTarget(o: EncodeOptions): Encoded {
  const channels = o.channels ?? CHANNELS;
  const [from, to] = o.range ?? [0, o.samples.length / channels];
  const slice = (s: Float32Array) => s.subarray(from * channels, to * channels);
  const measure = (s: Float32Array, name: string) => {
    const file = `${o.work}.${name}.wav`;
    writeFileSync(file, encodeWavFloat(slice(s), channels));
    return {
      ...measureLoudness(file),
      samplePeakDbfs: round(peakDbfs(slice(s))),
    };
  };
  const level = (l: Encoded["loudness"]) =>
    "lufs" in o.target ? l.integratedLufs : l.samplePeakDbfs;
  const goal = "lufs" in o.target ? o.target.lufs : o.target.peakDbfs;

  let gainDb = round(goal - level(measure(o.samples, "measure")), 2);
  if (!Number.isFinite(gainDb))
    throw new Error(`${o.mp3}: the audio is silent`);
  for (let pass = 0; ; pass++) {
    const source = applyGainDb(o.samples.slice(), gainDb);
    const wav = `${o.work}.wav`;
    writeFileSync(wav, encodeWavFloat(source, channels));
    encodeMp3(wav, o.mp3, o.bitrate);
    const decoded = decodeAudio(o.mp3, channels);
    const loudness = measure(decoded, "decoded");
    const error = goal - level(loudness);
    if (Math.abs(error) <= 0.1 || pass === 2) {
      if (loudness.truePeakDbtp > MAX_TRUE_PEAK_DBTP)
        throw new Error(
          `${o.mp3}: true peak ${loudness.truePeakDbtp} dBTP is above ${MAX_TRUE_PEAK_DBTP}; the mix is too spiky`,
        );
      return { gainDb, loudness, source, decoded };
    }
    gainDb = round(gainDb + error, 2);
  }
}

/** Write or update `assets-src/provenance/music-<id>.json`. */
export function writeMusicProvenance(
  track: MusicTrack,
  trackPath: string,
  result: RenderResult,
): string {
  const id = `music-${track.id}`;
  const file = join(PROVENANCE_DIR, `${id}.json`);
  const previous = existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>)
    : {};
  const record = {
    id,
    output: rel(result.mp3),
    task: track.task,
    source: "opus",
    ...(previous.approvedBy ? { approvedBy: previous.approvedBy } : {}),
    date: today(),
    midiSource: rel(trackPath),
    description: track.description,
    ...(track.melodySources ? { melodySources: track.melodySources } : {}),
    tempoBpm: track.bpm,
    meter: (track.meter ?? [4, 4]).join("/"),
    key: track.key,
    bars: track.bars,
    instruments: describeTrack(track).parts.map(
      ({ name, channel, instrument, bank, program }) => ({
        name,
        channel,
        instrument,
        bank,
        program,
      }),
    ),
    ...(result.loop
      ? {
          loop: {
            loopStart: result.loop.loopStart,
            loopEnd: result.loop.loopEnd,
            loopStartFrame: result.loop.loopStartFrame,
            loopEndFrame: result.loop.loopEndFrame,
            sampleRate: result.loop.sampleRate,
            usage:
              "Decode with Web Audio (decodeAudioData) and play through an AudioBufferSourceNode with loop = true and these loopStart/loopEnd seconds. Start at 0: the audio before loopStart is the loop's last beat, a pickup.",
          },
        }
      : {}),
    loudness: result.loudness,
    ...(result.seam ? { seam: result.seam } : {}),
    render: {
      soundfont: {
        name: SOUNDFONT.name,
        sha256: SOUNDFONT.sha256,
        licence: SOUNDFONT.licence,
        copyright: SOUNDFONT.copyright,
        source: SOUNDFONT.package.url,
        sourceSha256: SOUNDFONT.package.sha256,
      },
      fluidsynth: toolVersion("fluidsynth"),
      ffmpeg: toolVersion("ffmpeg"),
      settings: FLUIDSYNTH_SETTINGS,
      sampleRate: SAMPLE_RATE,
      mp3: `libmp3lame CBR ${MP3_BITRATE}, stereo`,
    },
  };
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return file;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      preview: { type: "boolean", default: false },
      soundfont: { type: "string" },
    },
  });
  const names = positionals.length ? positionals : await allTracks();
  if (!names.length) fail(`no tracks in ${rel(MUSIC_SRC_DIR)}`);
  toolVersion("fluidsynth");
  toolVersion("ffmpeg");
  const soundfont = values.soundfont
    ? cliPath(values.soundfont)
    : await ensureSoundfont();
  for (const name of names) {
    const { track, path } = await loadTrack(name);
    console.log(`Rendering ${track.id} (${rel(path)})…`);
    const result = await renderTrack(track, soundfont, {
      preview: values.preview,
    });
    const record = values.preview
      ? undefined
      : writeMusicProvenance(track, path, result);
    console.log(
      JSON.stringify(
        {
          output: rel(result.mp3),
          provenance: record && rel(record),
          ...describeTrack(track),
          loop: result.loop,
          loudness: result.loudness,
          seam: result.seam,
        },
        null,
        2,
      ),
    );
  }
}

/** True when this module is the script being run, not an import. */
export function isMain(metaUrl: string): boolean {
  return (
    process.argv[1] !== undefined &&
    resolve(process.argv[1]) === fileURLToPath(metaUrl)
  );
}

if (isMain(import.meta.url)) {
  main().catch((e: unknown) =>
    fail(e instanceof Error ? e.message : String(e)),
  );
}
