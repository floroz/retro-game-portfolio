import { describe, expect, test, vi } from "vitest";
import { sceneImages } from "../assets";
import { CHARACTER_SHEET } from "../assets";
import {
  effectCycleStarted,
  effectShapes,
  hashRandom,
  litLamps,
  propFrame,
  propPassStarted,
  type Shape,
} from "../effects";
import { SceneEngine } from "../SceneEngine";
import { SCENES, TRAVEL_MAP_DATA } from "../scenes";
import type {
  FlutterEffect,
  GlintsEffect,
  LampsEffect,
  MovingProp,
  RainEffect,
  SceneData,
  SteamEffect,
  StarsEffect,
} from "../types";
import { sceneWarnings } from "../validate";

const RAIN: RainEffect = {
  kind: "rain",
  id: "rain",
  area: { x: 40, y: 30, w: 70, h: 50 },
  drops: 20,
  speed: 100,
  length: 5,
  slant: 10,
  color: "#b0a49a",
};

type Line = Extract<Shape, { kind: "line" }>;
const lines = (s: Shape[]) => s.filter((x): x is Line => x.kind === "line");

describe("effects are deterministic", () => {
  test("the hash is stable and spread over [0, 1)", () => {
    expect(hashRandom(1, 2, 3)).toBe(hashRandom(1, 2, 3));
    expect(hashRandom(1, 2, 3)).not.toBe(hashRandom(1, 2, 4));
    const xs = Array.from({ length: 2000 }, (_, i) => hashRandom(9, i));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  test("the same time draws the same frame", () => {
    expect(effectShapes(RAIN, 1234)).toEqual(effectShapes(RAIN, 1234));
    expect(effectShapes(RAIN, 1234)).not.toEqual(effectShapes(RAIN, 1300));
  });
});

describe("rain", () => {
  test("draws one streak per drop, of its length, slanting", () => {
    const streaks = lines(effectShapes(RAIN, 500));
    expect(streaks).toHaveLength(20);
    for (const s of streaks) {
      expect(s.y2 - s.y1).toBeCloseTo(5);
      // Leaning top-right: it drifts left as it falls.
      expect(s.x2).toBeLessThan(s.x1);
      expect(s.y2).toBeGreaterThanOrEqual(30);
      expect(s.y1).toBeLessThanOrEqual(80);
    }
  });

  test("falls at its speed", () => {
    const a = lines(effectShapes(RAIN, 1000));
    const b = lines(effectShapes(RAIN, 1050));
    // 50 ms at 100 px/s is 5 px, for every drop still on the same pass.
    const moved = a.map((s, i) => b[i].y2 - s.y2).filter((d) => d > 0);
    expect(moved.length).toBeGreaterThan(10);
    for (const d of moved) expect(d).toBeCloseTo(5);
  });
});

describe("steam", () => {
  const STEAM: SteamEffect = {
    kind: "steam",
    id: "moka",
    x: 100,
    y: 100,
    everyMs: 500,
    lifeMs: 2000,
    rise: 20,
    size: 3,
    color: "#fff",
  };

  test("puffs rise, grow, then shrink and vanish", () => {
    const at = (now: number) =>
      effectShapes(STEAM, now).filter((s) => s.kind === "disc");
    // At 1000 ms: puffs born at 0, 500, and 1000 (too small yet to show).
    const puffs = at(1000);
    expect(puffs.length).toBe(2);
    const [young, old] = [...puffs].sort((a, b) => b.y - a.y);
    expect(old.y).toBeLessThan(young.y);
    // A puff is biggest part way up, gone at the end of its life.
    const r = (now: number) =>
      at(now).find((p) => Math.abs(p.y - (100 - 20 * (now / 2000))) < 1e-6)
        ?.r ?? 0;
    expect(r(700)).toBeGreaterThan(r(100));
    expect(r(1950)).toBeLessThan(r(700));
    expect(at(2010).every((p) => p.y > 100 - 20)).toBe(true);
  });
});

describe("stars", () => {
  const STARS: StarsEffect = {
    kind: "stars",
    id: "sky",
    points: Array.from({ length: 12 }, (_, i) => [10 + i * 5, 10]),
    periodMs: 2000,
    color: "#fff",
    dim: "#468",
  };

  test("twinkle in turn: some bright with a cross, some dim", () => {
    const shapes = effectShapes(STARS, 700);
    const bright = shapes.filter((s) => s.kind === "px" && s.color === "#fff");
    const dim = shapes.filter((s) => s.kind === "px" && s.color === "#468");
    expect(bright.length).toBeGreaterThan(0);
    expect(dim.length + bright.length).toBeGreaterThanOrEqual(12);
    // Every star comes round to its brightest within one period.
    for (let i = 0; i < 12; i++) {
      const brightest = Array.from({ length: 40 }, (_, k) =>
        effectShapes(STARS, k * 50).filter(
          (s) => s.kind === "px" && s.y === 10 && s.x === 10 + i * 5 + 0.5,
        ),
      ).some((a) => a.length > 0);
      expect(brightest).toBe(true);
    }
  });
});

describe("glints", () => {
  const GLINTS: GlintsEffect = {
    kind: "glints",
    id: "lake",
    area: { x: 100, y: 60, w: 80, h: 10 },
    count: 8,
    lifeMs: 1000,
    length: 4,
    color: "#fff",
  };

  test("come and go inside the water, never longer than their length", () => {
    for (let now = 0; now < 4000; now += 137) {
      for (const s of effectShapes(GLINTS, now)) {
        if (s.kind !== "rect") throw new Error("glints are dashes");
        expect(s.w).toBeLessThanOrEqual(4);
        expect(s.y).toBeGreaterThanOrEqual(60);
        expect(s.y).toBeLessThanOrEqual(70);
        expect(s.x + s.w / 2).toBeGreaterThanOrEqual(100);
        expect(s.x + s.w / 2).toBeLessThanOrEqual(180);
      }
    }
    // Moves on each life.
    const a = effectShapes(GLINTS, 250);
    const b = effectShapes(GLINTS, 1250);
    expect(a).not.toEqual(b);
  });
});

describe("lamps", () => {
  const base: LampsEffect = {
    kind: "lamps",
    id: "fruit",
    points: [
      [0, 0],
      [4, 0],
      [8, 0],
      [12, 0],
    ],
    size: 2,
    pattern: "chase",
    stepMs: 200,
    on: "#ff0",
    off: "#300",
  };

  test("chase runs one light along the row", () => {
    expect(litLamps(base, 0)).toEqual([true, false, false, false]);
    expect(litLamps(base, 1)).toEqual([false, true, false, false]);
    expect(litLamps(base, 5)).toEqual([false, true, false, false]);
    const shapes = effectShapes(base, 450);
    expect(shapes.filter((s) => s.color === "#ff0")).toHaveLength(1);
    expect(shapes.filter((s) => s.color === "#300")).toHaveLength(3);
  });

  test("alternate swaps every other lamp; random is steady within a step", () => {
    const alt = { ...base, pattern: "alternate" as const };
    expect(litLamps(alt, 0)).toEqual([true, false, true, false]);
    expect(litLamps(alt, 1)).toEqual([false, true, false, true]);
    const rnd = { ...base, pattern: "random" as const };
    expect(litLamps(rnd, 3)).toEqual(litLamps(rnd, 3));
    const unlit = { ...base, off: undefined };
    expect(effectShapes(unlit, 0)).toHaveLength(1);
  });
});

describe("split-flap flutter", () => {
  const FLAP: FlutterEffect = {
    kind: "flutter",
    id: "board",
    rows: [
      { x: 0, y: 0, w: 40, h: 6 },
      { x: 0, y: 8, w: 40, h: 6 },
    ],
    everyMs: 10000,
    durationMs: 600,
    staggerMs: 100,
    edge: "#000",
    face: "#333",
    sound: "split-flap",
  };

  test("flutters each row in turn, then rests", () => {
    const rows = (now: number) =>
      new Set(
        effectShapes(FLAP, now).map((s) =>
          s.kind === "rect" && s.y >= 8 ? 1 : 0,
        ),
      );
    expect(rows(50)).toEqual(new Set([0]));
    expect(rows(300)).toEqual(new Set([0, 1]));
    expect(effectShapes(FLAP, 800)).toEqual([]);
    expect(effectShapes(FLAP, 10050).length).toBeGreaterThan(0);
  });

  test("its sound plays as each flutter starts, not at time 0", () => {
    expect(effectCycleStarted(FLAP, 0, 16)).toBe(false);
    expect(effectCycleStarted(FLAP, 9990, 10006)).toBe(true);
    expect(effectCycleStarted(FLAP, 10006, 10022)).toBe(false);
  });
});

describe("moving props", () => {
  const BUS: MovingProp = {
    id: "bus",
    sprite: "bus.png",
    frames: 2,
    frameMs: 250,
    path: [
      { at: 0, x: 120, y: 56 },
      { at: 1, x: 20, y: 56 },
    ],
    durationMs: 4000,
    everyMs: 10000,
    delayMs: 1000,
    faceTravel: true,
  };

  test("travels its path over its duration, from its delay", () => {
    expect(propFrame(BUS, 500)).toBeNull();
    expect(propFrame(BUS, 1000)).toMatchObject({ x: 120, y: 56, scale: 1 });
    expect(propFrame(BUS, 3000)?.x).toBeCloseTo(70);
    expect(propFrame(BUS, 5000)?.x).toBeCloseTo(20);
    // Hidden until the next pass, which starts everyMs later.
    expect(propFrame(BUS, 7000)).toBeNull();
    expect(propFrame(BUS, 11000)?.x).toBeCloseTo(120);
  });

  test("animates its strip and faces the way it travels", () => {
    expect(propFrame(BUS, 1000)?.frame).toBe(0);
    expect(propFrame(BUS, 1300)?.frame).toBe(1);
    expect(propFrame(BUS, 1000)?.flip).toBe(true);
    expect(propFrame({ ...BUS, faceTravel: false }, 1000)?.flip).toBe(false);
  });

  test("a plane takes off: slow then fast, shrinking into the sky", () => {
    const plane: MovingProp = {
      id: "plane",
      sprite: "plane.png",
      path: [
        { at: 0, x: 0, y: 50, scale: 1 },
        { at: 1, x: 100, y: 10, scale: 0.4 },
      ],
      durationMs: 1000,
      ease: "in",
    };
    const half = propFrame(plane, 500);
    expect(half?.x).toBeCloseTo(25);
    expect(half?.scale).toBeCloseTo(0.85);
    expect(propFrame(plane, 999.9)?.scale).toBeCloseTo(0.4, 2);
    // Back to back without everyMs: the next take-off.
    expect(propFrame(plane, 1000)?.scale).toBeCloseTo(1);
  });

  test("the cuckoo pops out, waits, and goes back in", () => {
    const cuckoo: MovingProp = {
      id: "cuckoo",
      sprite: "bird.png",
      path: [
        { at: 0, x: 220, y: 19 },
        { at: 0.2, x: 212, y: 19 },
        { at: 0.8, x: 212, y: 19 },
        { at: 1, x: 220, y: 19 },
      ],
      durationMs: 2000,
      everyMs: 15000,
      sound: "cuckoo",
    };
    expect(propFrame(cuckoo, 200)?.x).toBeCloseTo(216);
    expect(propFrame(cuckoo, 1000)?.x).toBeCloseTo(212);
    expect(propFrame(cuckoo, 1800)?.x).toBeCloseTo(216);
    expect(propFrame(cuckoo, 5000)).toBeNull();
    expect(propPassStarted(cuckoo, 0, 16)).toBe(false);
    expect(propPassStarted(cuckoo, 14990, 15006)).toBe(true);
    expect(propPassStarted(BUS, 990, 1006)).toBe(true);
  });
});

describe("effects and props in a scene", () => {
  const cuckoo: MovingProp = {
    id: "cuckoo",
    sprite: "bird.png",
    path: [
      { at: 0, x: 220, y: 19 },
      { at: 1, x: 212, y: 19 },
    ],
    durationMs: 1000,
    everyMs: 3000,
    sound: "cuckoo",
  };
  const zurich: SceneData = {
    ...SCENES.zurich,
    animations: [],
    props: [cuckoo],
    effects: [
      {
        kind: "flutter",
        id: "flap",
        rows: [{ x: 0, y: 0, w: 10, h: 4 }],
        everyMs: 2000,
        durationMs: 300,
        edge: "#000",
        face: "#111",
        sound: "split-flap",
      },
    ],
  };

  test("prop sprites are preloaded with the scene", () => {
    expect(sceneImages(zurich)).toContain("bird.png");
  });

  test("the engine plays their sounds as they start", () => {
    const sound = vi.fn();
    const engine = new SceneEngine({
      scenes: { ...SCENES, zurich },
      travelMap: TRAVEL_MAP_DATA,
      sheet: CHARACTER_SHEET,
      host: { openSection: vi.fn(), sceneChanged: vi.fn(), sound },
      start: "zurich",
    });
    for (let t = 0; t < 6100; t += 16) engine.update(16);
    const calls = sound.mock.calls.map((c) => c[0]);
    expect(calls.filter((c) => c === "cuckoo")).toHaveLength(2);
    expect(calls.filter((c) => c === "split-flap")).toHaveLength(3);
  });

  test("the dev overlay warns about a path out of order", () => {
    const bad = {
      ...zurich,
      props: [{ ...cuckoo, path: [...cuckoo.path].reverse() }],
    };
    expect(sceneWarnings(bad, SCENES)).toContain(
      "cuckoo: path keys need to run in order from at 0 to at 1",
    );
    expect(sceneWarnings(zurich, SCENES)).toEqual([]);
  });
});

describe("the Hall plane's window clip", () => {
  const plane = SCENES.hall.props?.find((p) => p.id === "plane");
  const clip = [plane?.clip ?? []].flat();

  test("leaves the mullion and the monitor poles out, so it passes behind them", () => {
    for (const post of [98, 99, 117, 118, 123, 124]) {
      expect(clip.some((r) => post >= r.x && post < r.x + r.w)).toBe(false);
    }
  });

  test("shows it again in the left pane after it passes the mullion", () => {
    if (!plane) throw new Error("the Hall has no plane");
    const start = plane.delayMs ?? 0;
    const leftPane = clip.filter((r) => r.x + r.w <= 123);
    const seen = Array.from({ length: 50 }, (_, i) =>
      propFrame(plane, start + (plane.durationMs * i) / 50),
    ).some(
      (f) =>
        f !== null &&
        leftPane.some(
          (r) => f.x >= r.x && f.x < r.x + r.w && f.y >= r.y && f.y < r.y + r.h,
        ),
    );
    expect(seen).toBe(true);
  });
});
