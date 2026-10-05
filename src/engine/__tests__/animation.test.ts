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
  test("per-frame holds preserve the clerk's pause, glance, stamp and return", () => {
    const clerk = {
      ...base,
      frames: 5,
      frameDurationsMs: [1500, 600, 400, 700, 2200],
      freezeForReducedMotion: true,
    };
    expect(
      [0, 1499, 1500, 2099, 2100, 2499, 2500, 3199, 3200, 5399, 5400].map(
        (time) => animationFrame(clerk, time)?.frame,
      ),
    ).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 0]);
    expect(animationFrame(clerk, 2200, true)?.frame).toBe(0);
    expect(cycleStarted(clerk, 5399, 5400)).toBe(true);
    expect(cycleStarted(clerk, 499, 500)).toBe(false);
    expect(animationFrame({ ...clerk, everyMs: 8000 }, 6000)?.frame).toBe(0);
    expect(animationFrame({ ...clerk, phaseMs: 2100 }, 0)?.frame).toBe(2);
    expect(
      animationFrame(
        { ...clerk, motion: { dx: 10, dy: 0, durationMs: 8000 } },
        7500,
      )?.frame,
    ).toBe(2);
  });
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

  test("offset loops and their cycle boundary together", () => {
    const phased = { ...base, everyMs: 1000, phaseMs: 250 };
    expect(animationFrame(phased, 0)?.frame).toBe(2);
    expect(animationFrame(phased, 500)?.frame).toBe(0);
    expect(animationFrame(phased, 850)?.frame).toBe(1);
    expect(cycleStarted(phased, 740, 760)).toBe(true);
    expect(cycleStarted(phased, 990, 1010)).toBe(false);
  });

  test("reduced motion holds an opted-in loop at its resting pose", () => {
    const guest = { ...base, phaseMs: 250, freezeForReducedMotion: true };
    expect(animationFrame(guest, 1000, true)).toEqual({
      frame: 0,
      x: 10,
      y: 20,
    });
    expect(animationFrame(guest, 1000, false)?.frame).toBe(0);
    expect(animationFrame(guest, 0, false)?.frame).toBe(2);
    expect(animationFrame(base, 250, true)?.frame).toBe(2);
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
