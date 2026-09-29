// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  checkAssetSize,
  checkCharacterJson,
  checkPaintedAlpha,
  checkPaintedColours,
  checkProvenance,
  checkSceneDensities,
  classifyAsset,
  colourGroup,
  provenanceDensity,
  provenanceStyle,
  usesPixelRules,
  type ShippedAsset,
} from "../checks";

describe("asset naming", () => {
  test("accepts the art spec's names and derives asset ids", () => {
    expect(classifyAsset("src/assets/scenes/zurich/bg.png")).toMatchObject({
      id: "zurich-bg",
      kind: "bg",
      scene: "zurich",
    });
    expect(
      classifyAsset("src/assets/scenes/zurich/obj-door@open.png"),
    ).toMatchObject({ id: "zurich-obj-door@open", kind: "obj" });
    expect(
      classifyAsset("src/assets/scenes/travel-map/anim-plane.png"),
    ).toMatchObject({ scene: "travel-map", kind: "anim" });
    expect(
      classifyAsset("src/assets/shared/slots/slot-photo-frame-more.png"),
    ).toMatchObject({ id: "slot-photo-frame-more", scene: null });
    expect(classifyAsset("src/assets/character/daniele.png")).toMatchObject({
      kind: "character",
      scene: null,
    });
    expect(classifyAsset("src/assets/character/daniele.json")).toBeNull();
  });

  test("rejects bad names and places", () => {
    for (const bad of [
      "src/assets/scenes/paris/bg.png",
      "src/assets/scenes/zurich/Background.png",
      "src/assets/scenes/zurich/obj_desk.png",
      "src/assets/scenes/zurich/extra/bg.png",
      "src/assets/shared/slots/tap.png",
      "src/assets/character/walk.png",
    ]) {
      expect(typeof classifyAsset(bad)).toBe("string");
    }
  });

  test("checks sizes", () => {
    const bg = {
      path: "src/assets/scenes/hall/bg.png",
      id: "hall-bg",
      kind: "bg" as const,
      scene: "hall" as const,
    };
    expect(checkAssetSize(bg, 320, 160)).toEqual([]);
    expect(checkAssetSize(bg, 320, 161)).toHaveLength(1);
  });
});

describe("provenance", () => {
  const exists = (p: string) => !p.includes("missing");
  const opus = {
    id: "slot-tap",
    output: "src/assets/shared/slots/slot-tap.png",
    task: "B6",
    source: "opus",
    palette: "v1",
    date: "2026-10-01",
  };

  test("accepts a complete record", () => {
    expect(checkProvenance(opus, "slot-tap.json", exists)).toEqual([]);
    const codex = {
      ...opus,
      id: "zurich-bg",
      output: "src/assets/scenes/zurich/bg.png",
      source: "codex",
      prompt: "assets-src/prompts/scenes/zurich.md",
      candidate: "03",
      references: ["assets-src/refs/zurich-layout@8x.png"],
      approvedRaw: "assets-src/approved/zurich-bg.webp",
    };
    expect(checkProvenance(codex, "zurich-bg.json", exists)).toEqual([]);
  });

  test("reports missing fields, a wrong file name, and missing files", () => {
    expect(
      checkProvenance(
        { ...opus, source: "codex" },
        "slot-tap.json",
        exists,
      ).join("\n"),
    ).toMatch(/prompt.*required/s);
    expect(checkProvenance(opus, "other.json", exists).join()).toMatch(
      /slot-tap.json/,
    );
    expect(
      checkProvenance(
        { ...opus, output: "missing.png" },
        "slot-tap.json",
        exists,
      ).join(),
    ).toMatch(/doesn't exist/);
    expect(
      checkProvenance(
        { ...opus, candidate: "01" },
        "slot-tap.json",
        exists,
      ).join(),
    ).toMatch(/only for codex/);
    expect(
      checkProvenance(
        { ...opus, date: "yesterday" },
        "slot-tap.json",
        exists,
      ).join(),
    ).toMatch(/YYYY-MM-DD/);
  });
});

describe("character json", () => {
  test("flags a missing tag and a size mismatch", () => {
    const errors = checkCharacterJson(
      { size: { w: 1, h: 1 }, stride: 24, frames: [], tags: {} },
      { width: 2, height: 2 },
    );
    expect(errors.join("\n")).toMatch(/size doesn't match/);
    expect(errors.join("\n")).toMatch(/missing tag walk-e/);
  });
});

describe("HD (density 4)", () => {
  const bg: ShippedAsset = {
    path: "src/assets/scenes/zurich/bg.png",
    id: "zurich-bg",
    kind: "bg",
    scene: "zurich",
  };
  const obj: ShippedAsset = {
    path: "src/assets/scenes/zurich/obj-desk.png",
    id: "zurich-obj-desk",
    kind: "obj",
    scene: "zurich",
  };

  test("sizes scenes at 1280x640 and keeps objects inside them", () => {
    expect(checkAssetSize(bg, 1280, 640, 4)).toEqual([]);
    expect(checkAssetSize(bg, 640, 320, 4).join()).toMatch(
      /1280x640 at density 4/,
    );
    expect(checkAssetSize(bg, 1280, 640, 2)).toHaveLength(1);
    expect(checkAssetSize(obj, 900, 500, 4)).toEqual([]);
    expect(checkAssetSize(obj, 1281, 500, 4)).toHaveLength(1);
  });

  test("skips only the pixel-art rules", () => {
    expect(usesPixelRules(1)).toBe(true);
    expect(usesPixelRules(2)).toBe(true);
    expect(usesPixelRules(4)).toBe(false);
  });

  test("still forbids a scene that mixes densities", () => {
    expect(
      checkSceneDensities([
        { asset: bg, density: 4 },
        { asset: obj, density: 4 },
      ]),
    ).toEqual([]);
    expect(
      checkSceneDensities([
        { asset: bg, density: 4 },
        { asset: obj, density: 2 },
      ])[0],
    ).toMatch(
      /zurich: mixes densities.*density 4: src\/assets\/scenes\/zurich\/bg/,
    );
  });

  test("accepts density 4 in provenance", () => {
    const record = {
      id: "zurich-bg",
      output: "src/assets/scenes/zurich/bg.png",
      task: "HB1",
      source: "codex",
      prompt: "assets-src/prompts/hd/zurich.md",
      candidate: "02",
      references: [],
      approvedRaw: "assets-src/approved/zurich-bg@hd.webp",
      density: 4,
      date: "2026-10-05",
    };
    expect(checkProvenance(record, "zurich-bg.json", () => true)).toEqual([]);
    expect(provenanceDensity(record)).toBe(4);
    expect(
      checkProvenance({ ...record, density: 3 }, "zurich-bg.json", () => true),
    ).toHaveLength(1);
  });

  test("names the cut-out rig and ties it to density 4", () => {
    const rig = classifyAsset("src/assets/character/daniele-rig.png");
    expect(rig).toMatchObject({ id: "char-rig", kind: "rig", scene: null });
    expect(classifyAsset("src/assets/character/daniele-rig.json")).toBeNull();
    expect(typeof classifyAsset("src/assets/character/rig.png")).toBe("string");
    const asset = rig as ShippedAsset;
    expect(checkAssetSize(asset, 900, 700, 4)).toEqual([]);
    expect(checkAssetSize(asset, 900, 700, 1).join()).toMatch(/density 4/);
    const sheet = classifyAsset(
      "src/assets/character/daniele.png",
    ) as ShippedAsset;
    expect(checkAssetSize(sheet, 64, 128, 4).join()).toMatch(/cut-out rig/);
  });
});

describe("painted (density 2, style painted)", () => {
  const asset = (path: string) => classifyAsset(path) as ShippedAsset;
  const bg = asset("src/assets/scenes/zurich/bg.png");
  const obj = asset("src/assets/scenes/zurich/obj-desk.png");
  const london = asset("src/assets/scenes/london/bg.png");
  const slot = asset("src/assets/shared/slots/slot-tap.png");
  const plane = asset("src/assets/shared/map-plane.png");
  const rig = asset("src/assets/character/daniele-rig.png");
  const sheet = asset("src/assets/character/daniele.png");
  const colours = (from: number, count: number) =>
    new Set(Array.from({ length: count }, (_, i) => from + i));

  test("skips the master-palette and ramp rules only for painted", () => {
    expect(usesPixelRules(2, "painted")).toBe(false);
    expect(usesPixelRules(2, "pixel")).toBe(true);
    expect(usesPixelRules(2)).toBe(true);
    expect(usesPixelRules(1, "painted")).toBe(true);
  });

  test("sizes scenes at 640x320 and needs even sprite sides", () => {
    expect(checkAssetSize(bg, 640, 320, 2, "painted")).toEqual([]);
    expect(checkAssetSize(bg, 1280, 640, 2, "painted").join()).toMatch(
      /640x320 at density 2 \(painted\)/,
    );
    expect(checkAssetSize(obj, 120, 88, 2, "painted")).toEqual([]);
    expect(checkAssetSize(obj, 121, 88, 2, "painted").join()).toMatch(
      /even sides/,
    );
    expect(checkAssetSize(slot, 30, 31, 2, "painted")).toHaveLength(1);
    expect(checkAssetSize(plane, 34, 34, 2, "painted")).toEqual([]);
    // Pixel-art density 2 keeps its old rules: odd sprites are fine there.
    expect(checkAssetSize(obj, 121, 88, 2, "pixel")).toEqual([]);
  });

  test("allows the rig at painted density 2, and no painted sheet", () => {
    expect(checkAssetSize(rig, 901, 700, 2, "painted")).toEqual([]);
    expect(checkAssetSize(rig, 900, 700, 2, "pixel").join()).toMatch(
      /density 2 with "style": "painted", or density 4/,
    );
    expect(checkAssetSize(sheet, 64, 128, 2, "painted").join()).toMatch(
      /cut-out rig/,
    );
    expect(checkAssetSize(sheet, 64, 128, 2, "pixel")).toEqual([]);
  });

  test("needs hard alpha", () => {
    expect(
      checkPaintedAlpha(obj, { data: [1, 2, 3, 255, 0, 0, 0, 0] }),
    ).toEqual([]);
    expect(
      checkPaintedAlpha(obj, { data: [1, 2, 3, 255, 1, 2, 3, 128] }).join(),
    ).toMatch(/1 pixels have partial alpha/);
  });

  test("allows at most 256 colours per scene folder across all its files", () => {
    expect(colourGroup(obj)).toBe("src/assets/scenes/zurich");
    expect(colourGroup(slot)).toBe("src/assets/shared");
    expect(colourGroup(plane)).toBe("src/assets/shared");
    expect(colourGroup(rig)).toBe(rig.path);
    // 200 + 100 with 50 shared: 250 together.
    expect(
      checkPaintedColours([
        { asset: bg, colours: colours(0, 200) },
        { asset: obj, colours: colours(150, 100) },
      ]),
    ).toEqual([]);
    const over = checkPaintedColours([
      { asset: bg, colours: colours(0, 200) },
      { asset: obj, colours: colours(190, 100) },
      { asset: london, colours: colours(1000, 250) },
    ]);
    expect(over).toHaveLength(1);
    expect(over[0]).toMatch(
      /^src\/assets\/scenes\/zurich: its 2 painted file\(s\) use 290 colours/,
    );
    expect(
      checkPaintedColours([
        { asset: slot, colours: colours(0, 200) },
        { asset: plane, colours: colours(500, 100) },
      ]).join(),
    ).toMatch(/src\/assets\/shared/);
  });

  test("forbids a scene that mixes painted and pixel art", () => {
    expect(
      checkSceneDensities([
        { asset: bg, density: 2, style: "painted" },
        { asset: obj, density: 2, style: "painted" },
      ]),
    ).toEqual([]);
    expect(
      checkSceneDensities([
        { asset: bg, density: 2, style: "painted" },
        { asset: obj, density: 2 },
      ])[0],
    ).toMatch(
      /zurich: mixes densities.*density 2: .*obj-desk.*density 2 painted: .*bg/,
    );
  });

  test("checks style in provenance", () => {
    const record = {
      id: "zurich-bg",
      output: "src/assets/scenes/zurich/bg.png",
      task: "HB1",
      source: "codex",
      prompt: "assets-src/prompts/hd/zurich.md",
      candidate: "02",
      references: [],
      approvedRaw: "assets-src/approved/zurich-bg@hd.webp",
      density: 2,
      style: "painted",
      date: "2026-10-05",
    };
    const check = (r: object) =>
      checkProvenance(r, "zurich-bg.json", () => true);
    expect(check(record)).toEqual([]);
    expect(provenanceStyle(record)).toBe("painted");
    expect(provenanceStyle({ ...record, style: undefined })).toBe("pixel");
    expect(check({ ...record, style: "watercolour" }).join()).toMatch(
      /style must be/,
    );
    expect(check({ ...record, density: 4 }).join()).toMatch(
      /"style": "painted" is density 2 art/,
    );
    expect(check({ ...record, palette: "v2" }).join()).toMatch(
      /no master palette/,
    );
    // Pixel-art density 2 still needs its @2x approved raw.
    expect(check({ ...record, style: "pixel" }).join()).toMatch(/@2x\.webp/);
  });
});
