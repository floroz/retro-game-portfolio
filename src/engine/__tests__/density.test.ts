import { describe, expect, test } from "vitest";
import sheetJson from "../../assets/character/daniele.json";
import {
  CHARACTER_SHEET,
  densityRules,
  logicalBox,
  resolveDensity,
  slotSpriteUrl,
  type DensityRule,
} from "../assets";
import { parseSheet, placeCell } from "../character";
import { detectDensity, snap } from "../density";
import { SCENES, TRAVEL_MAP_DATA } from "../scenes";
import type { Size } from "../density";

const BG: Size = { w: 320, h: 160 };

describe("density detection", () => {
  test("a background is density 1 at 320x160 and density 2 at 640x320", () => {
    expect(detectDensity({ w: 320, h: 160 }, BG)).toBe(1);
    expect(detectDensity({ w: 640, h: 320 }, BG)).toBe(2);
  });

  test("a sprite redrawn a few px off its footprint still reads right", () => {
    const tap = { w: 7, h: 16 };
    expect(detectDensity({ w: 14, h: 32 }, tap)).toBe(2);
    expect(detectDensity({ w: 15, h: 33 }, tap)).toBe(2);
    expect(detectDensity({ w: 8, h: 16 }, tap)).toBe(1);
  });
});

describe("density rules", () => {
  const rules = densityRules(
    Object.values(SCENES),
    TRAVEL_MAP_DATA,
    CHARACTER_SHEET,
  );
  const sizes = new Map<string, Size>();
  const sizeOf = (url: string) => sizes.get(url);
  const zurich = SCENES.zurich;
  const desk = zurich.objects.find((o) => o.id === "desk")?.sprite ?? "";
  const tap = slotSpriteUrl("slot-tap") ?? "";

  test("every scene image has a rule", () => {
    for (const scene of Object.values(SCENES)) {
      expect(rules.get(scene.background)).toEqual({ size: BG });
      for (const o of [...scene.objects, ...scene.exits]) {
        if (o.sprite) expect(rules.has(o.sprite)).toBe(true);
      }
      for (const a of scene.animations ?? []) {
        expect(rules.get(a.strip)).toEqual({ like: scene.background });
      }
    }
    expect(rules.get(CHARACTER_SHEET.image)).toEqual({ density: 2 });
  });

  test("a scene's sprites follow its background", () => {
    expect(desk).not.toBe("");
    expect(rules.get(desk)).toEqual({ like: zurich.background });
    sizes.set(zurich.background, { w: 320, h: 160 });
    expect(resolveDensity(desk, rules, sizeOf)).toBe(1);
    sizes.set(zurich.background, { w: 640, h: 320 });
    expect(resolveDensity(desk, rules, sizeOf)).toBe(2);
  });

  test("scenes switch density one at a time", () => {
    sizes.set(zurich.background, { w: 640, h: 320 });
    sizes.set(SCENES.london.background, { w: 320, h: 160 });
    expect(resolveDensity(zurich.background, rules, sizeOf)).toBe(2);
    expect(resolveDensity(SCENES.london.background, rules, sizeOf)).toBe(1);
  });

  test("shared sprites keep the logical size of their originals", () => {
    expect(rules.get(tap)).toEqual({ size: { w: 7, h: 16 } });
    sizes.set(tap, { w: 7, h: 16 });
    expect(resolveDensity(tap, rules, sizeOf)).toBe(1);
    sizes.set(tap, { w: 14, h: 32 });
    expect(resolveDensity(tap, rules, sizeOf)).toBe(2);
    const plane = TRAVEL_MAP_DATA.plane?.strip ?? "";
    expect(rules.get(plane)).toEqual({ size: { w: 136, h: 17 } });
  });

  test("an image with no rule, or not loaded yet, is density 1", () => {
    const empty = new Map<string, DensityRule>();
    expect(resolveDensity("nope.png", empty, () => BG)).toBe(1);
    expect(resolveDensity(desk, rules, () => undefined)).toBe(1);
  });
});

describe("character sheet density", () => {
  const cell = { x: 0, y: 0, w: 64, h: 128 };
  // The shipped sheet is the 2x remaster (RB7); `single` is the same sheet
  // at density 1, as B7 shipped it.
  const fields = { ...sheetJson, density: undefined };
  const single = {
    ...fields,
    stride: sheetJson.stride / 2,
    origin: { x: 16, y: 61 },
    talkHeadOffset: { x: 8, y: 3 },
    frames: sheetJson.frames.map((f) => ({
      x: f.x / 2,
      y: f.y / 2,
      w: f.w / 2,
      h: f.h / 2,
    })),
  };

  test("the shipped 64x128 sheet is density 2", () => {
    expect(sheetJson.density).toBe(2);
    expect(CHARACTER_SHEET.density).toBe(2);
    expect(sheetJson.frames[0]).toEqual({ x: 0, y: 0, w: 64, h: 128 });
  });

  test("a sheet's density comes from its cells or its field", () => {
    expect(parseSheet(single, "x.png").density).toBe(1);
    expect(parseSheet(fields, "x.png").density).toBe(2);
    expect(parseSheet({ ...fields, density: 2 }, "x.png").density).toBe(2);
    expect(() => parseSheet({ ...fields, density: 3 }, "x.png")).toThrow();
  });

  test("the stride is in sheet pixels, and the same in logical px", () => {
    expect(sheetJson.stride).toBe(52);
    expect(CHARACTER_SHEET.stride).toBe(26);
    expect(parseSheet(single, "x.png").stride).toBe(26);
  });

  test("a density-1 cell lands on whole logical px, as before", () => {
    const sheet = { density: 1 as const, origin: { x: 16, y: 61 } };
    const body = { x: 0, y: 0, w: 32, h: 64 };
    // The pre-remaster sums, in logical px.
    const old = (x: number, y: number, s: number) => ({
      left: Math.round(x - 16 * s),
      top: Math.round(y - 61 * s),
      w: Math.round(32 * s),
      h: Math.round(64 * s),
    });
    for (const [x, y, s] of [
      [100, 120, 1],
      [100.4, 118.7, 0.83],
      [37.5, 109.2, 0.7],
    ]) {
      expect(placeCell(sheet, body, x, y, s)).toEqual(old(x, y, s));
    }
  });

  test("a density-2 cell lands on half logical px", () => {
    const sheet = { density: 2 as const, origin: { x: 32, y: 123 } };
    // Feet at (100, 120) logical: the cell's origin pixel is at (200, 240).
    expect(placeCell(sheet, cell, 100, 120, 1)).toEqual({
      left: 168,
      top: 117,
      w: 64,
      h: 128,
    });
    expect(placeCell(sheet, cell, 100.25, 120, 1).left).toBe(169);
    expect(placeCell(sheet, cell, 100, 120, 0.7)).toEqual({
      left: Math.round(200 - 32 * 0.7),
      top: Math.round(240 - 123 * 0.7),
      w: 45,
      h: 90,
    });
  });
});

describe("coordinate scaling", () => {
  test("positions snap to the image's pixel grid", () => {
    expect(snap(10.4, 1)).toBe(10);
    expect(snap(10.6, 1)).toBe(11);
    expect(snap(10.4, 2)).toBe(10.5);
    expect(snap(10.2, 2)).toBe(10);
  });

  test("bounding boxes turn into logical px, growing to whole px", () => {
    const box = { x: 3, y: 4, w: 10, h: 20 };
    expect(logicalBox(box, 1)).toEqual(box);
    expect(logicalBox({ x: 6, y: 8, w: 20, h: 40 }, 2)).toEqual(box);
    expect(logicalBox({ x: 7, y: 8, w: 19, h: 41 }, 2)).toEqual({
      x: 3,
      y: 4,
      w: 10,
      h: 21,
    });
  });
});
