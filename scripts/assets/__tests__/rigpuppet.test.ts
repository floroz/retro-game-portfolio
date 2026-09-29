// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { sampleClip } from "../../../src/engine/rig/clip";
import { POSE_CLIPS } from "../../../src/engine/rig/poses";
import {
  parseRig,
  placeRig,
  poseFor,
  type Rig,
} from "../../../src/engine/rig/rig";
import type { PlacedPart, RigPose } from "../../../src/engine/rig/transform";
import {
  RIG_INK,
  type RigFacing,
  type RigPartId,
} from "../../../src/engine/rigTypes";
import { REPO_ROOT, readImage, type Image } from "../lib";

/**
 * Checks on the shipped puppet (HR1): the atlas is rasterized here the way
 * rig/draw.ts does at full size, so the joints and the silhouette can be
 * tested without a canvas.
 */
const DIR = join(REPO_ROOT, "src/assets/character");
const json: unknown = JSON.parse(
  readFileSync(join(DIR, "daniele-rig.json"), "utf8"),
);
const rig: Rig = parseRig(json, "daniele-rig.png");
const atlas: Promise<Image> = readImage(join(DIR, "daniele-rig.png"));

const X0 = -50;
const Y0 = -170;
const GW = 100;
const GH = 180;

interface Grid {
  /** Colour per pixel; alpha 0 where empty. */
  data: Uint8ClampedArray;
}

/** The posed figure, one atlas px per grid px, feet at (0, 0): grid px (i, j) covers (X0 + i, Y0 + j). */
function raster(atlasImg: Image, placed: PlacedPart[]): Grid {
  const data = new Uint8ClampedArray(GW * GH * 4);
  for (const part of placed) {
    const [a, b, c, d, e, f] = part.matrix;
    const det = a * d - b * c;
    const f_ = part.frame;
    for (let j = 0; j < GH; j++) {
      for (let i = 0; i < GW; i++) {
        const px = X0 + i + 0.5 - e;
        const py = Y0 + j + 0.5 - f;
        const u = (d * px - c * py) / det + f_.pivot.x;
        const v = (-b * px + a * py) / det + f_.pivot.y;
        if (u < 0 || v < 0 || u >= f_.w || v >= f_.h) continue;
        const q =
          ((f_.y + Math.floor(v)) * atlasImg.width + f_.x + Math.floor(u)) * 4;
        if (atlasImg.data[q + 3] < 128) continue;
        data.set(atlasImg.data.subarray(q, q + 4), (j * GW + i) * 4);
      }
    }
  }
  return { data };
}

const opaque = (g: Grid, x: number, y: number) => {
  const i = x - X0;
  const j = y - Y0;
  return (
    i >= 0 && j >= 0 && i < GW && j < GH && g.data[(j * GW + i) * 4 + 3] > 0
  );
};

const isInk = (g: Grid, x: number, y: number) => {
  const p = ((y - Y0) * GW + (x - X0)) * 4;
  return (
    opaque(g, x, y) &&
    Math.abs(g.data[p] - RIG_INK[0]) < 12 &&
    Math.abs(g.data[p + 1] - RIG_INK[1]) < 12 &&
    Math.abs(g.data[p + 2] - RIG_INK[2]) < 12
  );
};

const onEdge = (g: Grid, x: number, y: number) =>
  [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].some(([dx, dy]) => !opaque(g, x + dx, y + dy));

const REST: RigPose = {
  angles: {},
  stretch: {},
  root: { x: 0, y: 0 },
  variants: {},
};
const FACINGS: RigFacing[] = ["side", "front", "back"];

describe("the shipped puppet has no seams at its joints", () => {
  test.each(FACINGS)(
    "%s: no ink line runs across an elbow, knee or shoulder",
    async (facing) => {
      const img = await atlas;
      const g = raster(img, placeRig(rig, facing, REST));
      // Joint rows in px above the soles (the drawing's body model).
      for (const up of [108, 84, 36]) {
        for (let y = -up - 2; y <= -up + 2; y++) {
          let run = 0;
          let worst = 0;
          for (let x = X0; x < X0 + GW; x++) {
            if (isInk(g, x, y) && !onEdge(g, x, y)) run++;
            else run = 0;
            worst = Math.max(worst, run);
          }
          expect(worst, `${facing} row ${-y}`).toBeLessThanOrEqual(2);
        }
      }
    },
  );

  test("every clip keeps the figure in one piece, and each joint inside its parent", async () => {
    const img = await atlas;
    const facingOf: Record<string, RigFacing> = {};
    for (const [name, clip] of Object.entries(POSE_CLIPS))
      facingOf[name] = clip.facing;
    for (const [name, clip] of Object.entries(POSE_CLIPS)) {
      for (let k = 0; k < 16; k++) {
        const phase = k / 16;
        const pose = poseFor(
          rig,
          clip,
          sampleClip(clip, phase),
          {},
          clip.footLock ? phase : undefined,
        );
        const placed = placeRig(rig, facingOf[name], pose);
        const g = raster(img, placed);
        // One 4-connected piece.
        const seen = new Set<number>();
        const key = (x: number, y: number) => (y - Y0) * GW + (x - X0);
        let start: [number, number] | null = null;
        let total = 0;
        for (let y = Y0; y < Y0 + GH; y++)
          for (let x = X0; x < X0 + GW; x++)
            if (opaque(g, x, y)) {
              total++;
              start ??= [x, y];
            }
        const stack: [number, number][] = start ? [start] : [];
        if (start) seen.add(key(...start));
        while (stack.length) {
          const [x, y] = stack.pop() as [number, number];
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            if (opaque(g, x + dx, y + dy) && !seen.has(key(x + dx, y + dy))) {
              seen.add(key(x + dx, y + dy));
              stack.push([x + dx, y + dy]);
            }
          }
        }
        expect(seen.size, `${name} at ${phase}`).toBe(total);
        // Each joint lies inside its parent's own image.
        for (const p of placed) {
          const parentId = rig.facings[facingOf[name]].parts.find(
            (q) => q.id === p.id,
          )?.parent;
          if (!parentId) continue;
          const parent = placed.find((q) => q.id === parentId) as PlacedPart;
          const [a, b, c, d, e, f] = parent.matrix;
          const det = a * d - b * c;
          const px = p.joint.x - e;
          const py = p.joint.y - f;
          const u = (d * px - c * py) / det + parent.frame.pivot.x;
          const v = (-b * px + a * py) / det + parent.frame.pivot.y;
          const qi =
            ((parent.frame.y + Math.floor(v)) * img.width +
              parent.frame.x +
              Math.floor(u)) *
            4;
          const inside =
            u >= 0 &&
            v >= 0 &&
            u < parent.frame.w &&
            v < parent.frame.h &&
            img.data[qi + 3] > 0;
          expect(
            inside,
            `${name} ${p.id} joint in ${parentId} at ${phase}`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("the shipped puppet's proportions", () => {
  const part = (facing: RigFacing, id: RigPartId) =>
    rig.facings[facing].parts.find(
      (p) => p.id === id,
    ) as Rig["facings"]["side"]["parts"][number];

  test("the head is about 1/5.65 of his height, the same in every facing", () => {
    for (const facing of FACINGS) {
      const bounds = rig.facings[facing].bounds;
      const head = part(facing, "head");
      // The frame includes a few px of neck under the chin.
      const neck = { side: 2.5, front: 5, back: 3 }[facing];
      const face = head.frame.h - neck;
      expect(bounds.h).toBe(144);
      expect(face / 144).toBeGreaterThan(1 / 6);
      expect(face / 144).toBeLessThan(1 / 5.5);
    }
  });

  test("arms and legs are the same thickness in every facing", () => {
    for (const id of ["upper-arm-r", "forearm-r", "thigh-r"] as const) {
      const widths = FACINGS.map((f) => part(f, id).frame.w);
      expect(Math.max(...widths) - Math.min(...widths), id).toBeLessThanOrEqual(
        1,
      );
    }
    // And the arms are narrower than a third of the torso.
    for (const facing of ["front", "back"] as const) {
      expect(
        part(facing, "upper-arm-r").frame.w / part(facing, "torso").frame.w,
      ).toBeLessThan(0.34);
    }
  });

  test("the hands end between the top of the thigh and mid-thigh", async () => {
    const img = await atlas;
    for (const facing of FACINGS) {
      const g = raster(img, placeRig(rig, facing, REST));
      // The lowest skin-coloured pixel above the knee.
      let low = 999;
      for (let y = -100; y < -40; y++)
        for (let x = X0; x < X0 + GW; x++) {
          const p = ((y - Y0) * GW + (x - X0)) * 4;
          if (
            opaque(g, x, y) &&
            g.data[p] > 200 &&
            g.data[p + 1] > 140 &&
            g.data[p + 2] < 140
          )
            low = Math.min(low, -y);
        }
      expect(low, facing).toBeGreaterThan(50);
      expect(low, facing).toBeLessThan(66);
    }
  });

  test("the back view's legs and feet stay apart down to the soles", async () => {
    const img = await atlas;
    const g = raster(img, placeRig(rig, "back", REST));
    for (let y = -64; y <= -1; y++) {
      const gap = [-1, 0, 1].some((x) => !opaque(g, x, y));
      expect(gap, `row ${-y}`).toBe(true);
    }
  });
});
