import { describe, expect, test } from "vitest";
import { CYCLE_SECONDS, coffeeLift, vesselAt } from "../pocketTimeline";

describe("the approved coffee rhythm", () => {
  test("two complete one-second mouth holds in each of four stages", () => {
    const holds: { stage: number; seconds: number }[] = [];
    let previous = 0;
    for (let frame = 0; frame < CYCLE_SECONDS * 120; frame++) {
      const elapsed = frame / 120,
        lift = coffeeLift(elapsed);
      expect(lift).toBeGreaterThanOrEqual(0);
      expect(lift).toBeLessThanOrEqual(1);
      if (lift === 1) {
        if (previous !== 1)
          holds.push({
            stage: Math.floor(elapsed / (CYCLE_SECONDS / 4)),
            seconds: 0,
          });
        holds.at(-1)!.seconds += 1 / 120;
      }
      previous = lift;
    }
    for (let stage = 0; stage < 4; stage++)
      expect(holds.filter((h) => h.stage === stage)).toHaveLength(2);
    for (const hold of holds) expect(hold.seconds).toBeCloseTo(1, 1);
    expect(coffeeLift(0)).toBe(0);
    expect(coffeeLift(CYCLE_SECONDS)).toBe(0);
  });
  test("a requested sip comes back to the table", () => {
    expect(coffeeLift(15, 0)).toBe(0);
    expect(coffeeLift(15, 1.5)).toBe(1);
    expect(coffeeLift(15, 2.8)).toBe(0);
  });
});

test("vessels alternate with a clear window between crossings", () => {
  expect([0, 14, 15, 33, 34].map((t) => vesselAt(t).kind)).toEqual([
    "ferry",
    "gap",
    "boat",
    "gap",
    "ferry",
  ]);
  expect(vesselAt(13).x).toBeGreaterThan(vesselAt(1).x);
  expect(vesselAt(32).x).toBeLessThan(vesselAt(16).x);
});
