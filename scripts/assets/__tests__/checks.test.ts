// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  checkAssetSize,
  checkCharacterJson,
  checkProvenance,
  classifyAsset,
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
