/**
 * Scene audio: one music loop and one ambience loop per scene, crossfaded on
 * scene changes, plus one-shot effects. MP3
 * encoder padding breaks `<audio loop>`, so tracks are decoded with Web
 * Audio and looped with `loopStart`/`loopEnd`. The existing sound toggle
 * mutes everything. A missing file is skipped quietly, so scenes can name
 * tracks before they're rendered.
 */
import type { SoundName } from "./SceneEngine";
import type { AudioTrack } from "./types";

type Channel = "music" | "ambience";

/** Mix levels on top of the mastering (music about -20 LUFS, ambience -28). */
const LEVEL: Record<Channel | "sfx", number> = {
  music: 0.8,
  ambience: 0.8,
  sfx: 0.7,
};

const FADE_S = 0.8;

/**
 * Loudness cap for one-shot effects, in LUFS. Effects are mastered to a
 * −3 dBFS sample peak, so the tonal ones measure far louder than the
 * −20 LUFS music (the fruit machine −7.7 LUFS); each is turned down to at
 * most this. Short transients such as footsteps sit well under it.
 */
export const EFFECT_LUFS_CAP = -16;

/**
 * Per-effect gain in dB, by file name (`public/audio/sfx/<name>.mp3`):
 * `min(0, EFFECT_LUFS_CAP − integrated LUFS)`, with the loudness from
 * `assets-src/provenance/sfx-<name>.json`. The engine can't read provenance
 * at runtime, so the values are copied here; a unit test keeps them in step
 * with the records. Effects under the cap are left out (0 dB).
 */
export const EFFECT_GAIN_DB: Readonly<Record<string, number>> = {
  cuckoo: -6,
  "fruit-machine": -8.3,
  "phone-ring": -2.4,
};

/** Gain in dB for a sound file's URL (0 for anything but a capped effect). */
export function effectGainDb(url: string): number {
  const m = /^\/audio\/sfx\/([a-z0-9-]+)\.mp3$/.exec(url);
  return (m && EFFECT_GAIN_DB[m[1]]) || 0;
}

interface Playing {
  key: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/** `{ src, loopStart, loopEnd }` for either form of `AudioTrack`. */
export function normaliseTrack(track: AudioTrack): {
  src: string;
  loopStart?: number;
  loopEnd?: number;
} {
  return typeof track === "string" ? { src: track } : track;
}

function trackKey(track: AudioTrack | undefined): string {
  if (!track) return "";
  const { src, loopStart, loopEnd } = normaliseTrack(track);
  return `${src}|${loopStart ?? ""}|${loopEnd ?? ""}`;
}

/**
 * File for an engine sound. Footsteps pick one of three variants. The
 * travel sting is music (`music-travel-sting`); the rest are `sfx-<name>`.
 */
export function soundUrl(name: SoundName, rng: () => number = Math.random) {
  if (name === "travel-sting") return "/audio/music/travel-sting.mp3";
  if (name.startsWith("footstep-")) {
    const variant = 1 + Math.min(2, Math.floor(rng() * 3));
    return `/audio/sfx/${name}-${variant}.mp3`;
  }
  return `/audio/sfx/${name}.mp3`;
}

export class SceneAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private playing: Record<Channel, Playing | null> = {
    music: null,
    ambience: null,
  };
  private wanted: Record<Channel, AudioTrack | undefined> = {
    music: undefined,
    ambience: undefined,
  };
  private enabled = false;
  private readonly createContext: () => AudioContext;
  private readonly load: (url: string) => Promise<ArrayBuffer | null>;

  constructor(
    opts: {
      createContext?: () => AudioContext;
      load?: (url: string) => Promise<ArrayBuffer | null>;
    } = {},
  ) {
    this.createContext = opts.createContext ?? (() => new AudioContext());
    this.load =
      opts.load ??
      ((url) =>
        fetch(url)
          .then((r) =>
            // A dev server or SPA host answers a missing file with HTML.
            r.ok && !r.headers.get("content-type")?.includes("text/html")
              ? r.arrayBuffer()
              : null,
          )
          .catch(() => null));
  }

  /** Follows the sound toggle. Call it from the click that turns sound on. */
  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) {
      const ctx = this.context();
      if (!ctx || !this.master) return;
      void ctx.resume();
      this.master.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
      this.sync();
    } else if (this.ctx && this.master) {
      const ctx = this.ctx;
      this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      window.setTimeout(() => {
        if (!this.enabled) void ctx.suspend();
      }, 300);
    }
  }

  /** The scene's loops. Crossfades if sound is on; remembered if it's off. */
  setTracks(music: AudioTrack | undefined, ambience: AudioTrack | undefined) {
    this.wanted = { music, ambience };
    if (this.enabled) this.sync();
  }

  play(name: SoundName) {
    if (!this.enabled) return;
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const url = soundUrl(name);
    void this.buffer(url).then((buffer) => {
      if (!buffer || !this.enabled) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = LEVEL.sfx * 10 ** (effectGainDb(url) / 20);
      source.buffer = buffer;
      source.connect(gain).connect(master);
      source.start();
    });
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = this.createContext();
    } catch {
      return null;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  private buffer(url: string): Promise<AudioBuffer | null> {
    const hit = this.buffers.get(url);
    if (hit) return hit;
    const ctx = this.context();
    const promise = this.load(url).then(async (data) => {
      if (!data || !ctx) return null;
      try {
        return await ctx.decodeAudioData(data);
      } catch {
        return null;
      }
    });
    this.buffers.set(url, promise);
    return promise;
  }

  private sync() {
    (["music", "ambience"] as const).forEach((ch) => this.syncChannel(ch));
  }

  private syncChannel(channel: Channel) {
    const key = trackKey(this.wanted[channel]);
    const current = this.playing[channel];
    if ((current?.key ?? "") === key) return;
    if (current) this.fadeOut(current);
    this.playing[channel] = null;
    const track = this.wanted[channel];
    if (!track) return;

    const { src, loopStart, loopEnd } = normaliseTrack(track);
    void this.buffer(src).then((buffer) => {
      const ctx = this.ctx;
      const master = this.master;
      // Skip if the scene changed while loading, or sound went off.
      if (!buffer || !ctx || !master || !this.enabled) return;
      if (trackKey(this.wanted[channel]) !== key) return;
      if (this.playing[channel]?.key === key) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      if (loopStart !== undefined) source.loopStart = loopStart;
      if (loopEnd !== undefined) source.loopEnd = loopEnd;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(LEVEL[channel], ctx.currentTime, FADE_S / 3);
      source.connect(gain).connect(master);
      // Start at 0: anything before loopStart is a pickup into the loop.
      source.start(0, 0);
      this.playing[channel] = { key, source, gain };
    });
  }

  private fadeOut(p: Playing) {
    const ctx = this.ctx;
    if (!ctx) return;
    p.gain.gain.setTargetAtTime(0, ctx.currentTime, FADE_S / 3);
    try {
      p.source.stop(ctx.currentTime + FADE_S * 2);
    } catch {
      // Already stopped.
    }
  }
}
