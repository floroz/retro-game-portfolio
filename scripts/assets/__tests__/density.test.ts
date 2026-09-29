// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  CHARACTER_ORIGIN,
  CHARACTER_TAGS,
  alphaBounds,
  allowedColours,
  characterMetrics,
  characterTags,
  chromaKey,
  createImage,
  cutPolygon,
  fillRect,
  figuresToCells,
  findFigures,
  packCharacter,
  parseDensity,
  parsePalette,
  pixelize,
  previewScale,
  sceneSize,
  setPixel,
  splitStrip,
  type Density,
  type Image,
} from "../lib";
import {
  checkAssetSize,
  checkCharacterJson,
  checkProvenance,
  checkSceneDensities,
  provenanceDensity,
  type ShippedAsset,
} from "../checks";

const PALETTE = parsePalette(`
0 #000000 core
1 #ffffff core
2 #ff0000 core
`);

function solid(w: number, h: number, rgb: [number, number, number]): Image {
  const img = createImage(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) setPixel(img, x, y, rgb);
  return img;
}

function strips(density: Density): Record<string, Image> {
  return Object.fromEntries(
    Object.entries(characterTags(density)).map(([tag, s]) => [
      tag,
      solid(s.frames * s.cell.w, s.cell.h, [0, 0, 0]),
    ]),
  );
}

describe("density scaling", () => {
  test("parses --density, defaulting to 1", () => {
    expect(parseDensity(undefined)).toBe(1);
    expect(parseDensity("1")).toBe(1);
    expect(parseDensity("2")).toBe(2);
    expect(() => parseDensity("3")).toThrow(/Unknown density/);
    expect(() => parseDensity("2x")).toThrow(/Unknown density/);
  });

  test("scales the native scene size and halves preview scales", () => {
    expect(sceneSize()).toEqual({ w: 320, h: 160 });
    expect(sceneSize(2)).toEqual({ w: 640, h: 320 });
    expect(previewScale(8)).toBe(8);
    expect(previewScale(8, 2)).toBe(4);
    expect(previewScale(4, 2)).toBe(2);
    expect(previewScale(1, 2)).toBe(1);
  });

  test("puts the character in 64x128 cells, feet on row 123, at density 2", () => {
    expect(characterMetrics(1)).toMatchObject({
      body: { w: 32, h: 64 },
      head: { w: 16, h: 16 },
      origin: CHARACTER_ORIGIN,
      feetRow: 61,
      figureHeight: 57,
    });
    const m = characterMetrics(2);
    expect(m).toMatchObject({
      body: { w: 64, h: 128 },
      head: { w: 32, h: 32 },
      origin: { x: 32, y: 123 },
      feetRow: 123,
    });
    // The spec's 114–116 px figure, and the bottom row of logical row 61.
    expect(m.figureHeight).toBeGreaterThanOrEqual(114);
    expect(m.figureHeight).toBeLessThanOrEqual(116);
    expect(Math.floor(m.feetRow / 2)).toBe(61);
    expect(m.feetRow % 2).toBe(1);
  });

  test("keeps every tag, frame count, and timing, and doubles the cells", () => {
    expect(characterTags(1)).toEqual(CHARACTER_TAGS);
    const tags = characterTags(2);
    for (const [tag, spec] of Object.entries(CHARACTER_TAGS)) {
      expect(tags[tag].frames).toBe(spec.frames);
      expect(tags[tag].timing).toEqual(spec.timing);
      expect(tags[tag].cell).toEqual({
        w: spec.cell.w * 2,
        h: spec.cell.h * 2,
      });
    }
    // The density-1 table is untouched.
    expect(CHARACTER_TAGS["walk-e"].cell).toEqual({ w: 32, h: 64 });
  });

  test("pixelizes a raw to 640x320 at density 2", () => {
    const raw = solid(1774, 887, [250, 10, 10]);
    const size = sceneSize(2);
    const out = pixelize(raw, {
      width: size.w,
      height: size.h,
      colours: allowedColours(PALETTE, null),
      crop: "auto",
    });
    expect(out.width).toBe(640);
    expect(out.height).toBe(320);
  });
});

describe("2x slicing", () => {
  // Two figures on magenta, like a Codex sheet: the taller one sets the scale.
  const sheet = solid(600, 1100, [255, 0, 255]);
  fillRect(sheet, 40, 20, 200, 1000, [40, 60, 150]);
  fillRect(sheet, 340, 120, 160, 900, [40, 60, 150]);
  const keyed = chromaKey(sheet);
  const m = characterMetrics(2);

  test("slices figures into 64x128 cells with the feet on row 123", () => {
    const figures = findFigures(keyed);
    expect(figures).toHaveLength(2);
    const strip = figuresToCells(keyed, figures, {
      cellW: m.body.w,
      cellH: m.body.h,
      feetRow: m.feetRow,
      figureHeight: m.figureHeight,
      colours: allowedColours(PALETTE, null),
    });
    expect(strip.width).toBe(2 * 64);
    expect(strip.height).toBe(128);
    const bounds = splitStrip(strip, 64, 128).map((f) => alphaBounds(f));
    for (const b of bounds) expect(b && b.y + b.h - 1).toBe(123);
    expect(bounds[0]?.h).toBe(115); // the tallest figure sets the scale
    expect(bounds[1]?.h).toBe(Math.round((900 * 115) / 1000));
    expect(bounds[0]?.x).toBe(Math.floor((64 - 23) / 2)); // 200 px → 23, centred
  });

  test("packs 64x128 strips with the 2x origin and records the density", () => {
    const { sheet: packed, json } = packCharacter(strips(2), {
      stride: 52,
      talkHeadOffset: m.talkHeadOffset,
      density: 2,
    });
    expect(json.density).toBe(2);
    expect(json.origin).toEqual({ x: 32, y: 123 });
    expect(json.frames).toHaveLength(37);
    expect(json.frames[0]).toEqual({ x: 0, y: 0, w: 64, h: 128 });
    expect(json.frames[36]).toMatchObject({ w: 32, h: 32 });
    expect(packed.width).toBe(8 * 64);
    expect(packed.height).toBe(8 * 128 + 2 * 32);
    expect(checkCharacterJson(json, packed, 2)).toEqual([]);
  });

  test("density 1 packing is unchanged, with no density field", () => {
    const { json } = packCharacter(strips(1), {
      stride: 26,
      talkHeadOffset: { x: 8, y: 3 },
    });
    expect("density" in json).toBe(false);
    expect(json.origin).toEqual({ x: 16, y: 61 });
  });

  test("refuses density-1 strips at density 2", () => {
    expect(() =>
      packCharacter(strips(1), {
        stride: 52,
        talkHeadOffset: { x: 16, y: 8 },
        density: 2,
      }),
    ).toThrow(/expected 8 frames of 64x128/);
  });

  test("aligns a 2x cutout to whole logical pixels", () => {
    const img = solid(20, 20, [0, 0, 0]);
    const poly = [
      [3, 5],
      [8, 5],
      [8, 10],
      [3, 10],
    ] as const;
    expect(cutPolygon(img, poly).position).toEqual({ x: 3, y: 5, w: 5, h: 5 });
    const cut = cutPolygon(img, poly, { align: 2 });
    expect(cut.position).toEqual({ x: 2, y: 4, w: 6, h: 6 });
    expect(cut.bounds).toEqual({ x: 3, y: 5, w: 5, h: 5 });
    expect(cut.sprite.width).toBe(6);
  });
});

describe("density validation", () => {
  const bg: ShippedAsset = {
    path: "src/assets/scenes/hall/bg.png",
    id: "hall-bg",
    kind: "bg",
    scene: "hall",
  };
  const obj: ShippedAsset = {
    path: "src/assets/scenes/hall/obj-arch.png",
    id: "hall-obj-arch",
    kind: "obj",
    scene: "hall",
  };

  test("accepts 640x320 layers only at density 2", () => {
    expect(checkAssetSize(bg, 320, 160)).toEqual([]);
    expect(checkAssetSize(bg, 640, 320)).toHaveLength(1);
    expect(checkAssetSize(bg, 640, 320, 2)).toEqual([]);
    expect(checkAssetSize(bg, 320, 160, 2).join()).toMatch(
      /640x320 at density 2/,
    );
    expect(checkAssetSize(obj, 60, 116, 2)).toEqual([]);
    expect(checkAssetSize(obj, 400, 100, 1)).toHaveLength(1);
    expect(checkAssetSize(obj, 400, 100, 2)).toEqual([]);
    expect(checkAssetSize(obj, 641, 100, 2)).toHaveLength(1);
  });

  test("flags a scene that mixes densities, but not two scenes that differ", () => {
    const london: ShippedAsset = {
      path: "src/assets/scenes/london/bg.png",
      id: "london-bg",
      kind: "bg",
      scene: "london",
    };
    expect(
      checkSceneDensities([
        { asset: bg, density: 2 },
        { asset: obj, density: 2 },
        { asset: london, density: 1 },
      ]),
    ).toEqual([]);
    const errors = checkSceneDensities([
      { asset: bg, density: 2 },
      { asset: obj, density: 1 },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/hall: mixes densities/);
    expect(errors[0]).toMatch(/density 1: src\/assets\/scenes\/hall\/obj/);
  });

  test("reads and checks the provenance density field", () => {
    const exists = () => true;
    const record = {
      id: "hall-bg",
      output: "src/assets/scenes/hall/bg.png",
      task: "RB2",
      source: "codex",
      prompt: "assets-src/prompts/remaster/hall.md",
      candidate: "02",
      references: [],
      approvedRaw: "assets-src/approved/hall-bg@2x.webp",
      palette: "v2",
      density: 2,
      date: "2026-10-02",
    };
    expect(checkProvenance(record, "hall-bg.json", exists)).toEqual([]);
    expect(provenanceDensity(record)).toBe(2);
    expect(provenanceDensity({ ...record, density: undefined })).toBe(1);
    expect(provenanceDensity(undefined)).toBe(1);
    for (const bad of [3, "2", 0]) {
      expect(
        checkProvenance({ ...record, density: bad }, "hall-bg.json", exists)
          .length,
      ).toBe(1);
      expect(provenanceDensity({ ...record, density: bad })).toBe(1);
    }
    expect(
      checkProvenance(
        { ...record, approvedRaw: "assets-src/approved/hall-bg.webp" },
        "hall-bg.json",
        exists,
      ).join(),
    ).toMatch(/@2x\.webp/);
    // Density 1 records stay valid without the field.
    const v1: Record<string, unknown> = {
      ...record,
      approvedRaw: "assets-src/approved/hall-bg.webp",
    };
    delete v1.density;
    expect(checkProvenance(v1, "hall-bg.json", exists)).toEqual([]);
  });

  test("checks the character sheet at its density", () => {
    const { sheet, json } = packCharacter(strips(2), {
      stride: 52,
      talkHeadOffset: { x: 16, y: 8 },
      density: 2,
    });
    expect(checkCharacterJson(json, sheet, 2)).toEqual([]);
    // A 2x sheet whose record still says density 1 fails loudly.
    const asV1 = checkCharacterJson(json, sheet, 1).join("\n");
    expect(asV1).toMatch(/doesn't match the char-sheet provenance/);
    expect(asV1).toMatch(/isn't 32x64/);
    expect(asV1).toMatch(/origin must be \(16, 61\)/);
    const one = packCharacter(strips(1), {
      stride: 26,
      talkHeadOffset: { x: 8, y: 3 },
    });
    expect(checkCharacterJson(one.json, one.sheet)).toEqual([]);
    expect(checkCharacterJson(one.json, one.sheet, 2).join()).toMatch(
      /isn't 64x128/,
    );
  });
});
