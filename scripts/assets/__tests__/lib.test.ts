// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import {
  CHARACTER_TAGS,
  PALETTE_GROUPS,
  PALETTE_PATH,
  SCENE_IDS,
  alphaBounds,
  allowedColours,
  areaDownscale,
  centredAspectCrop,
  chromaKey,
  createImage,
  cutPolygon,
  figuresToCells,
  fillRect,
  findFigures,
  getPixel,
  gridToImage,
  imageToGrid,
  loadPalette,
  nearestColour,
  oklabDistance,
  packCharacter,
  parseGrid,
  parsePalette,
  patchRegion,
  pixelize,
  readImage,
  remapToPalette,
  rgbToOklab,
  sceneForAssetId,
  setPixel,
  splitStrip,
  thresholdAlpha,
  toGpl,
  upscale,
  writePng,
  writeWebp,
  type Image,
} from "../lib";

/** Palette v1 as frozen at G1, in index order: v2 must never change these. */
const V1_HEX = [
  "#0f0d12 #2a2328 #4a4046 #7a6e6c #b0a49a #e8dcc8",
  "#3a2220 #49322d #6d3f31 #90583d #a1603f",
  "#5c3b33 #9a7860 #bf987d #e7bd98",
  "#161c2f #21283c #2f3f66 #466394",
  "#8a6420 #e0b040 #5a1e1e #9b3d34 #c8483a #4f7a3a #7fae52",
  "#5a5c66 #9ea2aa #b4a47c #d6caa0 #1f5458 #3a8a86 #6a3a62 #74acd8 #c6e4f0",
  "#2a3a4a #3c4c5e #62788c #a2b6c4 #c41e24 #23402e #a8641a #eea03a #ffdc8e",
  "#2c1a3c #3a2c48 #5c4670 #0c1230 #1c2c62 #5876b0 #b8c8e8 #f2f4ff #f8d880",
  "#7c3220 #c45e36 #eea46c #f2c828 #fff1a0 #1c3a8c #2c7cc4 #7ccaea #f06a52",
].join(" ");

const PALETTE = parsePalette(`
# palette: v9
0 #000000 core
1 #ffffff core
2 #ff0000 core
Q #00ff00 hall
Z #0000ff london
i #808080 zurich
`);

function solid(
  w: number,
  h: number,
  rgb: [number, number, number],
  a = 255,
): Image {
  const img = createImage(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) setPixel(img, x, y, rgb, a);
  return img;
}

describe("palette", () => {
  test("parses indices, groups, and the version", () => {
    expect(PALETTE.version).toBe("v9");
    expect(PALETTE.colours.map((c) => c.index).join("")).toBe("012QZi");
    expect(PALETTE.byIndex.get("Q")?.group).toBe("hall");
  });

  test("rejects the chroma key, duplicates, reserved and unknown values", () => {
    expect(() => parsePalette("0 #ff00ff core")).toThrow(/chroma key/);
    expect(() => parsePalette("0 #000000 core\n0 #111111 core")).toThrow(
      /duplicate index/,
    );
    expect(() => parsePalette("0 #000000 core\n1 #000000 core")).toThrow(
      /duplicates index/,
    );
    expect(() => parsePalette(". #000000 core")).toThrow(/other than/);
    expect(() => parsePalette("0 #000000 moon")).toThrow(/unknown group/);
    expect(() => parsePalette("0 #0000 core")).toThrow(/rrggbb/);
  });

  test("restricts each scene to the core plus its own ramp", () => {
    const idx = (scene: Parameters<typeof allowedColours>[1]) =>
      allowedColours(PALETTE, scene)
        .map((c) => c.index)
        .join("");
    expect(idx(null)).toBe("012");
    expect(idx("hall")).toBe("012Q");
    expect(idx("london")).toBe("012Z");
    expect(idx("zurich")).toBe("012i");
    expect(idx("travel-map")).toBe("012");
  });

  test("maps asset ids to scenes", () => {
    expect(sceneForAssetId("travel-map-bg")).toBe("travel-map");
    expect(sceneForAssetId("zurich-obj-door@open")).toBe("zurich");
    expect(sceneForAssetId("char-walk-e")).toBeNull();
    expect(sceneForAssetId("slot-tap")).toBeNull();
  });

  test("rejects indices the grid format can't hold", () => {
    expect(() => parsePalette("\u00e9 #000000 core")).toThrow(
      /printable ASCII/,
    );
    expect(() => parsePalette("ab #000000 core")).toThrow(/one printable/);
  });

  test("the committed master palette is v2: v1 unchanged, plus 24 appended colours", () => {
    const master = loadPalette(PALETTE_PATH);
    expect(master.version).toBe("v2");
    // Append-only: v1's 62 indices keep their colours and groups.
    const v1 = master.colours.slice(0, 62);
    expect(v1.map((c) => c.index).join("")).toBe(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    );
    expect(v1.map((c) => c.hex).join(" ")).toBe(V1_HEX);
    const groups = (cs: typeof master.colours) =>
      Object.fromEntries(
        PALETTE_GROUPS.map((g) => [g, cs.filter((c) => c.group === g).length]),
      );
    expect(groups(v1)).toEqual({
      core: 26,
      hall: 9,
      london: 9,
      zurich: 9,
      sorrento: 9,
    });
    // v2 appends 24 grid-safe punctuation indices.
    const v2 = master.colours.slice(62);
    expect(v2).toHaveLength(24);
    expect(groups(v2)).toEqual({
      core: 9,
      hall: 4,
      london: 3,
      zurich: 4,
      sorrento: 4,
    });
    for (const c of v2) {
      expect(c.index).toMatch(/^[!-~]$/);
      expect(c.index).not.toMatch(/[0-9A-Za-z.#"'`\\|$]/);
    }
    expect(toGpl(master).split("\n")[0]).toBe("GIMP Palette");
  });

  test("the Hall carpet teal sits well above the character's navy in value", () => {
    const master = loadPalette(PALETTE_PATH);
    const L = (i: string) => master.byIndex.get(i)?.lab[0] ?? NaN;
    const character = Math.max(L("F"), L("G"), L("H"), L("I"), L("*"), L("+"));
    // The carpet base and highlight, at least 0.15 OKLab L above the jeans.
    expect(master.byIndex.get("/")?.group).toBe("hall");
    expect(L("/") - character).toBeGreaterThanOrEqual(0.15);
    expect(L(":") - L("/")).toBeGreaterThan(0.05);
  });

  test("every appended colour is distinct from what its scenes can already use", () => {
    const master = loadPalette(PALETTE_PATH);
    for (const scene of SCENE_IDS) {
      const allowed = allowedColours(master, scene);
      for (const c of allowed.filter((a) => master.colours.indexOf(a) >= 62)) {
        for (const o of allowed) {
          if (o === c) continue;
          expect(
            oklabDistance(c.lab, o.lab),
            `${c.index} vs ${o.index} in ${scene}`,
          ).toBeGreaterThan(0.034);
        }
      }
    }
  });
});

describe("OKLab remap", () => {
  test("converts white and black to the ends of the lightness axis", () => {
    const [lw, aw, bw] = rgbToOklab([255, 255, 255]);
    expect(lw).toBeCloseTo(1, 3);
    expect(aw).toBeCloseTo(0, 3);
    expect(bw).toBeCloseTo(0, 3);
    expect(rgbToOklab([0, 0, 0])[0]).toBeCloseTo(0, 5);
  });

  test("picks the perceptually nearest colour", () => {
    const core = allowedColours(PALETTE, null);
    expect(nearestColour([250, 20, 10], core).index).toBe("2");
    expect(nearestColour([30, 30, 30], core).index).toBe("0");
    expect(nearestColour([220, 220, 220], core).index).toBe("1");
  });

  test("never uses another scene's ramp", () => {
    const img = solid(2, 1, [0, 250, 0]);
    setPixel(img, 1, 0, [0, 0, 250]);
    const hall = remapToPalette(img, allowedColours(PALETTE, "hall"));
    expect(getPixel(hall, 0, 0)).toEqual([0, 255, 0, 255]);
    // Blue isn't allowed in the hall: it falls back to a core colour.
    expect(["#000000", "#ffffff", "#ff0000"]).toContain(
      `#${getPixel(hall, 1, 0)
        .slice(0, 3)
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("")}`,
    );
    const london = remapToPalette(img, allowedColours(PALETTE, "london"));
    expect(getPixel(london, 1, 0)).toEqual([0, 0, 255, 255]);
  });
});

describe("area-average downscale", () => {
  test("averages whole blocks for integer ratios", () => {
    const img = createImage(4, 2);
    fillRect(img, 0, 0, 2, 2, [0, 0, 0]);
    fillRect(img, 2, 0, 2, 2, [200, 100, 50]);
    setPixel(img, 0, 0, [100, 100, 100]);
    const out = areaDownscale(img, 2, 1);
    expect(getPixel(out, 0, 0)).toEqual([25, 25, 25, 255]);
    expect(getPixel(out, 1, 0)).toEqual([200, 100, 50, 255]);
  });

  test("weights fractional coverage for non-integer ratios", () => {
    // 3 px -> 2 px: each output covers 1.5 source px.
    const img = createImage(3, 1);
    setPixel(img, 0, 0, [0, 0, 0]);
    setPixel(img, 1, 0, [90, 90, 90]);
    setPixel(img, 2, 0, [180, 180, 180]);
    const out = areaDownscale(img, 2, 1);
    expect(getPixel(out, 0, 0)).toEqual([30, 30, 30, 255]); // (0*1 + 90*0.5) / 1.5
    expect(getPixel(out, 1, 0)).toEqual([150, 150, 150, 255]); // (90*0.5 + 180*1) / 1.5
  });

  test("keeps transparent pixels from bleeding colour", () => {
    const img = createImage(2, 1);
    setPixel(img, 0, 0, [200, 0, 0]);
    setPixel(img, 1, 0, [0, 0, 255], 0);
    const out = areaDownscale(img, 1, 1);
    expect(getPixel(out, 0, 0)).toEqual([200, 0, 0, 128]);
  });

  test("only shrinks", () => {
    expect(() => areaDownscale(createImage(2, 2), 3, 3)).toThrow(
      /only shrinks/,
    );
  });

  test("upscales by nearest neighbour", () => {
    const img = createImage(2, 1);
    setPixel(img, 1, 0, [1, 2, 3]);
    const big = upscale(img, 3);
    expect(big.width).toBe(6);
    expect(getPixel(big, 5, 2)).toEqual([1, 2, 3, 255]);
    expect(getPixel(big, 2, 2)[3]).toBe(0);
  });
});

describe("chroma key and alpha threshold", () => {
  test("keys out magenta within the tolerance and keeps everything else", () => {
    const img = createImage(3, 1);
    setPixel(img, 0, 0, [255, 0, 255]);
    setPixel(img, 1, 0, [240, 20, 235]); // compression noise near the key
    setPixel(img, 2, 0, [200, 60, 60]);
    const out = chromaKey(img);
    expect(getPixel(out, 0, 0)[3]).toBe(0);
    expect(getPixel(out, 1, 0)[3]).toBe(0);
    expect(getPixel(out, 2, 0)).toEqual([200, 60, 60, 255]);
    expect(getPixel(chromaKey(img, [255, 0, 255], 5), 1, 0)[3]).toBe(255);
  });

  test("snaps alpha to 0 or 255", () => {
    const img = createImage(3, 1);
    setPixel(img, 0, 0, [9, 9, 9], 127);
    setPixel(img, 1, 0, [9, 9, 9], 128);
    setPixel(img, 2, 0, [9, 9, 9], 255);
    const out = thresholdAlpha(img);
    expect([0, 1, 2].map((x) => getPixel(out, x, 0)[3])).toEqual([0, 255, 255]);
    expect(getPixel(out, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(getPixel(thresholdAlpha(img, 200), 1, 0)[3]).toBe(0);
  });

  test("pixelize keys, crops, downscales, and remaps in one pass", () => {
    const raw = solid(40, 20, [255, 0, 255]);
    fillRect(raw, 10, 5, 20, 10, [250, 10, 10]);
    const out = pixelize(raw, {
      width: 4,
      height: 2,
      colours: allowedColours(PALETTE, null),
      crop: "auto",
      key: [255, 0, 255],
    });
    expect(out.width).toBe(4);
    for (let x = 0; x < 4; x++)
      expect(getPixel(out, x, 1)).toEqual([255, 0, 0, 255]);
  });

  test("auto crop takes the centred 2:1 band of an opaque image", () => {
    expect(centredAspectCrop(1536, 1024, 320, 160)).toEqual({
      x: 0,
      y: 128,
      w: 1536,
      h: 768,
    });
    expect(centredAspectCrop(1000, 200, 2, 1)).toEqual({
      x: 300,
      y: 0,
      w: 400,
      h: 200,
    });
  });
});

describe("sprite slicing", () => {
  // Three figures on magenta, 2 rows: a sheet like the Codex walk sheets.
  const sheet = solid(300, 260, [255, 0, 255]);
  fillRect(sheet, 20, 10, 40, 114, [40, 60, 150]); // tallest: 114 px
  fillRect(sheet, 120, 20, 30, 100, [40, 60, 150]);
  fillRect(sheet, 60, 140, 50, 110, [200, 150, 120]);
  // A figure with a gap inside (a shoe apart from the leg) stays one figure.
  fillRect(sheet, 200, 20, 20, 90, [40, 60, 150]);
  fillRect(sheet, 221, 100, 10, 10, [40, 60, 150]);
  // A speck well above the figures is noise, not a figure.
  fillRect(sheet, 280, 2, 2, 2, [40, 60, 150]);
  const keyed = chromaKey(sheet);

  test("finds figures left to right, top to bottom", () => {
    const figures = findFigures(keyed, { minGap: 4 });
    expect(figures).toEqual([
      { x: 20, y: 10, w: 40, h: 114 },
      { x: 120, y: 20, w: 30, h: 100 },
      { x: 200, y: 20, w: 31, h: 90 },
      { x: 60, y: 140, w: 50, h: 110 },
    ]);
  });

  test("scales every figure by one factor and puts the feet on row 61", () => {
    const figures = findFigures(keyed, { minGap: 4 });
    const strip = figuresToCells(keyed, figures, {
      cellW: 32,
      cellH: 64,
      feetRow: 61,
      figureHeight: 57,
      colours: allowedColours(PALETTE, null),
    });
    expect(strip.width).toBe(32 * 4);
    expect(strip.height).toBe(64);
    const frames = splitStrip(strip, 32, 64);
    const bounds = frames.map((f) => alphaBounds(f));
    for (const b of bounds) expect(b && b.y + b.h - 1).toBe(61);
    expect(bounds[0]?.h).toBe(57); // the tallest figure sets the scale
    expect(bounds[1]?.h).toBe(50); // 100 * 57/114
    expect(bounds[0]?.x).toBe(6); // 20 px wide, centred in 32
  });

  test("refuses figures that don't fit the cell", () => {
    const wide = solid(200, 60, [0, 0, 0]);
    expect(() =>
      figuresToCells(wide, [{ x: 0, y: 0, w: 200, h: 60 }], {
        cellW: 32,
        cellH: 64,
        feetRow: 61,
        figureHeight: 57,
        colours: allowedColours(PALETTE, null),
      }),
    ).toThrow(/doesn't fit/);
  });
});

describe("palette-index grid", () => {
  const img = createImage(4, 3);
  fillRect(img, 0, 0, 4, 1, [0, 0, 0]);
  setPixel(img, 1, 1, [255, 0, 0]);
  setPixel(img, 2, 2, [0, 255, 0]);

  test("round-trips an image", () => {
    const text = imageToGrid(img, PALETTE, { asset: "test", frame: "00" });
    expect(text).toBe(
      "# asset: test  frame: 00  palette: v9  size: 4x3\n0000\n.2..\n..Q.\n",
    );
    const grid = parseGrid(text, PALETTE);
    expect(grid.header.asset).toBe("test");
    expect(gridToImage(grid, PALETTE).data).toEqual(img.data);
  });

  test("rejects ragged rows, a wrong size, and unknown indices", () => {
    expect(() => parseGrid("000\n00\n")).toThrow(/Ragged/);
    expect(() => parseGrid("# size: 3x3\n000\n000\n")).toThrow(/header says/);
    expect(() => parseGrid("0x0\n", PALETTE)).toThrow(
      /Unknown palette index "x"/,
    );
  });

  test("refuses off-palette and partial-alpha pixels", () => {
    expect(() => imageToGrid(solid(1, 1, [1, 2, 3]), PALETTE)).toThrow(
      /isn't in the palette/,
    );
    expect(() => imageToGrid(solid(1, 1, [0, 0, 0], 100), PALETTE)).toThrow(
      /partial alpha/,
    );
  });

  test("patches a region, whole rows at a time", () => {
    const patch = gridToImage(parseGrid("22\n..\n"), PALETTE);
    const out = patchRegion(img, patch, 2, 0);
    expect(imageToGrid(out, PALETTE).split("\n").slice(1, 4)).toEqual([
      "0022",
      ".2..",
      "..Q.",
    ]);
    expect(() => patchRegion(img, patch, 3, 0)).toThrow(/outside/);
  });
});

describe("cutout", () => {
  test("cuts a polygon, reports position and bounds, and leaves a hole", () => {
    const img = solid(10, 10, [0, 0, 0]);
    const cut = cutPolygon(img, [
      [2, 3],
      [6, 3],
      [6, 8],
      [2, 8],
    ]);
    expect(cut.position).toEqual({ x: 2, y: 3, w: 4, h: 5 });
    expect(cut.bounds).toEqual({ x: 2, y: 3, w: 4, h: 5 });
    expect(getPixel(cut.hole, 3, 4)[3]).toBe(0);
    expect(getPixel(cut.hole, 1, 4)[3]).toBe(255);
  });
});

describe("character packing", () => {
  test("packs one row per tag and records frames and timing", () => {
    const strips = Object.fromEntries(
      Object.entries(CHARACTER_TAGS).map(([tag, s]) => [
        tag,
        solid(s.frames * s.cell.w, s.cell.h, [0, 0, 0]),
      ]),
    );
    const { sheet, json } = packCharacter(strips, {
      stride: 24,
      talkHeadOffset: { x: 8, y: 3 },
    });
    // 31 body frames + 6 talk heads. The art spec says "37 body frames plus 6 talk
    // heads", but its own table adds up to 31 + 6 = 37 frames in all.
    expect(json.frames).toHaveLength(37);
    expect(json.tags["walk-e"]).toMatchObject({
      from: 0,
      to: 7,
      timing: { mode: "distance" },
    });
    expect(json.tags["talk-s"].to).toBe(36);
    expect(json.origin).toEqual({ x: 16, y: 61 });
    expect(sheet.width).toBe(8 * 32);
    expect(sheet.height).toBe(8 * 64 + 2 * 16);
  });

  test("refuses a tag with the wrong frame count", () => {
    const strips = Object.fromEntries(
      Object.entries(CHARACTER_TAGS).map(([tag, s]) => [
        tag,
        solid(s.frames * s.cell.w, s.cell.h, [0, 0, 0]),
      ]),
    );
    strips["walk-e"] = solid(7 * 32, 64, [0, 0, 0]);
    expect(() =>
      packCharacter(strips, { stride: 24, talkHeadOffset: { x: 0, y: 0 } }),
    ).toThrow(/walk-e/);
  });
});

describe("image I/O", () => {
  const dir = mkdtempSync(join(tmpdir(), "assets-lib-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test("round-trips PNG and lossless WebP exactly", async () => {
    const img = createImage(3, 2);
    setPixel(img, 0, 0, [10, 20, 30]);
    setPixel(img, 2, 1, [200, 100, 0]);
    await writePng(join(dir, "a.png"), img);
    await writeWebp(join(dir, "a.webp"), img);
    expect((await readImage(join(dir, "a.png"))).data).toEqual(img.data);
    const webp = await readImage(join(dir, "a.webp"));
    expect(getPixel(webp, 0, 0)).toEqual([10, 20, 30, 255]);
    expect(getPixel(webp, 2, 1)).toEqual([200, 100, 0, 255]);
    expect(getPixel(webp, 1, 0)[3]).toBe(0);
  });
});
