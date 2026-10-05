// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  MAX_PAINTED_COLOURS,
  PAINTED_SCENE_SIZE,
  buildPalette,
  countPartialAlpha,
  finishPainted,
  fixedColoursFrom,
  hardAlpha,
  padToEven,
  paintedContactSheet,
  preparePainted,
  quantizeJointly,
  remapToPalette,
  visibleColours,
} from "../painted";
import {
  createImage,
  fillRect,
  getPixel,
  oklabDistance,
  rgbToOklab,
  setPixel,
  type Image,
  type Rgb,
} from "../lib";

const KEY: Rgb = [255, 0, 255];

/** A smooth 2D gradient with thousands of distinct colours, like painted light. */
function gradient(w: number, h: number): Image {
  const img = createImage(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      setPixel(img, x, y, [
        Math.round((x / (w - 1)) * 255),
        Math.round((y / (h - 1)) * 200),
        Math.round(128 + 100 * Math.sin((x + y) / 40)),
      ]);
    }
  }
  return img;
}

/** A horizontal ramp: every column one colour, getting lighter to the right. */
function ramp(w: number, h: number): Image {
  const img = createImage(w, h);
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1);
    const c: Rgb = [
      Math.round(20 + 220 * t),
      Math.round(30 + 160 * t),
      Math.round(60 + 90 * t),
    ];
    for (let y = 0; y < h; y++) setPixel(img, x, y, c);
  }
  return img;
}

const px = (img: Image, x: number, y: number) =>
  getPixel(img, x, y).slice(0, 3).join(",");

describe("hard alpha", () => {
  test("makes every pixel fully opaque or fully transparent, and zeroes the clear ones", () => {
    const img = createImage(8, 8);
    fillRect(img, 2, 2, 4, 4, [200, 100, 50]);
    setPixel(img, 1, 3, [90, 90, 90], 200); // soft edge, kept
    setPixel(img, 6, 3, [90, 90, 90], 60); // soft edge, cleared
    const { image, partial } = hardAlpha(img);
    expect(partial).toBe(2);
    expect(countPartialAlpha(image)).toBe(0);
    expect(getPixel(image, 1, 3)).toEqual([90, 90, 90, 255]);
    expect(getPixel(image, 6, 3)).toEqual([0, 0, 0, 0]);
  });

  test("clears isolated specks and honours the threshold", () => {
    const img = createImage(8, 8);
    fillRect(img, 0, 0, 3, 3, [10, 20, 30]);
    setPixel(img, 6, 6, [10, 20, 30]);
    const { image, specks } = hardAlpha(img);
    expect(specks).toBe(1);
    expect(getPixel(image, 6, 6)[3]).toBe(0);
    expect(
      hardAlpha(img, { minNeighbours: 0 }).image.data[(6 * 8 + 6) * 4 + 3],
    ).toBe(255);

    const soft = createImage(1, 1);
    setPixel(soft, 0, 0, [1, 2, 3], 100);
    const opts = { minNeighbours: 0 };
    expect(hardAlpha(soft, opts).image.data[3]).toBe(0);
    expect(hardAlpha(soft, { ...opts, threshold: 90 }).image.data[3]).toBe(255);
  });

  test("pads sprites to even sides without moving their top-left", () => {
    const img = createImage(5, 7, [9, 9, 9]);
    const even = padToEven(img);
    expect([even.width, even.height]).toEqual([6, 8]);
    expect(getPixel(even, 0, 0)).toEqual([9, 9, 9, 255]);
    expect(getPixel(even, 5, 0)[3]).toBe(0);
    expect(getPixel(even, 0, 7)[3]).toBe(0);
    expect(padToEven(createImage(4, 6))).toHaveProperty("width", 4);
  });
});

describe("quantization", () => {
  test("keeps an image that already fits the budget exactly as it is", () => {
    const img = createImage(4, 1);
    const colours: Rgb[] = [
      [1, 2, 3],
      [200, 10, 10],
      [10, 200, 10],
      [10, 10, 200],
    ];
    colours.forEach((c, x) => setPixel(img, x, 0, c));
    const palette = buildPalette([img]);
    expect(palette).toHaveLength(4);
    expect(remapToPalette(img, palette).data).toEqual(img.data);
  });

  test("brings a full-colour painting to at most 256 colours, close to the original", () => {
    const img = gradient(320, 160);
    expect(visibleColours([img]).size).toBeGreaterThan(10_000);
    const { image, palette } = finishPainted(img);
    expect(palette?.length).toBeLessThanOrEqual(MAX_PAINTED_COLOURS);
    expect(visibleColours([image]).size).toBeLessThanOrEqual(256);
    let worst = 0;
    for (let i = 0; i < img.data.length; i += 4 * 37) {
      const a = rgbToOklab([img.data[i], img.data[i + 1], img.data[i + 2]]);
      const b = rgbToOklab([
        image.data[i],
        image.data[i + 1],
        image.data[i + 2],
      ]);
      worst = Math.max(worst, oklabDistance(a, b));
    }
    expect(worst).toBeLessThan(0.05);
  });

  test("respects a smaller budget", () => {
    const { image } = finishPainted(gradient(200, 100), { colours: 16 });
    expect(visibleColours([image]).size).toBeLessThanOrEqual(16);
    expect(() => buildPalette([gradient(8, 8)], { colours: 257 })).toThrow(
      /1 to 256/,
    );
  });

  test("never dithers: a smooth ramp becomes solid, ordered bands", () => {
    const src = ramp(1024, 6);
    const out = remapToPalette(src, buildPalette([src], { colours: 24 }));
    // Every column stays one colour: no pattern across rows.
    for (let x = 0; x < out.width; x++)
      for (let y = 1; y < out.height; y++)
        expect(px(out, x, y)).toBe(px(out, x, 0));
    // Along the ramp, each colour is one contiguous band and lightness only rises.
    const runs: string[] = [];
    let lastL = -1;
    for (let x = 0; x < out.width; x++) {
      const c = px(out, x, 0);
      if (runs[runs.length - 1] !== c) runs.push(c);
      const [r, g, b] = getPixel(out, x, 0);
      const L = rgbToOklab([r, g, b])[0];
      expect(L).toBeGreaterThanOrEqual(lastL);
      lastL = L;
    }
    expect(new Set(runs).size).toBe(runs.length);
    expect(runs.length).toBeGreaterThan(12);
    expect(runs.length).toBeLessThanOrEqual(24);
  });

  test("builds one palette for a scene's layers together", () => {
    const bg = gradient(160, 80);
    const obj = createImage(40, 40);
    for (let y = 0; y < 40; y++)
      for (let x = 0; x < 40; x++)
        setPixel(obj, x, y, [20 + x * 5, 180, 40 + y * 4]);
    const { images, palette } = quantizeJointly([bg, obj], { colours: 64 });
    expect(palette.length).toBeLessThanOrEqual(64);
    const union = visibleColours(images);
    expect(union.size).toBeLessThanOrEqual(64);
    // The object's greens are in the shared palette, not lost to the bg's colours.
    const g = getPixel(images[1], 20, 20);
    expect(
      oklabDistance(
        rgbToOklab([g[0], g[1], g[2]]),
        rgbToOklab([120, 180, 120]),
      ),
    ).toBeLessThan(0.06);
  });

  test("keeps fixed colours (--palette-from) and adds new ones only up to the budget", () => {
    const bg = finishPainted(gradient(160, 80), { colours: 200 }).image;
    const fixed = fixedColoursFrom([bg]);
    expect(fixed.length).toBeLessThanOrEqual(200);
    const obj = createImage(30, 30);
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 30; x++)
        setPixel(obj, x, y, [250, 240 - x * 3, 10 + y]);
    const done = finishPainted(obj, { fixed, colours: 256 });
    const bgColours = visibleColours([bg]);
    const union = visibleColours([bg, done.image]);
    expect(union.size).toBeLessThanOrEqual(256);
    expect(union.size).toBeGreaterThan(bgColours.size);
    // With the budget spent on the bg, the object uses only the bg's colours.
    const locked = finishPainted(obj, { fixed, colours: fixed.length }).image;
    for (const c of visibleColours([locked]))
      expect(bgColours.has(c)).toBe(true);
    expect(() => fixedColoursFrom([gradient(100, 100)])).toThrow(
      /quantize them first/,
    );
  });
});

describe("painted prepare", () => {
  // Full-size resizing and quantization compete for CPU on shared CI runners.
  test("takes a raw composite to 640x320, opaque, at most 256 colours", async () => {
    const raw = gradient(1774, 887);
    const { image, painted } = await preparePainted(raw, { kind: "scene" });
    expect([image.width, image.height]).toEqual([
      PAINTED_SCENE_SIZE.w,
      PAINTED_SCENE_SIZE.h,
    ]);
    expect(painted.colours).toBeLessThanOrEqual(256);
    // Scan every pixel without constructing 204,800 separate assertions.
    const nonOpaqueAlphaIndex = image.data.findIndex(
      (value, index) => index % 4 === 3 && value !== 255,
    );
    expect(nonOpaqueAlphaIndex).toBe(-1);
  }, 15000);

  test("keys a magenta sprite to hard alpha with no fringe", async () => {
    const raw = createImage(400, 600, KEY);
    // A navy figure with an ink outline and an anti-aliased (key-blended) edge.
    fillRect(raw, 100, 100, 200, 400, [20, 20, 30]);
    fillRect(raw, 106, 106, 188, 388, [40, 50, 110]);
    for (let y = 100; y < 500; y++) setPixel(raw, 99, y, [140, 10, 145]);
    const { image, painted } = await preparePainted(raw, {
      kind: "sprite",
      size: { h: 144 },
      key: { key: "auto" },
    });
    expect(image.height).toBe(144);
    expect(countPartialAlpha(image)).toBe(0);
    expect(painted.colours).toBeLessThanOrEqual(256);
    const keyLab = rgbToOklab(KEY);
    for (let i = 0; i < image.data.length; i += 4) {
      if (image.data[i + 3] === 0) continue;
      const lab = rgbToOklab([
        image.data[i],
        image.data[i + 1],
        image.data[i + 2],
      ]);
      expect(oklabDistance(lab, keyLab)).toBeGreaterThan(0.25);
    }
  });
});

describe("painted review sheet", () => {
  test("shows native tiles at 2x nearest-neighbour", async () => {
    const a = finishPainted(gradient(64, 32), { colours: 8 }).image;
    const b = createImage(64, 32, [200, 0, 0]);
    const sheet = await paintedContactSheet([a, b]);
    expect(sheet.width).toBe((2 * 64 + 3 * 8) * 2);
    // Every art pixel is a 2x2 block.
    for (let y = 0; y < sheet.height; y += 2)
      for (let x = 0; x < sheet.width; x += 2) {
        const c = px(sheet, x, y);
        expect(px(sheet, x + 1, y + 1)).toBe(c);
      }
    // The first tile is the candidate itself, unresampled.
    expect(px(sheet, 16, 16)).toBe(px(a, 0, 0));
  });
});
