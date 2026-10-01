import { describe, expect, test } from "vitest";
import {
  clampToPolygon,
  findPath,
  pointInPolygon,
  scaleAt,
  segmentInPolygon,
} from "../geometry";
import type { Vec } from "../types";

// A U shape: the notch between x 100-200 is not walkable above y 130.
const U: Vec[] = [
  [0, 100],
  [100, 100],
  [100, 130],
  [200, 130],
  [200, 100],
  [300, 100],
  [300, 160],
  [0, 160],
];

describe("walkbox geometry", () => {
  test("contains points inside and on the boundary", () => {
    expect(pointInPolygon([50, 120], U)).toBe(true);
    expect(pointInPolygon([0, 100], U)).toBe(true);
    expect(pointInPolygon([150, 110], U)).toBe(false);
  });

  test("clamps outside points to the nearest boundary point", () => {
    expect(clampToPolygon([50, 50], U)).toEqual([50, 100]);
    expect(clampToPolygon([50, 120], U)).toEqual([50, 120]);
  });

  test("detects segments that leave the polygon", () => {
    expect(segmentInPolygon([50, 110], [250, 110], U)).toBe(false);
    expect(segmentInPolygon([50, 140], [250, 140], U)).toBe(true);
  });

  test("walks straight when it can", () => {
    expect(findPath([10, 150], [290, 150], U)).toEqual([[290, 150]]);
  });

  test("walks around a concave notch", () => {
    const path = findPath([50, 110], [250, 110], U);
    expect(path.length).toBeGreaterThan(1);
    expect(path.at(-1)).toEqual([250, 110]);
    let prev: Vec = [50, 110];
    for (const p of path) {
      expect(segmentInPolygon(prev, p, U)).toBe(true);
      prev = p;
    }
  });

  test("clamps an unreachable target into the walkbox", () => {
    const path = findPath([50, 150], [150, 110], U);
    const end = path.at(-1);
    expect(end && pointInPolygon(end, U)).toBe(true);
  });

  test("scales by depth, clamped to the range", () => {
    const depth = { farY: 100, nearY: 160, farScale: 0.7, nearScale: 1 };
    expect(scaleAt(depth, 100)).toBeCloseTo(0.7);
    expect(scaleAt(depth, 130)).toBeCloseTo(0.85);
    expect(scaleAt(depth, 200)).toBeCloseTo(1);
    expect(scaleAt(depth, 0)).toBeCloseTo(0.7);
  });
});
