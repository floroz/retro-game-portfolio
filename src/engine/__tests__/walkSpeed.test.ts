import { describe, expect, test, vi } from "vitest";
import { CHARACTER_SHEET } from "../assets";
import { MAX_TRAVEL_TIME, VERTICAL_SPEED, WALK_SPEED } from "../constants";
import { heightAt, scaleAt } from "../geometry";
import { parseRig } from "../rig/rig";
import { placeholderRig } from "../rig/placeholder";
import { SceneEngine, type EngineHost } from "../SceneEngine";
import { SCENES, TRAVEL_MAP_DATA } from "../scenes";
import type { Facing, SceneId, SectionId } from "../types";
import { depthFactor, groundSpeed, walkTime } from "../walkSpeed";

const FRAME = 16;
const rig = parseRig(placeholderRig().json, "atlas.png");

function setup(start: SceneId, withRig = false) {
  const host = {
    openSection: vi.fn<(s: SectionId) => void>(),
    sceneChanged: vi.fn(),
    sound: vi.fn(),
    flightChanged: vi.fn(),
  } satisfies EngineHost;
  const engine = new SceneEngine({
    scenes: SCENES,
    travelMap: TRAVEL_MAP_DATA,
    sheet: CHARACTER_SHEET,
    rig: withRig ? rig : null,
    host,
    start,
    rng: () => 0.5,
  });
  return { engine, host };
}

/** Steps 16 ms frames until the walk ends. Returns the ms taken. */
function finishWalk(engine: SceneEngine, limit = 20000) {
  let t = 0;
  while (engine.walking && t < limit) {
    engine.update(FRAME);
    t += FRAME;
  }
  return t;
}

/** Walks to a point on the floor and stops there. */
function goTo(engine: SceneEngine, x: number, y: number) {
  engine.walkTo(x, y);
  finishWalk(engine);
  expect(engine.position.x).toBeCloseTo(x, 1);
  expect(engine.position.y).toBeCloseTo(y, 1);
}

interface Trace {
  /** Screen px per second, from each frame's move. */
  speeds: number[];
  /** Screen px moved, the facing while moving it, and the depth scale there. */
  legs: { distance: number; facing: Facing; scale: number }[];
  footsteps: number;
  ms: number;
}

/** Walks to a point, recording every frame. */
function trace(
  engine: SceneEngine,
  host: { sound: ReturnType<typeof vi.fn> },
  x: number,
  y: number,
  withRig = false,
): Trace {
  const steps = () =>
    host.sound.mock.calls.filter(([n]) => String(n).startsWith("footstep"))
      .length;
  const before = steps();
  const out: Trace = { speeds: [], legs: [], footsteps: 0, ms: 0 };
  engine.walkTo(x, y);
  while (engine.walking && out.ms < 20000) {
    const from = engine.position;
    engine.update(FRAME);
    const to = engine.position;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    out.speeds.push((Math.hypot(dx, dy) * 1000) / FRAME);
    const figure = withRig ? rig.figureHeight : CHARACTER_SHEET.figureHeight;
    out.legs.push({
      distance: Math.hypot(dx, dy),
      facing: to.facing,
      scale: scaleAt(engine.scene.depth, (from.y + to.y) / 2, figure),
    });
    out.ms += FRAME;
  }
  out.footsteps = steps() - before;
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("walking pace follows depth", () => {
  test("is the plain WALK_SPEED at the front edge, less at the back", () => {
    for (const scene of Object.values(SCENES)) {
      const { depth } = scene;
      expect(depthFactor(depth, depth.nearY)).toBe(1);
      expect(groundSpeed(depth, depth.nearY)).toBe(WALK_SPEED);
      expect(groundSpeed(depth, depth.farY)).toBeLessThanOrEqual(WALK_SPEED);
    }
  });

  test("matches his height there: the Hall's 34 px at the gates is 34/64 of the front's pace", () => {
    const { depth } = SCENES.hall;
    expect(depthFactor(depth, depth.farY)).toBeCloseTo(34 / 64, 6);
    expect(depthFactor(depth, 0)).toBeCloseTo(34 / 64, 6);
    expect(depthFactor(depth, 1000)).toBe(1);
  });

  test("works for pixel scenes with scales, whatever the character's size", () => {
    const depth = { farY: 100, nearY: 160, farScale: 0.7, nearScale: 1 };
    expect(depthFactor(depth, 100)).toBeCloseTo(0.7, 6);
    expect(depthFactor(depth, 130)).toBeCloseTo(0.85, 6);
    expect(depthFactor({ farY: 5, nearY: 5, nearScale: 0.5 }, 5)).toBe(1);
  });

  test.each(["hall", "zurich"] as const)(
    "%s: the same body-heights a second at the back and the front",
    (id) => {
      const { depth, walkbox } = SCENES[id];
      const { engine, host } = setup(id);
      const backY = id === "hall" ? 92 : depth.farY;
      const frontY = 157;
      const rows = [
        { y: backY, x0: 90, x1: 165 },
        { y: frontY, x0: 60, x1: 135 },
      ];
      // Sanity: both rows are inside the walkbox's y range.
      expect(Math.min(...walkbox.map((p) => p[1]))).toBeLessThanOrEqual(backY);
      const heights: number[] = [];
      for (const { y, x0, x1 } of rows) {
        goTo(engine, x0, y);
        const t = trace(engine, host, x1, y);
        // Skip the frame that ended the walk.
        const bodies = mean(t.speeds.slice(0, -1)) / heightAt(depth, y, 57.5);
        heights.push(bodies);
      }
      const [back, front] = heights;
      expect(Math.abs(back / front - 1)).toBeLessThan(0.1);
      // And the front edge is the v1 speed.
      expect(front * heightAt(depth, frontY, 57.5)).toBeCloseTo(
        WALK_SPEED * depthFactor(depth, frontY),
        5,
      );
      expect(WALK_SPEED * depthFactor(depth, frontY)).toBeGreaterThan(
        WALK_SPEED * 0.97,
      );
    },
  );

  test("the Hall no longer scurries: 2.6 body-heights a second at the back is gone", () => {
    const { depth } = SCENES.hall;
    const bodies = (y: number) => groundSpeed(depth, y) / heightAt(depth, y, 1);
    expect(bodies(91)).toBeCloseTo(bodies(158), 6);
    expect(bodies(158)).toBeCloseTo(WALK_SPEED / 64, 6);
  });

  test("up and down the screen is slower than across it, by VERTICAL_SPEED", () => {
    const across = setup("zurich");
    const vertical = setup("zurich");
    // The same floor line, no depth change over one frame's step to speak of.
    goTo(across.engine, 100, 140);
    goTo(vertical.engine, 100, 140);
    across.engine.setKeyboard(1, 0);
    vertical.engine.setKeyboard(0, -1);
    const a = across.engine.position;
    const v = vertical.engine.position;
    across.engine.update(FRAME);
    vertical.engine.update(FRAME);
    const dx = across.engine.position.x - a.x;
    const dy = v.y - vertical.engine.position.y;
    expect(dy / dx).toBeCloseTo(VERTICAL_SPEED, 2);
  });

  test("the pace along a walk is the ground speed where the feet are", () => {
    const { engine, host } = setup("hall");
    goTo(engine, 100, 157);
    const t = trace(engine, host, 100, 100);
    // Up the screen, at each frame: VERTICAL_SPEED of the ground speed.
    const first = t.speeds[0];
    const last = t.speeds[t.speeds.length - 2];
    const { depth } = SCENES.hall;
    expect(first).toBeCloseTo(groundSpeed(depth, 157) * VERTICAL_SPEED, 0);
    expect(last / first).toBeGreaterThan(0.5);
    expect(last / first).toBeLessThan(0.62);
    expect(last).toBeGreaterThan(0.5 * first);
  });
});

describe("walking keeps the feet on the floor", () => {
  const cases = [
    ["sheet", false],
    ["rig", true],
  ] as const;

  describe.each(cases)("%s", (_name, withRig) => {
    const stride = withRig ? rig.stride : CHARACTER_SHEET.stride;
    /**
     * How long a cycle is against a side-on stride: the sheet's front and
     * back walks are 6 frames to the side walk's 8, the rig's are 0.6.
     */
    const cycle = (f: Facing) =>
      f === "n" || f === "s" ? (withRig ? 0.6 : 0.75) : 1;
    /** Footfalls expected for the distance walked: two per cycle, scaled. */
    const expected = (t: Trace) =>
      t.legs.reduce(
        (n, l) => n + l.distance / ((stride * cycle(l.facing) * l.scale) / 2),
        0,
      );

    test.each([
      ["across at the back of the Hall", "hall", [90, 93], [165, 93]],
      ["across at the front of the Hall", "hall", [20, 157], [200, 157]],
      ["up the Hall to the gates", "hall", [100, 157], [100, 96]],
      ["diagonally through Zurich", "zurich", [10, 105], [160, 157]],
    ] as const)("%s: a foot lands per half stride", (_n, id, from, to) => {
      const { engine, host } = setup(id, withRig);
      goTo(engine, from[0], from[1]);
      const t = trace(engine, host, to[0], to[1], withRig);
      expect(t.footsteps).toBeGreaterThan(3);
      expect(Math.abs(t.footsteps - expected(t))).toBeLessThanOrEqual(1.5);
    });

    test("the step rate is the same at every depth", () => {
      const { engine, host } = setup("hall", withRig);
      goTo(engine, 90, 93);
      const back = trace(engine, host, 165, 93, withRig);
      goTo(engine, 20, 157);
      const front = trace(engine, host, 200, 157, withRig);
      const rate = (t: Trace) => t.footsteps / (t.ms / 1000);
      // Body-heights a second and strides per body-height are both constant.
      expect(Math.abs(rate(back) / rate(front) - 1)).toBeLessThan(0.15);
    });
  });
});

describe("shortcut walks keep the travel cap", () => {
  const points: [number, number][] = [
    [6, 157],
    [200, 157],
    [280, 100],
    [100, 96],
    [10, 103],
  ];
  const ids = ["hall", "zurich", "sorrento", "london"] as const;
  const sections: SectionId[] = ["about", "skills", "experience", "contact"];

  test("from anywhere, at any depth, the walk to the exit takes at most MAX_TRAVEL_TIME", () => {
    let slowest = 0;
    for (const id of ids) {
      for (const [x, y] of points) {
        for (const section of sections) {
          const { engine } = setup(id);
          engine.walkTo(x, y);
          finishWalk(engine);
          engine.goToSection(section);
          const ms = finishWalk(engine);
          // One frame's slack: the clock runs in 16 ms frames.
          expect(ms, `${id} ${x},${y} ${section}`).toBeLessThanOrEqual(
            MAX_TRAVEL_TIME * 1000 + FRAME,
          );
          slowest = Math.max(slowest, ms);
        }
      }
    }
    // The cap is what's holding the long ones back, not a short room.
    expect(slowest).toBeGreaterThan(MAX_TRAVEL_TIME * 1000 - 100);
  });

  test("a long walk is sped up to fit; a short one keeps the natural pace", () => {
    const { depth } = SCENES.hall;
    const exit = SCENES.hall.exits.find((e) => e.to === "london");
    if (!exit) throw new Error("no gate");
    const gate: [number, number] = [
      exit.interactionPoint.x,
      exit.interactionPoint.y,
    ];
    const natural = (from: [number, number]) =>
      walkTime(depth, from, [gate]) * 1000;
    // Front-left corner to a gate is well over the cap at the natural pace.
    expect(natural([6, 157])).toBeGreaterThan(MAX_TRAVEL_TIME * 1000);
    const { engine } = setup("hall");
    goTo(engine, 6, 157);
    engine.goToSection("skills");
    const ms = finishWalk(engine);
    expect(ms).toBeGreaterThan(MAX_TRAVEL_TIME * 1000 - 60);
    expect(ms).toBeLessThanOrEqual(MAX_TRAVEL_TIME * 1000 + FRAME);
    // A step or two away takes the natural time, not the cap.
    const near = setup("hall");
    const [gx, gy] = gate;
    goTo(near.engine, gx - 6, gy + 3);
    near.engine.goToSection("skills");
    const t = finishWalk(near.engine);
    expect(t).toBeLessThan(natural([gx - 6, gy + 3]) + 3 * FRAME);
    expect(t).toBeLessThan(MAX_TRAVEL_TIME * 1000);
  });

  test("walkTime is the ground distance over the ground speed", () => {
    const { depth } = SCENES.zurich;
    // Across the front edge, at WALK_SPEED.
    expect(walkTime(depth, [0, depth.nearY], [[70, depth.nearY]])).toBeCloseTo(
      70 / WALK_SPEED,
      6,
    );
    // Up the screen it's slower by VERTICAL_SPEED, and slower again at the back.
    const up = walkTime(depth, [50, depth.nearY], [[50, depth.farY]]);
    const dy = depth.nearY - depth.farY;
    expect(up).toBeGreaterThan(dy / VERTICAL_SPEED / WALK_SPEED);
  });
});
