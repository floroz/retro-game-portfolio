// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  RIG_FACINGS,
  RIG_PART_IDS,
  type RigFacing,
  type RigFrame,
  type RigPartId,
  type RigPoint,
} from "../../../src/engine/rigTypes";
import { createImage, fillRect, getPixel, type Image, type Rgb } from "../lib";
import {
  checkRigJson,
  checkRigSource,
  packRig,
  rigSourceFiles,
  shelfPack,
  type RigSource,
  type RigSourcePart,
} from "../rigpack";

const DRAWING = { w: 60, h: 120 };

/** Where each part is painted in the test drawing, and its joint. */
const LAYOUT: Record<
  RigPartId,
  {
    rect: [number, number, number, number];
    pivot: RigPoint;
    parent?: RigPartId;
    z: number;
  }
> = {
  torso: { rect: [20, 30, 20, 40], pivot: { x: 30, y: 68 }, z: 5 },
  head: {
    rect: [22, 8, 16, 20],
    pivot: { x: 30, y: 28 },
    parent: "torso",
    z: 6,
  },
  "upper-arm-l": {
    rect: [14, 32, 6, 18],
    pivot: { x: 17, y: 33 },
    parent: "torso",
    z: 1,
  },
  "forearm-l": {
    rect: [14, 50, 6, 18],
    pivot: { x: 17, y: 50 },
    parent: "upper-arm-l",
    z: 0,
  },
  "upper-arm-r": {
    rect: [40, 32, 6, 18],
    pivot: { x: 43, y: 33 },
    parent: "torso",
    z: 8,
  },
  "forearm-r": {
    rect: [40, 50, 6, 18],
    pivot: { x: 43, y: 50 },
    parent: "upper-arm-r",
    z: 9,
  },
  "thigh-l": {
    rect: [22, 68, 7, 24],
    pivot: { x: 25, y: 69 },
    parent: "torso",
    z: 2,
  },
  "shin-l": {
    rect: [22, 92, 7, 24],
    pivot: { x: 25, y: 92 },
    parent: "thigh-l",
    z: 3,
  },
  "thigh-r": {
    rect: [31, 68, 7, 24],
    pivot: { x: 35, y: 69 },
    parent: "torso",
    z: 4,
  },
  "shin-r": {
    rect: [31, 92, 7, 24],
    pivot: { x: 35, y: 92 },
    parent: "thigh-r",
    z: 4,
  },
};
const FEET = { x: 30, y: 116 };

const colourOf = (facing: RigFacing, id: RigPartId): Rgb => [
  40 + RIG_FACINGS.indexOf(facing) * 60,
  20 + RIG_PART_IDS.indexOf(id) * 20,
  200,
];

/** A full-drawing-size PNG with one part painted in. */
function partImage(facing: RigFacing, id: RigPartId): Image {
  const img = createImage(DRAWING.w, DRAWING.h);
  const [x, y, w, h] = LAYOUT[id].rect;
  fillRect(img, x, y, w, h, colourOf(facing, id));
  return img;
}

function fixture(): { source: RigSource; images: Map<string, Image> } {
  const images = new Map<string, Image>();
  const facings = {} as RigSource["facings"];
  for (const facing of RIG_FACINGS) {
    const parts = {} as Record<RigPartId, RigSourcePart>;
    for (const id of RIG_PART_IDS) {
      const file = `${facing}/${id}.png`;
      images.set(file, partImage(facing, id));
      const { pivot, parent, z } = LAYOUT[id];
      parts[id] = { file, pivot, z, ...(parent ? { parent } : {}) };
    }
    // A blink drawn full size, and a mouth cropped with an offset.
    const blink = createImage(DRAWING.w, DRAWING.h);
    fillRect(blink, 22, 8, 16, 20, [1, 2, 3]);
    images.set(`${facing}/head-blink.png`, blink);
    const mouth = createImage(20, 24);
    fillRect(mouth, 2, 2, 16, 20, [4, 5, 6]);
    images.set(`${facing}/talk-1.png`, mouth);
    parts.head.variants = {
      blink: `${facing}/head-blink.png`,
      "talk-1": { file: `${facing}/talk-1.png`, offset: { x: 20, y: 6 } },
    };
    facings[facing] = { feet: FEET, parts };
  }
  return { source: { facings }, images };
}

function atlasColour(atlas: Image, fr: RigFrame): number[] {
  return getPixel(atlas, fr.x + 1, fr.y + 1).slice(0, 3);
}

describe("rig packer", () => {
  test("trims each part and makes its pivot and attach point relative", () => {
    const { source, images } = fixture();
    const { atlas, json } = packRig(source, images);
    expect(json).toMatchObject({
      version: 1,
      density: 4,
      image: "daniele-rig.png",
    });
    expect(json.size).toEqual({ w: atlas.width, h: atlas.height });

    const side = json.facings.side;
    const torso = side.parts.find((p) => p.id === "torso");
    const forearm = side.parts.find((p) => p.id === "forearm-l");
    expect(torso).toMatchObject({
      parent: null,
      attach: { x: 0, y: 68 - 116 },
      frame: { w: 20, h: 40, pivot: { x: 10, y: 38 } },
    });
    expect(forearm).toMatchObject({
      parent: "upper-arm-l",
      attach: { x: 0, y: 50 - 33 },
      frame: { w: 6, h: 18, pivot: { x: 3, y: 0 } },
    });
    expect(side.bounds).toEqual({
      x: 14 - 30,
      y: 8 - 116,
      w: 46 - 14,
      h: 116 - 8,
    });
  });

  test("reproduces the drawing when every part is drawn on its joint", () => {
    const { source, images } = fixture();
    const { atlas, json } = packRig(source, images);
    for (const facing of RIG_FACINGS) {
      const joints = new Map<RigPartId, RigPoint>();
      const parts = json.facings[facing].parts;
      // Resolve joints parent-first.
      while (joints.size < parts.length) {
        for (const p of parts) {
          const base = p.parent === null ? FEET : joints.get(p.parent);
          if (!base || joints.has(p.id)) continue;
          joints.set(p.id, { x: base.x + p.attach.x, y: base.y + p.attach.y });
        }
      }
      for (const p of parts) {
        const joint = joints.get(p.id) as RigPoint;
        const [x, y] = LAYOUT[p.id].rect;
        expect({
          x: joint.x - p.frame.pivot.x,
          y: joint.y - p.frame.pivot.y,
        }).toEqual({ x, y });
        expect(atlasColour(atlas, p.frame)).toEqual([
          ...colourOf(facing, p.id),
        ]);
      }
    }
  });

  test("sorts parts by z, keeping part order for ties", () => {
    const { source, images } = fixture();
    const ids = packRig(source, images).json.facings.front.parts.map(
      (p) => p.id,
    );
    expect(ids).toEqual([
      "forearm-l",
      "upper-arm-l",
      "thigh-l",
      "shin-l",
      "thigh-r",
      "shin-r",
      "torso",
      "head",
      "upper-arm-r",
      "forearm-r",
    ]);
  });

  test("packs head variants on the head's joint", () => {
    const { source, images } = fixture();
    const { atlas, json } = packRig(source, images);
    const head = json.facings.back.parts.find((p) => p.id === "head");
    expect(Object.keys(head?.variants ?? {})).toEqual(["blink", "talk-1"]);
    // Both variants cover drawing 22,8 so their pivot matches the rest frame.
    expect(head?.variants.blink.pivot).toEqual(head?.frame.pivot);
    expect(head?.variants["talk-1"].pivot).toEqual(head?.frame.pivot);
    expect(atlasColour(atlas, head?.variants["talk-1"] as RigFrame)).toEqual([
      4, 5, 6,
    ]);
  });

  test("frames never overlap and keep their padding", () => {
    const sizes = [
      { w: 30, h: 10 },
      { w: 5, h: 40 },
      { w: 12, h: 12 },
      { w: 50, h: 3 },
    ];
    const { positions, w, h } = shelfPack(sizes, 2);
    const rects = sizes.map((s, i) => ({ ...s, ...positions[i] }));
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(2);
      expect(r.y).toBeGreaterThanOrEqual(2);
      expect(r.x + r.w + 2).toBeLessThanOrEqual(w);
      expect(r.y + r.h + 2).toBeLessThanOrEqual(h);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const apart =
          a.x + a.w + 2 <= b.x ||
          b.x + b.w + 2 <= a.x ||
          a.y + a.h + 2 <= b.y ||
          b.y + b.h + 2 <= a.y;
        expect(apart).toBe(true);
      }
    }
  });

  test("lists every file once", () => {
    const { source, images } = fixture();
    expect(rigSourceFiles(source).sort()).toEqual([...images.keys()].sort());
  });
});

describe("rig source checks", () => {
  test("accepts the fixture", () => {
    expect(checkRigSource(fixture().source)).toEqual([]);
  });

  test("reports missing parts, unknown parts, and bad hierarchies", () => {
    const { source } = fixture();
    const side = source.facings.side.parts as Record<string, unknown>;
    delete side["shin-r"];
    side.tail = { file: "x.png", pivot: { x: 0, y: 0 }, z: 0 };
    source.facings.front.parts.head.parent = undefined;
    source.facings.back.parts["upper-arm-l"].parent = "forearm-l";
    const errors = checkRigSource(source).join("\n");
    expect(errors).toMatch(/side: missing part "shin-r"/);
    expect(errors).toMatch(/unknown part "tail"/);
    expect(errors).toMatch(
      /front: the torso must be the only part without a parent/,
    );
    expect(errors).toMatch(/back: upper-arm-l is its own ancestor/);
  });

  test("rejects a missing facing and an empty image", () => {
    const { source, images } = fixture();
    const partial = { facings: { side: source.facings.side } };
    expect(checkRigSource(partial).join("\n")).toMatch(/front: missing/);
    images.set("side/head.png", createImage(DRAWING.w, DRAWING.h));
    expect(() => packRig(source, images)).toThrow(
      /side.head: the image is fully transparent/,
    );
  });
});

describe("shipped rig checks", () => {
  test("passes a packed rig and fails a broken one", () => {
    const { source, images } = fixture();
    const { atlas, json } = packRig(source, images);
    expect(checkRigJson(json, atlas)).toEqual([]);

    const broken = structuredClone(json);
    broken.facings.side.parts[0].frame.x = atlas.width;
    broken.facings.front.parts.reverse();
    broken.facings.back.parts.pop();
    const errors = checkRigJson(broken, atlas).join("\n");
    expect(errors).toMatch(/side\.forearm-l: frame falls outside the atlas/);
    expect(errors).toMatch(/front\.\S+: parts must be sorted by z/);
    expect(errors).toMatch(/back lacks/);
    expect(checkRigJson(json, { width: 1, height: 1 }).join("\n")).toMatch(
      /size doesn't match/,
    );
  });
});
