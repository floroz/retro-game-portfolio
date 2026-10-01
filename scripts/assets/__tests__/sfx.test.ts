// @vitest-environment node
import { describe, expect, test } from "vitest";
import { SAMPLE_RATE, seamReport } from "../music";
import {
  adsr,
  biquad,
  circular,
  crossfadeLoop,
  decay,
  declick,
  echo,
  envelope,
  interleave,
  mix,
  noise,
  pan,
  recipeRef,
  renderRecipe,
  reverb,
  seededRandom,
  tone,
  type SfxRecipe,
} from "../sfx";

const rms = (a: Float32Array, from = 0, to = a.length) => {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] ** 2;
  return Math.sqrt(s / (to - from));
};

describe("sources", () => {
  test("seeded randomness repeats and stays in [0, 1)", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(xs).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(seededRandom(43)()).not.toBe(xs[0]);
  });

  test("oscillators have the right period and range", () => {
    const sine = tone(480, 100);
    expect(sine[0]).toBeCloseTo(0, 9);
    expect(sine[120]).toBeCloseTo(1, 6); // a quarter period at 100 Hz, 48 kHz
    expect(sine[240]).toBeCloseTo(0, 6);
    const sq = tone(480, 100, "square");
    expect(new Set(sq)).toEqual(new Set([1, -1]));
    const tri = tone(480, 100, "triangle");
    expect(Math.max(...tri)).toBeCloseTo(1, 2);
    expect(Math.min(...tri)).toBeCloseTo(-1, 2);
  });

  test("a sweep accumulates phase without jumps", () => {
    const s = tone(SAMPLE_RATE, (t) => 200 + 800 * t);
    let maxStep = 0;
    for (let i = 1; i < s.length; i++)
      maxStep = Math.max(maxStep, Math.abs(s[i] - s[i - 1]));
    // The biggest step at 1 kHz is 2π·1000/48000 ≈ 0.13.
    expect(maxStep).toBeLessThan(0.14);
  });

  test("noise colours get darker", () => {
    const n = 48000;
    const hp = (x: Float32Array) => biquad(x, { type: "highpass", freq: 4000 });
    const ratio = (x: Float32Array) => rms(hp(x)) / rms(x);
    const white = ratio(noise(n, seededRandom(1), "white"));
    const pink = ratio(noise(n, seededRandom(1), "pink"));
    const brown = ratio(noise(n, seededRandom(1), "brown"));
    expect(white).toBeGreaterThan(pink);
    expect(pink).toBeGreaterThan(brown);
  });
});

describe("envelopes", () => {
  test("piecewise-linear envelopes interpolate and hold their ends", () => {
    const e = envelope(
      11,
      [
        [0.1, 0],
        [0.2, 1],
        [0.4, 0.5],
      ],
      10,
    );
    expect(Array.from(e).map((v) => Math.round(v * 100) / 100)).toEqual([
      0, 0, 1, 0.75, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
    ]);
  });

  test("ADSR rises, decays to sustain, holds, and releases to 0", () => {
    const sr = 1000;
    const e = adsr(
      1000,
      { attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.2, gate: 0.5 },
      sr,
    );
    expect(e[0]).toBe(0);
    expect(e[50]).toBeCloseTo(0.5, 5);
    expect(e[100]).toBeCloseTo(1, 5);
    expect(e[150]).toBeCloseTo(0.75, 5);
    expect(e[300]).toBeCloseTo(0.5, 5);
    expect(e[600]).toBeCloseTo(0.25, 5);
    expect(e[700]).toBe(0);
    expect(e[999]).toBe(0);
  });

  test("exponential decay halves every half-life", () => {
    const d = decay(1001, 0.1, 1000);
    expect(d[0]).toBe(1);
    expect(d[100]).toBeCloseTo(0.5, 6);
    expect(d[200]).toBeCloseTo(0.25, 6);
  });
});

describe("filters and effects", () => {
  test("a lowpass passes DC and cuts high frequencies", () => {
    const dc = biquad(new Float32Array(4800).fill(1), {
      type: "lowpass",
      freq: 1000,
    });
    expect(dc[4799]).toBeCloseTo(1, 4);
    const high = biquad(tone(48000, 10000), { type: "lowpass", freq: 500 });
    expect(rms(high, 4800)).toBeLessThan(0.01);
    const low = biquad(tone(48000, 100), { type: "lowpass", freq: 5000 });
    expect(rms(low, 4800)).toBeCloseTo(Math.SQRT1_2, 2);
  });

  test("a bandpass peaks at its centre at 0 dB", () => {
    const at = (f: number) =>
      rms(biquad(tone(48000, f), { type: "bandpass", freq: 1000, q: 2 }), 4800);
    expect(at(1000)).toBeCloseTo(Math.SQRT1_2, 2);
    expect(at(1000)).toBeGreaterThan(at(250) * 3);
    expect(at(1000)).toBeGreaterThan(at(4000) * 3);
  });

  test("circular processing makes a filtered loop periodic", () => {
    const n = 4800;
    const loop = new Float32Array(n);
    mix(loop, noise(1200, seededRandom(3)), n - 600, { wrap: true });
    const out = circular(loop, (x) =>
      biquad(x, { type: "lowpass", freq: 800, q: 4 }),
    );
    // Played twice, the circular output matches filtering the two copies at once.
    const twice = new Float32Array(2 * n);
    twice.set(out);
    twice.set(out, n);
    const ref = biquad(
      Float32Array.from({ length: 3 * n }, (_, i) => loop[i % n]),
      { type: "lowpass", freq: 800, q: 4 },
    ).slice(n);
    for (let i = 0; i < 2 * n; i += 97) expect(twice[i]).toBeCloseTo(ref[i], 5);
  });

  test("echo repeats after the delay, scaled by feedback", () => {
    const impulse = new Float32Array(100);
    impulse[0] = 1;
    const out = echo(impulse, 0.01, 0.5, 1, 1000);
    expect(out[0]).toBe(1);
    expect(out[10]).toBeCloseTo(1, 6);
    expect(out[20]).toBeCloseTo(0.5, 6);
    expect(out[30]).toBeCloseTo(0.25, 6);
  });

  test("reverb leaves a decaying tail after an impulse", () => {
    const impulse = new Float32Array(48000);
    impulse[0] = 1;
    const out = reverb(impulse, { size: 0.5, wet: 0.5 });
    const early = rms(out, 2000, 8000);
    const late = rms(out, 30000, 36000);
    expect(early).toBeGreaterThan(0);
    expect(late).toBeLessThan(early);
  });
});

describe("mixing and loops", () => {
  test("mix adds at an offset, and wraps when asked", () => {
    const t = new Float32Array(5);
    mix(t, new Float32Array([1, 2, 3]), 3);
    expect(Array.from(t)).toEqual([0, 0, 0, 1, 2]);
    const w = new Float32Array(5);
    mix(w, new Float32Array([1, 2, 3]), 3, { wrap: true, level: 2 });
    expect(Array.from(w)).toEqual([6, 0, 0, 2, 4]);
  });

  test("constant-power pan", () => {
    const [l, r] = pan(new Float32Array([1]), 0);
    expect(l[0] ** 2 + r[0] ** 2).toBeCloseTo(1, 6);
    expect(pan(new Float32Array([1]), -1)[1][0]).toBeCloseTo(0, 6);
  });

  test("a crossfaded loop runs from its last frame straight into its first", () => {
    const loopFrames = 48000;
    const x = 9600;
    const src = noise(loopFrames + x, seededRandom(9), "pink");
    const loop = crossfadeLoop(src, loopFrames);
    expect(loop.length).toBe(loopFrames);
    // The wrap (last → first) is the same step as src[loopFrames-1] → src[loopFrames].
    expect(loop[0]).toBeCloseTo(src[loopFrames] * Math.cos(Math.PI / 4 / x), 3);
    expect(loop[loopFrames - 1]).toBe(src[loopFrames - 1]);
    // After the crossfade the loop is the source.
    expect(loop[x + 10]).toBe(src[x + 10]);
    expect(() => crossfadeLoop(src, loopFrames + x + 1)).toThrow();
  });

  test("interleave and declick", () => {
    expect(
      Array.from(
        interleave([new Float32Array([1, 2]), new Float32Array([3, 4])]),
      ),
    ).toEqual([1, 3, 2, 4]);
    const d = declick(new Float32Array(10).fill(1), 2);
    expect(Array.from(d)).toEqual([0, 0.5, 1, 1, 1, 1, 1, 1, 0.5, 0]);
  });
});

describe("recipes", () => {
  test("names map to asset ids and outputs", () => {
    const r = recipeRef("ambience/hall");
    expect(r.id).toBe("ambience-hall");
    expect(r.output).toMatch(/public\/audio\/ambience\/hall\.mp3$/);
    expect(recipeRef("sfx/door-open").id).toBe("sfx-door-open");
    expect(() => recipeRef("music/hall")).toThrow(/recipes live in/);
    expect(() => recipeRef("sfx/Door_Open")).toThrow(/kebab-case/);
  });

  test("an ambience recipe renders a seamless, laid-out loop", () => {
    const recipe: SfxRecipe = {
      task: "A1",
      description: "test",
      seconds: 2,
      crossfadeSeconds: 0.5,
      render: (ctx) => {
        const n = noise(ctx.frames, ctx.random, "pink");
        return [n, n.map((v) => -v)];
      },
    };
    const r = renderRecipe(recipe, "ambience");
    expect(r.channels).toBe(2);
    expect(r.loop).toMatchObject({ loopStart: 0.5, loopEnd: 2.5 });
    const seam = seamReport(
      r.samples,
      r.loop!.loopStartFrame,
      r.loop!.loopEndFrame,
      12000,
      2,
    );
    expect(seam.identical).toBe(true);
    expect(seam.wrapStepRatio).toBeLessThan(1);
    // Deterministic: the same seed renders the same samples.
    expect(renderRecipe(recipe, "ambience").samples).toEqual(r.samples);
  });

  test("a one-shot must be mono and exactly ctx.frames long", () => {
    const ok: SfxRecipe = {
      task: "A1",
      description: "blip",
      seconds: 0.1,
      render: (ctx) => [tone(ctx.frames, 880)],
    };
    const r = renderRecipe(ok, "sfx");
    expect(r.channels).toBe(1);
    expect(r.samples.length).toBe(4800);
    expect(r.samples[0]).toBe(0);
    expect(() =>
      renderRecipe({ ...ok, render: (c) => [tone(c.frames - 1, 1)] }, "sfx"),
    ).toThrow(/ctx.frames/);
    expect(() =>
      renderRecipe(
        { ...ok, render: (c) => [tone(c.frames, 1), tone(c.frames, 1)] },
        "sfx",
      ),
    ).toThrow(/channel/);
  });
});
