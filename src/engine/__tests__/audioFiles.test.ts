/**
 * Every sound the engine can ask for exists in `public/audio/`, and the
 * scene configs agree with the audio provenance records (loop points), as
 * does the effect gain table (loudness). Uses Vite's `import.meta.glob`, so
 * nothing here reads the file system at runtime.
 */
import { describe, expect, test } from "vitest";
import {
  EFFECT_GAIN_DB,
  EFFECT_LUFS_CAP,
  normaliseTrack,
  soundUrl,
} from "../audio";
import type { SoundName } from "../SceneEngine";
import { SCENES } from "../scenes";
import type { AudioTrack, EffectName, FloorSurface } from "../types";

interface AudioRecord {
  id: string;
  output: string;
  loop?: { loopStart: number; loopEnd: number };
  loudness: { integratedLufs: number };
}

const shipped = new Set(
  Object.keys(import.meta.glob("/public/audio/**/*.mp3")).map((p) =>
    p.replace(/^\/public/, ""),
  ),
);

const records = Object.values(
  import.meta.glob<AudioRecord>(
    "/assets-src/provenance/{music,ambience,sfx}-*.json",
    { eager: true, import: "default" },
  ),
);
const recordFor = (url: string) =>
  records.find((r) => r.output === `public${url}`);

/** Exhaustive: adding an effect to `EffectName` without listing it fails to compile. */
const EFFECTS: Record<EffectName, true> = {
  "boarding-chime": true,
  cuckoo: true,
  "dart-thunk": true,
  "door-close": true,
  "door-open": true,
  "fruit-machine": true,
  "map-plane": true,
  "moka-gurgle": true,
  "phone-ring": true,
  "split-flap": true,
  "ui-blip": true,
};
const FLOORS: Record<FloorSurface, true> = {
  carpet: true,
  wood: true,
  tile: true,
};

/** Every file each engine sound can resolve to (all three footstep variants). */
const filesFor = (name: SoundName) =>
  [0, 0.5, 0.99].map((r) => soundUrl(name, () => r));

const ENGINE_SOUNDS: SoundName[] = [
  ...(Object.keys(EFFECTS) as EffectName[]),
  ...(Object.keys(FLOORS) as FloorSurface[]).map(
    (f) => `footstep-${f}` as const,
  ),
  "travel-sting",
];

const scenes = Object.values(SCENES);

describe("audio files", () => {
  test.each(ENGINE_SOUNDS)("%s is in public/audio", (name) => {
    for (const url of filesFor(name)) expect(shipped, url).toContain(url);
  });

  test.each(scenes.map((s) => [s.id, s] as const))(
    "%s: music, ambience, and object sounds exist",
    (id, scene) => {
      const tracks = [scene.music, scene.ambience].filter(
        (t): t is AudioTrack => t !== undefined,
      );
      for (const t of tracks) {
        const { src } = normaliseTrack(t);
        expect(shipped, `${id}: ${src}`).toContain(src);
      }
      const sounds = [
        ...scene.objects.map((o) => o.sound),
        ...(scene.animations ?? []).map((a) => a.sound),
      ].filter((s): s is EffectName => s !== undefined);
      for (const s of sounds) {
        expect(shipped, `${id}: ${s}`).toContain(soundUrl(s));
      }
    },
  );

  test.each(scenes.map((s) => [s.id, s] as const))(
    "%s: loops carry the loop points from their provenance record",
    (id, scene) => {
      for (const track of [scene.music, scene.ambience]) {
        if (!track) continue;
        const { src, loopStart, loopEnd } = normaliseTrack(track);
        const record = recordFor(src);
        expect(record, `${id}: no provenance record for ${src}`).toBeDefined();
        if (!record?.loop) continue;
        expect({ loopStart, loopEnd }, `${id}: ${src}`).toEqual({
          loopStart: record.loop.loopStart,
          loopEnd: record.loop.loopEnd,
        });
      }
    },
  );
});

describe("effect loudness", () => {
  const effects = records.filter((r) => r.id.startsWith("sfx-"));

  test("every effect has a record", () => {
    expect(effects.length).toBeGreaterThan(0);
  });

  test.each(effects.map((r) => [r.id, r] as const))(
    "%s: gain caps it at the effect loudness cap",
    (id, record) => {
      const name = id.slice("sfx-".length);
      const lufs = record.loudness.integratedLufs;
      const expected =
        Math.round(Math.min(0, EFFECT_LUFS_CAP - lufs) * 10) / 10;
      expect(EFFECT_GAIN_DB[name] ?? 0, `${name} at ${lufs} LUFS`).toBeCloseTo(
        expected,
        5,
      );
    },
  );
});
