// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  CODEX_COMPOSITE_SIZE,
  CODEX_SHEET_SIZE,
  aspectWarning,
  codexSizeWarning,
} from "../codex";
import { floodKey, parseKeyArg, sampleBorderKey } from "../key";
import {
  createImage,
  fillRect,
  findFigures,
  getPixel,
  setPixel,
  type Image,
  type Rgb,
} from "../lib";

const NAVY: Rgb = [33, 40, 60];
const SKIN: Rgb = [231, 189, 152];

/**
 * A near-magenta background like the G1 probe's: mostly #FA03FA, with a
 * drifting ramp towards #EB23ED and scattered off-by-a-few pixels, and never
 * one exact #FF00FF pixel.
 */
function probeBackground(w: number, h: number): Image {
  const img = createImage(w, h, [250, 3, 250]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = (x + y) / (w + h);
      if ((x * 7 + y * 13) % 5 === 0) {
        setPixel(img, x, y, [
          Math.round(250 - 15 * t),
          Math.round(3 + 32 * t),
          Math.round(250 - 13 * t),
        ]);
      } else if ((x + y) % 3 === 0) {
        setPixel(img, x, y, [249, 2, 251]);
      }
    }
  }
  return img;
}

function alphaAt(img: Image, x: number, y: number): number {
  return getPixel(img, x, y)[3];
}

describe("flood-fill chroma key", () => {
  test("removes a near-magenta background that is never exact #FF00FF", () => {
    const img = probeBackground(40, 30);
    fillRect(img, 10, 5, 12, 20, NAVY);
    const { image, flooded } = floodKey(img);
    expect(alphaAt(image, 0, 0)).toBe(0);
    expect(alphaAt(image, 39, 29)).toBe(0);
    expect(alphaAt(image, 30, 15)).toBe(0);
    expect(alphaAt(image, 15, 15)).toBe(255);
    expect(getPixel(image, 15, 15).slice(0, 3)).toEqual([...NAVY]);
    expect(flooded).toBe(40 * 30 - 12 * 20);
  });

  test("an RGB-exact key would remove none of that background", () => {
    const img = probeBackground(20, 20);
    let exact = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      if (
        img.data[i] === 255 &&
        img.data[i + 1] === 0 &&
        img.data[i + 2] === 255
      )
        exact++;
    }
    expect(exact).toBe(0);
    const { image } = floodKey(img);
    for (let i = 3; i < image.data.length; i += 4)
      expect(image.data[i]).toBe(0);
  });

  test("keeps key-coloured pixels inside a figure that don't reach the edge", () => {
    const img = probeBackground(30, 30);
    fillRect(img, 5, 5, 20, 20, NAVY);
    // A small magenta highlight, well inside the figure.
    fillRect(img, 14, 14, 2, 2, [250, 3, 250]);
    const { image, holes } = floodKey(img);
    expect(alphaAt(image, 14, 14)).toBe(255);
    expect(holes).toBe(0);
  });

  test("keys an enclosed background pocket at least minHole pixels big", () => {
    const img = probeBackground(30, 30);
    fillRect(img, 5, 5, 20, 20, NAVY);
    fillRect(img, 10, 10, 8, 8, [250, 3, 250]); // 64 px: the gap between arm and body
    fillRect(img, 21, 21, 2, 2, [250, 3, 250]); // 4 px: too small, kept
    const { image, holes } = floodKey(img, { minHole: 64 });
    expect(holes).toBe(64);
    expect(alphaAt(image, 13, 13)).toBe(0);
    expect(alphaAt(image, 21, 21)).toBe(255);
    expect(alphaAt(image, 7, 7)).toBe(255);

    const off = floodKey(img, { minHole: Infinity });
    expect(off.holes).toBe(0);
    expect(alphaAt(off.image, 13, 13)).toBe(255);
  });

  test("erodes a blended fringe but stops at real figure colours", () => {
    const img = probeBackground(30, 10);
    fillRect(img, 10, 0, 10, 10, SKIN);
    // A two-pixel fringe on the left edge of the figure: magenta blended into skin.
    fillRect(img, 10, 0, 1, 10, [240, 90, 215]);
    fillRect(img, 11, 0, 1, 10, [235, 140, 185]);
    const { image, fringe } = floodKey(img);
    expect(alphaAt(image, 10, 5)).toBe(0);
    expect(alphaAt(image, 11, 5)).toBe(0);
    expect(alphaAt(image, 12, 5)).toBe(255);
    expect(fringe).toBe(20);

    const shallow = floodKey(img, { fringePasses: 1 });
    expect(alphaAt(shallow.image, 10, 5)).toBe(0);
    expect(alphaAt(shallow.image, 11, 5)).toBe(255);

    const none = floodKey(img, { fringeTolerance: 0 });
    expect(none.fringe).toBe(0);
    expect(alphaAt(none.image, 10, 5)).toBe(255);
  });

  test("never removes dark outlines or navy next to the background", () => {
    const img = probeBackground(20, 20);
    fillRect(img, 5, 5, 10, 10, [15, 13, 18]);
    fillRect(img, 6, 6, 8, 8, NAVY);
    const { image, fringe } = floodKey(img);
    expect(fringe).toBe(0);
    expect(alphaAt(image, 5, 5)).toBe(255);
  });

  test("samples the key from the border, and uses it with key: auto", () => {
    const img = createImage(10, 10, [10, 200, 10]);
    setPixel(img, 0, 0, [0, 0, 0]);
    fillRect(img, 3, 3, 4, 4, NAVY);
    expect(sampleBorderKey(img)).toEqual([10, 200, 10]);
    const { image, key } = floodKey(img, { key: "auto" });
    expect(key).toEqual([10, 200, 10]);
    expect(alphaAt(image, 5, 0)).toBe(0);
    expect(alphaAt(image, 4, 4)).toBe(255);
  });

  test("the keyed sheet slices into its figures", () => {
    const img = probeBackground(90, 40);
    fillRect(img, 5, 5, 10, 30, NAVY);
    fillRect(img, 40, 6, 8, 29, NAVY);
    fillRect(img, 70, 5, 12, 30, NAVY);
    const figures = findFigures(floodKey(img).image, { minGap: 2 });
    expect(figures).toEqual([
      { x: 5, y: 5, w: 10, h: 30 },
      { x: 40, y: 6, w: 8, h: 29 },
      { x: 70, y: 5, w: 12, h: 30 },
    ]);
  });

  test("parses the --key argument", () => {
    expect(parseKeyArg(undefined)).toBeUndefined();
    expect(parseKeyArg("auto")).toBe("auto");
    expect(parseKeyArg("ff00ff")).toEqual([255, 0, 255]);
    expect(() => parseKeyArg("magenta")).toThrow();
  });
});

describe("Codex output sizes", () => {
  test("accepts the sizes the G1 probe measured", () => {
    expect(
      codexSizeWarning(
        "composite",
        CODEX_COMPOSITE_SIZE.w,
        CODEX_COMPOSITE_SIZE.h,
      ),
    ).toBeNull();
    expect(
      codexSizeWarning("sheet", CODEX_SHEET_SIZE.w, CODEX_SHEET_SIZE.h),
    ).toBeNull();
    expect(codexSizeWarning("composite", 1536, 1024)).toMatch(/1774x887/);
  });

  test("composites are 2:1, so the whole frame maps to 320x160 unstretched", () => {
    const whole = {
      x: 0,
      y: 0,
      w: CODEX_COMPOSITE_SIZE.w,
      h: CODEX_COMPOSITE_SIZE.h,
    };
    expect(aspectWarning(whole, 320, 160)).toBeNull();
    expect(aspectWarning({ x: 0, y: 0, w: 1536, h: 1024 }, 320, 160)).toMatch(
      /stretched/,
    );
  });
});
