import { describe, expect, test, vi } from "vitest";
import { SceneAudio, effectGainDb, normaliseTrack, soundUrl } from "../audio";

/** Just enough of Web Audio to watch what SceneAudio does with it. */
function fakeContext() {
  const sources: {
    loop: boolean;
    loopStart: number;
    loopEnd: number;
    buffer: unknown;
    started: unknown[] | null;
    stopped: boolean;
  }[] = [];
  const param = () => ({ value: 1, setTargetAtTime: vi.fn() });
  const node = () => ({ connect: vi.fn((n: unknown) => n) });
  const gains: { gain: { value: number } }[] = [];
  const ctx = {
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
    createGain: () => {
      const g = { ...node(), gain: param() };
      gains.push(g);
      return g;
    },
    createBufferSource: () => {
      const s = {
        ...node(),
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        buffer: null as unknown,
        started: null as unknown[] | null,
        stopped: false,
        start(...args: unknown[]) {
          s.started = args;
        },
        stop() {
          s.stopped = true;
        },
      };
      sources.push(s);
      return s;
    },
    decodeAudioData: vi.fn((data: ArrayBuffer) => Promise.resolve({ data })),
  };
  return { ctx, sources, gains };
}

function setup(missing: string[] = []) {
  const { ctx, sources, gains } = fakeContext();
  const load = vi.fn((url: string) =>
    Promise.resolve(missing.includes(url) ? null : new ArrayBuffer(8)),
  );
  const audio = new SceneAudio({
    // The fake stands in for the parts of AudioContext SceneAudio uses.
    createContext: () => ctx as unknown as AudioContext,
    load,
  });
  return { audio, ctx, sources, gains, load };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("scene audio", () => {
  test("stays silent and loads nothing until sound is turned on", async () => {
    const { audio, load } = setup();
    audio.setTracks("/audio/music/hall.mp3", "/audio/ambience/hall.mp3");
    audio.play("ui-blip");
    await flush();
    expect(load).not.toHaveBeenCalled();
  });

  test("loops music and ambience with the given loop points", async () => {
    const { audio, sources } = setup();
    audio.setTracks(
      { src: "/audio/music/hall.mp3", loopStart: 0.6, loopEnd: 77.4 },
      "/audio/ambience/hall.mp3",
    );
    audio.setEnabled(true);
    await flush();
    expect(sources).toHaveLength(2);
    const [music, ambience] = sources;
    expect(music).toMatchObject({ loop: true, loopStart: 0.6, loopEnd: 77.4 });
    expect(music.started).toEqual([0, 0]);
    expect(ambience).toMatchObject({ loop: true, loopStart: 0, loopEnd: 0 });
  });

  test("crossfades to the next scene's tracks and stops the old ones", async () => {
    const { audio, sources } = setup();
    audio.setEnabled(true);
    audio.setTracks("/audio/music/hall.mp3", undefined);
    await flush();
    audio.setTracks("/audio/music/london.mp3", undefined);
    await flush();
    expect(sources).toHaveLength(2);
    expect(sources[0].stopped).toBe(true);
    expect(sources[1].stopped).toBe(false);
  });

  test("keeps playing when the scene has the same track", async () => {
    const { audio, sources } = setup();
    audio.setEnabled(true);
    audio.setTracks("/audio/music/hall.mp3", undefined);
    await flush();
    audio.setTracks("/audio/music/hall.mp3", undefined);
    await flush();
    expect(sources).toHaveLength(1);
  });

  test("skips a track that isn't there yet", async () => {
    const { audio, sources } = setup(["/audio/music/london.mp3"]);
    audio.setEnabled(true);
    audio.setTracks("/audio/music/london.mp3", undefined);
    await flush();
    expect(sources).toHaveLength(0);
  });

  test("the sound toggle mutes everything", async () => {
    const { audio, ctx } = setup();
    audio.setEnabled(true);
    expect(ctx.resume).toHaveBeenCalled();
    audio.setEnabled(false);
    audio.play("door-open");
    await flush();
    expect(ctx.decodeAudioData).not.toHaveBeenCalled();
  });

  test("plays one-shot effects while sound is on", async () => {
    const { audio, sources, load } = setup();
    audio.setEnabled(true);
    audio.play("door-open");
    await flush();
    expect(load).toHaveBeenCalledWith("/audio/sfx/door-open.mp3");
    expect(sources[0]).toMatchObject({ loop: false });
  });

  test("turns the loud tonal effects down to the loudness cap", async () => {
    const { audio, gains } = setup();
    audio.setEnabled(true);
    audio.play("door-open");
    audio.play("fruit-machine");
    await flush();
    // gains[0] is the master; then one gain per effect.
    const [door, fruit] = gains.slice(1).map((g) => g.gain.value);
    expect(door).toBeCloseTo(0.7);
    expect(fruit).toBeCloseTo(0.7 * 10 ** (-8.3 / 20));
  });
});

describe("sound files", () => {
  test("map engine sounds to public/audio", () => {
    expect(soundUrl("door-open")).toBe("/audio/sfx/door-open.mp3");
    expect(soundUrl("travel-sting")).toBe("/audio/music/travel-sting.mp3");
    expect(soundUrl("footstep-tile", () => 0)).toBe(
      "/audio/sfx/footstep-tile-1.mp3",
    );
    expect(soundUrl("footstep-tile", () => 0.99)).toBe(
      "/audio/sfx/footstep-tile-3.mp3",
    );
  });

  test("capped effects have a gain; everything else plays at 0 dB", () => {
    expect(effectGainDb("/audio/sfx/cuckoo.mp3")).toBe(-6);
    expect(effectGainDb("/audio/sfx/footstep-tile-1.mp3")).toBe(0);
    expect(effectGainDb("/audio/music/travel-sting.mp3")).toBe(0);
  });

  test("accept a URL or loop points", () => {
    expect(normaliseTrack("/a.mp3")).toEqual({ src: "/a.mp3" });
    expect(normaliseTrack({ src: "/a.mp3", loopStart: 1 })).toEqual({
      src: "/a.mp3",
      loopStart: 1,
    });
  });
});
