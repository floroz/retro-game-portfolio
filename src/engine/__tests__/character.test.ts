import { describe, expect, test } from "vitest";
import sheetJson from "../../assets/character/daniele.json";
import { CharacterAnimator, facingFor, parseSheet } from "../character";

const sheet = parseSheet(sheetJson, "daniele.png");
const input = {
  moving: false,
  distance: 0,
  scale: 1,
  facing: "e" as const,
  talking: false,
};

describe("character sheet", () => {
  test("daniele.json has every tag the engine needs", () => {
    expect(sheet.frames).toHaveLength(37);
    expect(sheet.tags["walk-e"]).toMatchObject({ from: 0, to: 7 });
    expect(sheet.stride).toBeGreaterThan(0);
  });

  test("rejects a sheet that is missing a tag", () => {
    const broken = {
      ...sheetJson,
      tags: { ...sheetJson.tags, "walk-e": undefined },
    };
    expect(() => parseSheet(broken, "x.png")).toThrow(/walk-e/);
  });

  test("walk frames advance by distance, not time", () => {
    const a = new CharacterAnimator(sheet, () => 0);
    const perFrame = sheet.stride / 8;
    a.update(16, { ...input, moving: true, distance: perFrame * 0.5 });
    expect(a.pose().body).toEqual(sheet.frames[0]);
    a.update(1000, { ...input, moving: true, distance: perFrame * 0.6 });
    expect(a.pose().body).toEqual(sheet.frames[1]);
  });

  test("walk distance per frame shrinks with the sprite", () => {
    const a = new CharacterAnimator(sheet, () => 0);
    const perFrame = (sheet.stride / 8) * 0.7;
    a.update(16, {
      ...input,
      moving: true,
      scale: 0.7,
      distance: perFrame * 2.1,
    });
    expect(a.pose().body).toEqual(sheet.frames[2]);
  });

  test("walking into the distance doesn't skip ahead as the frames shrink", () => {
    const a = new CharacterAnimator(sheet, () => 0);
    // 37 frames at full size, then 4 more at half size: the frame follows
    // the frames walked, not the px walked over the current size.
    const perFrame = sheet.stride / 8;
    for (let i = 0; i < 37; i++) {
      a.update(16, { ...input, moving: true, distance: perFrame });
    }
    for (let i = 0; i < 4; i++) {
      a.update(16, {
        ...input,
        moving: true,
        scale: 0.5,
        distance: perFrame / 2,
      });
    }
    expect(a.pose().body).toEqual(sheet.frames[(37 + 4) % 8]);
  });

  test("footsteps land twice per cycle", () => {
    const a = new CharacterAnimator(sheet, () => 0);
    const perFrame = sheet.stride / 8;
    let steps = 0;
    for (let i = 0; i < 16; i++) {
      if (a.update(16, { ...input, moving: true, distance: perFrame })) steps++;
    }
    expect(steps).toBe(4);
  });

  test("west mirrors east", () => {
    const a = new CharacterAnimator(sheet);
    a.update(16, { ...input, facing: "w" });
    expect(a.pose().mirror).toBe(true);
    expect(a.pose().body).toEqual(sheet.frames[sheet.tags["idle-e"].from]);
  });

  test("idle holds, then blinks for about 120 ms", () => {
    const a = new CharacterAnimator(sheet, () => 0); // hold = 2000 ms
    a.update(16, { ...input, facing: "s" });
    const idle = sheet.tags["idle-s"].from;
    expect(a.pose().body).toEqual(sheet.frames[idle]);
    a.update(2000, { ...input, facing: "s" }); // breath
    expect(a.pose().body).toEqual(sheet.frames[idle + 1]);
    a.update(400, { ...input, facing: "s" }); // neutral again
    a.update(2000, { ...input, facing: "s" }); // blink
    expect(a.pose().body).toEqual(sheet.frames[idle + 2]);
    a.update(130, { ...input, facing: "s" });
    expect(a.pose().body).toEqual(sheet.frames[idle]);
  });

  test("use reaches, holds until released, then returns", () => {
    const a = new CharacterAnimator(sheet);
    const use = sheet.tags["use-n"].from;
    a.startUse();
    a.update(16, { ...input, facing: "n" });
    expect(a.pose().body).toEqual(sheet.frames[use]);
    a.update(200, { ...input, facing: "n" });
    expect(a.pose().body).toEqual(sheet.frames[use + 1]);
    a.update(5000, { ...input, facing: "n" });
    expect(a.pose().body).toEqual(sheet.frames[use + 1]);
    a.releaseUse();
    a.update(200, { ...input, facing: "n" });
    expect(a.using).toBe(false);
  });

  test("talking overlays a head only while idle, and never from behind", () => {
    const a = new CharacterAnimator(sheet, () => 0.5);
    a.update(16, { ...input, talking: true });
    expect(a.pose().head).not.toBeNull();
    a.update(16, { ...input, talking: true, facing: "n" });
    expect(a.pose().head).toBeNull();
    a.update(16, { ...input, talking: true, moving: true, distance: 1 });
    expect(a.pose().head).toBeNull();
  });

  test("facing follows the movement vector", () => {
    expect(facingFor(10, 2, "s")).toBe("e");
    expect(facingFor(-10, 2, "s")).toBe("w");
    expect(facingFor(1, -10, "e")).toBe("n");
    expect(facingFor(1, 10, "e")).toBe("s");
    expect(facingFor(0, 0, "w")).toBe("w");
  });
});
