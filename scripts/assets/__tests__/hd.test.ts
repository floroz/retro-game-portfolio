// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  HD_SCENE_SIZE,
  adjustColour,
  alignSprite,
  fitSize,
  hdContactSheet,
  keyOptions,
  oklabToRgb,
  parseLevels,
  parseScales,
  parseTargetSize,
  prepare,
  register,
  resizeLanczos,
  softKey,
} from "../hd";
import {
  createImage,
  crop,
  fillRect,
  getPixel,
  rgbToOklab,
  setPixel,
  type Image,
  type Rgb,
} from "../lib";

const KEY: Rgb = [250, 3, 250];
const NAVY: Rgb = [33, 40, 90];

/** A seeded, blotchy, non-repeating texture, so every offset looks different. */
function texture(w: number, h: number, seed = 7): Image {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const cell = 6;
  const cw = Math.ceil(w / cell) + 1;
  const ch = Math.ceil(h / cell) + 1;
  const grid = Array.from({ length: cw * ch }, () => [
    rand() * 255,
    rand() * 255,
    rand() * 255,
  ]);
  const img = createImage(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const g = grid[Math.floor(y / cell) * cw + Math.floor(x / cell)];
      setPixel(img, x, y, [
        Math.round(g[0] * 0.8 + rand() * 40),
        Math.round(g[1] * 0.8 + rand() * 40),
        Math.round(g[2] * 0.8 + rand() * 40),
      ]);
    }
  }
  return img;
}

/** A navy block on near-magenta, with a one-pixel 50% blend around it. */
function keyedSheet(): Image {
  const img = createImage(120, 80, KEY);
  const mix: Rgb = [
    Math.round((KEY[0] + NAVY[0]) / 2),
    Math.round((KEY[1] + NAVY[1]) / 2),
    Math.round((KEY[2] + NAVY[2]) / 2),
  ];
  fillRect(img, 39, 19, 42, 42, mix);
  fillRect(img, 40, 20, 40, 40, NAVY);
  return img;
}

const alpha = (img: Image, x: number, y: number) => getPixel(img, x, y)[3];

/** OKLab hue component along the key's a/b direction: > 0.02 looks magenta. */
function magentaCast(rgb: Rgb): number {
  const [, a, b] = rgbToOklab(rgb);
  const [, ka, kb] = rgbToOklab(KEY);
  const len = Math.hypot(ka, kb);
  return (a * ka + b * kb) / len;
}

describe("sizes", () => {
  test("parses target sizes with an optional side", () => {
    expect(parseTargetSize("400x300")).toEqual({ w: 400, h: 300 });
    expect(parseTargetSize("400x")).toEqual({ w: 400 });
    expect(parseTargetSize("x300")).toEqual({ h: 300 });
    expect(() => parseTargetSize("x")).toThrow();
    expect(() => parseTargetSize("0x10")).toThrow();
  });

  test("fits keeping the aspect ratio", () => {
    expect(fitSize({ w: 200, h: 100 }, { w: 100 })).toEqual({ w: 100, h: 50 });
    expect(fitSize({ w: 200, h: 100 }, { h: 25 })).toEqual({ w: 50, h: 25 });
    expect(fitSize({ w: 200, h: 100 }, { w: 80, h: 80 })).toEqual({
      w: 80,
      h: 40,
    });
    expect(fitSize({ w: 200, h: 100 }, {}, 0.5)).toEqual({ w: 100, h: 50 });
  });

  test("resizes with Lanczos to the exact size", async () => {
    const out = await resizeLanczos(texture(90, 60), 45, 30);
    expect([out.width, out.height]).toEqual([45, 30]);
    expect(out.data.length).toBe(45 * 30 * 4);
  });
});

describe("prepare", () => {
  test("turns a Codex composite into a 1280x640 scene, whole frame", async () => {
    const raw = texture(1774, 887);
    const {
      image,
      crop: region,
      warnings,
    } = await prepare(raw, {
      kind: "scene",
    });
    expect([image.width, image.height]).toEqual([
      HD_SCENE_SIZE.w,
      HD_SCENE_SIZE.h,
    ]);
    expect(region).toEqual({ x: 0, y: 0, w: 1774, h: 887 });
    expect(warnings).toEqual([]);
    expect(image.data.every((v, i) => i % 4 !== 3 || v === 255)).toBe(true);
  });

  test("warns when an explicit crop would stretch", async () => {
    const { warnings } = await prepare(texture(400, 300), {
      kind: "scene",
      crop: { x: 0, y: 0, w: 400, h: 300 },
    });
    expect(warnings[0]).toMatch(/stretched/);
  });

  test("keys, crops to the figure, and sizes a sprite", async () => {
    const byWidth = await prepare(keyedSheet(), {
      kind: "sprite",
      key: {},
      size: { w: 88 },
      pad: 2,
    });
    // The figure is 42 px wide with its fringe; +2 pad each side, minus the
    // choked edge, is about 44 px, doubled.
    expect(byWidth.image.width).toBe(88);
    expect(byWidth.image.height).toBe(88);
    expect(byWidth.key?.key).toEqual(KEY);
    expect(alpha(byWidth.image, 0, 0)).toBe(0);
    expect(alpha(byWidth.image, 44, 44)).toBe(255);

    const boxed = await prepare(keyedSheet(), {
      kind: "sprite",
      key: {},
      size: { w: 100, h: 60 },
    });
    expect([boxed.image.width, boxed.image.height]).toEqual([100, 60]);
    // Fitted to 60 high, centred, sitting on the bottom row.
    expect(alpha(boxed.image, 50, 50)).toBe(255);
    expect(alpha(boxed.image, 5, 30)).toBe(0);
  });
});

describe("soft key", () => {
  test("clears the background and unmixes the key from the edge", () => {
    const { image, key, partial } = softKey(keyedSheet(), { choke: 0 });
    expect(key).toEqual(KEY);
    expect(alpha(image, 0, 0)).toBe(0);
    expect(alpha(image, 60, 40)).toBe(255);
    expect(getPixel(image, 60, 40).slice(0, 3)).toEqual([...NAVY]);
    // The blended ring is part-transparent, and navy, not pink.
    const edge = getPixel(image, 39, 40);
    expect(edge[3]).toBeGreaterThan(0);
    expect(edge[3]).toBeLessThan(255);
    expect(partial).toBeGreaterThan(0);
    expect(magentaCast([edge[0], edge[1], edge[2]])).toBeLessThan(0.02);
  });

  test("chokes the edge inwards", () => {
    const soft = softKey(keyedSheet(), { choke: 0 }).image;
    const choked = softKey(keyedSheet(), { choke: 1 }).image;
    expect(alpha(soft, 39, 40)).toBeGreaterThan(0);
    expect(alpha(choked, 39, 40)).toBe(0);
    expect(alpha(choked, 40, 40)).toBeLessThan(255);
    expect(alpha(choked, 41, 40)).toBe(255);
  });

  test("despills a small near-key pocket inside the figure", () => {
    const img = keyedSheet();
    fillRect(img, 58, 38, 3, 3, [230, 40, 220]);
    const { image } = softKey(img, { choke: 0 });
    const p = getPixel(image, 59, 39);
    expect(p[3]).toBe(255);
    expect(magentaCast([p[0], p[1], p[2]])).toBeLessThan(0.02);
  });

  test("uses an existing alpha (transparent_background) as the matte", () => {
    const img = createImage(60, 60);
    fillRect(img, 10, 10, 40, 40, NAVY);
    const auto = softKey(img);
    expect(auto.key).toBeNull();
    expect(alpha(auto.image, 30, 30)).toBe(255);
    expect(alpha(auto.image, 10, 30)).toBe(0); // choked by one px
    expect(alpha(auto.image, 11, 30)).toBe(255);
    expect(() => softKey(texture(20, 20), { key: "alpha" })).toThrow(
      /no transparency/,
    );
  });

  test("parses the CLI flags", () => {
    expect(keyOptions({}, "none")).toBeNull();
    expect(keyOptions({ key: "none" }, "auto")).toBeNull();
    expect(keyOptions({}, "auto")).toMatchObject({ key: "auto" });
    expect(
      keyOptions({ key: "ff00ff", choke: "2", despill: "off" }, "none"),
    ).toMatchObject({ key: [255, 0, 255], choke: 2, despill: false });
    expect(() => keyOptions({ despill: "maybe" }, "auto")).toThrow();
  });
});

describe("colour", () => {
  test("round-trips OKLab", () => {
    for (const rgb of [
      [0, 0, 0],
      [255, 255, 255],
      [33, 40, 90],
      [250, 3, 250],
      [200, 120, 40],
    ] as Rgb[]) {
      expect(oklabToRgb(rgbToOklab(rgb))).toEqual(rgb);
    }
  });

  test("applies levels and saturation", () => {
    const img = createImage(2, 1, [100, 150, 200]);
    setPixel(img, 1, 0, [20, 240, 20], 0);
    const lv = adjustColour(img, { levels: parseLevels("50,250") });
    expect(getPixel(lv, 0, 0).slice(0, 3)).toEqual([64, 128, 191]);
    expect(getPixel(lv, 1, 0)).toEqual([20, 240, 20, 0]); // invisible: untouched
    const grey = getPixel(adjustColour(img, { saturation: 0 }), 0, 0);
    expect(
      Math.max(grey[0], grey[1], grey[2]) - Math.min(grey[0], grey[1], grey[2]),
    ).toBeLessThanOrEqual(2);
    expect(() => parseLevels("200,100")).toThrow();
  });
});

describe("align", () => {
  test("finds a sprite's offset in the composite", () => {
    const comp = texture(320, 160);
    const sprite = crop(comp, { x: 123, y: 57, w: 40, h: 30 });
    expect(register(sprite, comp)).toMatchObject({ x: 123, y: 57 });
  });

  test("tolerates a sprite painted lighter, and a transparent margin", () => {
    const comp = texture(320, 160, 11);
    const sprite = crop(comp, { x: 201, y: 33, w: 70, h: 90 });
    for (let i = 0; i < sprite.data.length; i += 4) {
      for (let ch = 0; ch < 3; ch++)
        sprite.data[i + ch] = Math.min(255, sprite.data[i + ch] + 25);
    }
    fillRect(sprite, 0, 0, 70, 10, [0, 0, 0]);
    for (let x = 0; x < 70; x++)
      for (let y = 0; y < 10; y++) setPixel(sprite, x, y, [255, 0, 0], 0);
    expect(register(sprite, comp)).toMatchObject({ x: 201, y: 33 });
  });

  test("lets a sprite hang off the edge, and honours --near", () => {
    const comp = texture(320, 160, 3);
    const sprite = crop(comp, { x: 280, y: 20, w: 40, h: 30 });
    const cut = crop(comp, { x: 0, y: 0, w: 300, h: 160 });
    expect(register(sprite, cut, { minInside: 0.4 })).toMatchObject({
      x: 280,
      y: 20,
    });
    const near = register(sprite, comp, {
      near: { x: 20, y: 100 },
      radius: 10,
    });
    expect(Math.abs(near.x - 20)).toBeLessThanOrEqual(12);
    expect(Math.abs(near.y - 100)).toBeLessThanOrEqual(12);
  });

  test("picks the scale the object was painted at", async () => {
    const comp = texture(320, 160, 5);
    const object = texture(48, 40, 99);
    const big = await resizeLanczos(object, 60, 50);
    for (let y = 0; y < big.height; y++)
      for (let x = 0; x < big.width; x++) {
        const [r, g, b] = getPixel(big, x, y);
        setPixel(comp, 100 + x, 40 + y, [r, g, b]);
      }
    const best = await alignSprite(object, comp, {
      scales: parseScales("1:1.5:0.25"),
    });
    expect(best.scale).toBe(1.25);
    expect([best.sprite.width, best.sprite.height]).toEqual([60, 50]);
    expect(Math.abs(best.x - 100)).toBeLessThanOrEqual(1);
    expect(Math.abs(best.y - 40)).toBeLessThanOrEqual(1);
  });

  test("parses scale lists and ranges", () => {
    expect(parseScales("0.9,1,1.1")).toEqual([0.9, 1, 1.1]);
    expect(parseScales("0.9:1.1:0.1")).toEqual([0.9, 1, 1.1]);
    expect(() => parseScales("1:0.5:0.1")).toThrow();
  });
});

describe("HD review sheet", () => {
  test("tiles candidates, with a reference tile first", async () => {
    const candidates = [
      texture(128, 64),
      texture(128, 64, 2),
      texture(128, 64, 3),
    ];
    const plain = await hdContactSheet(candidates, { tileWidth: 64 });
    expect(plain.width).toBe(2 * 64 + 3 * 16);
    const withRef = await hdContactSheet(candidates, {
      tileWidth: 64,
      overlay: texture(128, 64, 4),
      reference: texture(128, 64, 4),
    });
    expect(withRef.width).toBe(plain.width);
    expect(withRef.height).toBe(plain.height); // 4 tiles still fit 2 rows
    expect(
      await hdContactSheet(candidates, { tileWidth: 64, cols: 3 }),
    ).toMatchObject({
      width: 3 * 64 + 4 * 16,
    });
  });
});
