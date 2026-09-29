import { describe, expect, test } from "vitest";
import { animationFrame, cycleStarted } from "../animation";
import type { SceneAnimation } from "../types";

const base: SceneAnimation = {
  id: "loop",
  strip: "anim.png",
  frames: 4,
  x: 10,
  y: 20,
  frameMs: 100,
};

describe("anim-* strips", () => {
  test("loop forever by default", () => {
    expect(animationFrame(base, 0)?.frame).toBe(0);
    expect(animationFrame(base, 250)?.frame).toBe(2);
    expect(animationFrame(base, 450)?.frame).toBe(0);
  });

  test("play one cycle every everyMs, holding frame 0 between", () => {
    const cuckoo = { ...base, everyMs: 15000 };
    expect(animationFrame(cuckoo, 150)?.frame).toBe(1);
    expect(animationFrame(cuckoo, 350)?.frame).toBe(3);
    expect(animationFrame(cuckoo, 5000)?.frame).toBe(0);
    expect(animationFrame(cuckoo, 15150)?.frame).toBe(1);
  });

  test("move along their motion and hide between passes", () => {
    const bus = {
      ...base,
      everyMs: 10000,
      motion: { dx: 100, dy: 0, durationMs: 2000 },
    };
    expect(animationFrame(bus, 0)).toMatchObject({ x: 10, y: 20 });
    expect(animationFrame(bus, 1000)).toMatchObject({ x: 60, y: 20 });
    expect(animationFrame(bus, 5000)).toBeNull();
    expect(animationFrame(bus, 11000)).toMatchObject({ x: 60 });
  });

  test("move back to back without everyMs", () => {
    const ferry = { ...base, motion: { dx: 0, dy: 10, durationMs: 1000 } };
    expect(animationFrame(ferry, 1500)).toMatchObject({ y: 25 });
  });

  test("start a cycle once per everyMs, for the sound", () => {
    const cuckoo = { ...base, everyMs: 15000 };
    expect(cycleStarted(cuckoo, 0, 16)).toBe(false);
    expect(cycleStarted(cuckoo, 14990, 15006)).toBe(true);
    expect(cycleStarted(cuckoo, 15006, 15022)).toBe(false);
    expect(cycleStarted(cuckoo, 29990, 30000)).toBe(true);
  });

  test("start a cycle every loop or pass without everyMs", () => {
    expect(cycleStarted(base, 390, 410)).toBe(true);
    expect(cycleStarted(base, 410, 430)).toBe(false);
    const ferry = { ...base, motion: { dx: 0, dy: 10, durationMs: 1000 } };
    expect(cycleStarted(ferry, 990, 1010)).toBe(true);
    expect(cycleStarted(ferry, 390, 410)).toBe(false);
  });
});
