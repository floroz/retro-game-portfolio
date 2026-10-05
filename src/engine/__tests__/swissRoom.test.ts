import { describe, expect, test } from "vitest";
import { ZURICH_SCENE } from "../../config/scenes/zurich";
import { animationFrame } from "../animation";
import { effectShapes, propFrame } from "../effects";
import { findPath, pointInPolygon, segmentInPolygon } from "../geometry";

const pendulum = ZURICH_SCENE.effects!.find((e) => e.kind === "pendulum")!;
const steam = ZURICH_SCENE.effects!.find((e) => e.kind === "steam")!;
const cow = ZURICH_SCENE.animations!.find((a) => a.id === "garden-cow")!;

describe("Swiss room", () => {
  test("the distant balloon exits the window at both ends and returns with a gentle rise and fall", () => {
    const balloon = ZURICH_SCENE.props!.find(
      (prop) => prop.id === "alpine-balloon",
    )!;
    const frame = (seconds: number) =>
      propFrame(balloon, balloon.delayMs! + seconds * 1000)!;
    expect(propFrame(balloon, 0)).toBeNull();
    expect(frame(0).x + 9).toBeLessThan(115);
    expect(frame(60).x).toBeGreaterThan(198);
    expect(frame(124).x + 9).toBeLessThan(115);
    expect(frame(28).x).toBeGreaterThan(frame(14).x);
    expect(frame(92).x).toBeLessThan(frame(78).x);
    const heights = Array.from({ length: 128 }, (_, second) => frame(second).y);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(4);
    expect(Math.min(...heights)).toBeGreaterThan(24);
    expect(Math.max(...heights) + 13).toBeLessThan(43);
    expect(balloon.hideForReducedMotion).toBe(true);
  });

  test("the pendulum keeps a fixed pivot and rod length through a complete swing", () => {
    if (pendulum.kind !== "pendulum") throw new Error("Missing pendulum");
    const xs: number[] = [];
    for (let i = 0; i <= 8; i++) {
      const rod = effectShapes(pendulum, (i * pendulum.periodMs) / 8)[0];
      if (rod.kind !== "line") throw new Error("Missing rod");
      expect(rod.x1).toBe(pendulum.x);
      expect(rod.y1).toBe(pendulum.y);
      expect(Math.hypot(rod.x2 - rod.x1, rod.y2 - rod.y1)).toBeCloseTo(
        pendulum.length,
      );
      xs.push(rod.x2);
    }
    expect(Math.min(...xs)).toBeLessThan(pendulum.x - 1);
    expect(Math.max(...xs)).toBeGreaterThan(pendulum.x + 1);
    expect(xs[0]).toBeCloseTo(xs.at(-1)!);
  });

  test("fondue steam rises and stays within its opacity bounds", () => {
    const before = effectShapes(steam, 300)[0];
    const after = effectShapes(steam, 600)[0];
    if (before.kind !== "disc" || after.kind !== "disc")
      throw new Error("Missing steam");
    expect(after.y).toBeLessThan(before.y);
    for (let now = 0; now < 6000; now += 100) {
      for (const shape of effectShapes(steam, now)) {
        expect(shape.alpha).toBeGreaterThanOrEqual(0);
        expect(shape.alpha).toBeLessThanOrEqual(1);
      }
    }
    expect(effectShapes(steam, 600, true)).toEqual([]);
    expect(effectShapes(pendulum, 0, true)).toEqual(
      effectShapes(pendulum, 1900, true),
    );
  });

  test("the garden cow returns to rest between gestures and freezes for reduced motion", () => {
    const start = cow.everyMs! - cow.phaseMs!;
    expect(animationFrame(cow, start)?.frame).toBe(0);
    expect(animationFrame(cow, start + cow.frameMs * 2)?.frame).toBe(2);
    expect(animationFrame(cow, start + cow.frameMs * cow.frames)?.frame).toBe(
      0,
    );
    expect(animationFrame(cow, start + cow.frameMs * 2, true)?.frame).toBe(0);
  });

  test("furniture and garden stay off the walkable floor, with every interaction reachable", () => {
    const { walkbox } = ZURICH_SCENE;
    for (const point of [
      [45, 110],
      [132, 147],
      [286, 80],
    ] as const) {
      expect(pointInPolygon(point, walkbox)).toBe(false);
    }
    for (const start of [
      [40, 145],
      [195, 110],
      [287, 106],
    ] as const) {
      expect(pointInPolygon(start, walkbox)).toBe(true);
      for (const object of [...ZURICH_SCENE.objects, ...ZURICH_SCENE.exits]) {
        const goal = object.interactionPoint;
        if (!goal) continue;
        const path = findPath(start, [goal.x, goal.y], walkbox);
        expect(path.at(-1), object.id).toEqual([goal.x, goal.y]);
        let previous: readonly [number, number] = start;
        for (const step of path) {
          expect(segmentInPolygon(previous, step, walkbox), object.id).toBe(
            true,
          );
          previous = step;
        }
      }
    }
  });
});
