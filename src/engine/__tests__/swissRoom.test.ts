import { describe, expect, test } from "vitest";
import { ZURICH_SCENE } from "../../config/scenes/zurich";
import { idleRise } from "../animation";
import { effectShapes } from "../effects";
import { findPath, pointInPolygon, segmentInPolygon } from "../geometry";

const pendulum = ZURICH_SCENE.effects!.find((e) => e.kind === "pendulum")!;
const sleep = ZURICH_SCENE.effects!.find((e) => e.kind === "sleep")!;
const cow = ZURICH_SCENE.animations!.find((a) => a.id === "sleeping-cow")!;

describe("Swiss room", () => {
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
    expect(Math.min(...xs)).toBeLessThan(pendulum.x - 2);
    expect(Math.max(...xs)).toBeGreaterThan(pendulum.x + 2);
    expect(xs[0]).toBeCloseTo(xs.at(-1)!);
  });

  test("sleep letters rise, fade and repeat, while reduced motion holds both effects still", () => {
    if (sleep.kind !== "sleep") throw new Error("Missing sleep effect");
    const before = effectShapes(sleep, 300)[0];
    const after = effectShapes(sleep, 600)[0];
    if (before.kind !== "line" || after.kind !== "line")
      throw new Error("Missing Z");
    expect(after.y1).toBeLessThan(before.y1);
    expect(after.x1).toBeGreaterThan(before.x1);
    expect(effectShapes(sleep, 0)).toEqual(effectShapes(sleep, sleep.periodMs));
    for (const effect of [sleep, pendulum]) {
      expect(effectShapes(effect, 0, true)).toEqual(
        effectShapes(effect, 1900, true),
      );
    }
    for (let now = 0; now <= sleep.periodMs; now += 100) {
      for (const shape of effectShapes(sleep, now)) {
        expect(shape.alpha).toBeGreaterThanOrEqual(0);
        expect(shape.alpha).toBeLessThanOrEqual(1);
      }
    }
  });

  test("breathing is gentle and returns smoothly to rest", () => {
    expect(idleRise(cow, 0)).toBe(0);
    expect(idleRise(cow, 2100)).toBeCloseTo(0.7);
    expect(idleRise(cow, 4200)).toBeCloseTo(0);
  });

  test("the cow's resting place is solid, and every object stays reachable around it", () => {
    const { walkbox } = ZURICH_SCENE;
    expect(pointInPolygon([42, 150], walkbox)).toBe(false);
    for (const start of [
      [20, 130],
      [90, 150],
      [298, 112],
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
