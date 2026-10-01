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
import {
  framePoint,
  type PlacedPart,
  type RigPose,
} from "../../../src/engine/rig/transform";
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
/** Inspect silhouettes at the same logical scale for either atlas density. */
const D = rig.density / 2;

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
    const [a, b, c, d, e, f] = part.matrix.map((v) => v / D);
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
      for (const up of [107, 84, 34]) {
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

  test("every clip keeps the figure in one piece, with each joint on its limb", async () => {
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
        // (The renderer drops a lone stray pixel, outline.ts.)
        expect(total - seen.size, `${name} at ${phase}`).toBeLessThanOrEqual(2);
        // Each joint lies on the limb it turns: inside its own image, so the
        // round cap covers it however it swings.
        for (const p of placed) {
          // (The head turns on the neck, inside the collar.)
          if (p.id === "head" || p.id === "torso") continue;
          const [a, b, c, d, e, f] = p.matrix;
          const det = a * d - b * c;
          const px = p.joint.x - e;
          const py = p.joint.y - f;
          const u = (d * px - c * py) / det + p.frame.pivot.x;
          const v = (-b * px + a * py) / det + p.frame.pivot.y;
          const qi =
            ((p.frame.y + Math.floor(v)) * img.width +
              p.frame.x +
              Math.floor(u)) *
            4;
          const inside =
            u >= 0 &&
            v >= 0 &&
            u < p.frame.w &&
            v < p.frame.h &&
            img.data[qi + 3] > 0;
          expect(inside, `${name} ${p.id} joint on its limb at ${phase}`).toBe(
            true,
          );
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

  test("every head retains at least 50 source pixels of facial detail", () => {
    for (const facing of FACINGS) {
      const bounds = rig.facings[facing].bounds;
      const head = part(facing, "head");
      expect(bounds.h / rig.density).toBe(72);
      expect(head.frame.h).toBeGreaterThanOrEqual(50);
      expect(head.frame.h / bounds.h).toBeGreaterThan(0.17);
      expect(head.frame.h / bounds.h).toBeLessThan(0.23);
    }
  });

  test("sleeves stay consistent across facings and legs have a natural front-view stance", () => {
    for (const id of ["upper-arm-r", "forearm-r"] as const) {
      const widths = FACINGS.map((f) => part(f, id).frame.w / D);
      expect(Math.max(...widths) - Math.min(...widths), id).toBeLessThanOrEqual(
        1,
      );
    }
    // Front/back thighs include the outward slope from hip to knee. Their
    // frame bounds are consequently wider than a side-on thigh.
    const frontThigh = part("front", "thigh-r").frame.w;
    const backThigh = part("back", "thigh-r").frame.w;
    expect(Math.abs(frontThigh - backThigh) / D).toBeLessThanOrEqual(2);
    // The original portrait has substantial knit sleeves, unlike the old
    // thin cartoon arms. Keep them proportional to its broad sweater.
    for (const facing of ["front", "back"] as const) {
      const ratio =
        part(facing, "upper-arm-r").frame.w / part(facing, "torso").frame.w;
      expect(ratio).toBeGreaterThan(0.3);
      expect(ratio).toBeLessThan(0.42);
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
    // Below the trouser crotch, rather than through the waistband/hips.
    for (let y = -56; y <= -1; y++) {
      const gap = [-1, 0, 1].some((x) => !opaque(g, x, y));
      expect(gap, `row ${-y}`).toBe(true);
    }
  });

  test("the sweater hem meets the hips near the middle of the figure", () => {
    for (const facing of FACINGS) {
      const torso = part(facing, "torso");
      const bottom = -torso.attach.y - (torso.frame.h - torso.frame.pivot.y);
      expect(bottom / (144 * D), facing).toBeGreaterThan(0.44);
      expect(bottom / (144 * D), facing).toBeLessThan(0.51);
    }
  });

  test("front and back: sloped shoulders and distinct arms below the elbows", async () => {
    const img = await atlas;
    for (const facing of ["front", "back"] as const) {
      const g = raster(img, placeRig(rig, facing, REST));
      // The fuller sleeves may overlap the sweater. They still separate
      // below the elbows instead of merging into a single solid body block.
      let separatedRows = 0;
      for (let up = 68; up <= 86; up++) {
        let runs = 0;
        let was = false;
        for (let x = X0; x < X0 + GW; x++) {
          const on = opaque(g, x, -up);
          if (on && !was) runs++;
          was = on;
        }
        if (runs === 3) separatedRows++;
      }
      expect(separatedRows, facing).toBeGreaterThanOrEqual(5);
      // The shoulder line drops away from the neck: the torso is wider
      // 8 px below its top than at it.
      const width = (up: number) => {
        let n = 0;
        for (let x = X0; x < X0 + GW; x++) if (opaque(g, x, -up)) n++;
        return n;
      };
      expect(width(110)).toBeGreaterThan(width(117) + 8);
    }
  });

  test("the hands are generous: 7 px of skin wide and 8 tall (9 x 12 with their outline)", async () => {
    const img = await atlas;
    const g = raster(img, placeRig(rig, "front", REST));
    let x0 = 999;
    let x1 = -999;
    let y0 = 999;
    let y1 = -999;
    for (let y = -75; y < -50; y++)
      for (let x = X0; x < 0; x++) {
        const p = ((y - Y0) * GW + (x - X0)) * 4;
        if (
          opaque(g, x, y) &&
          g.data[p] > 190 &&
          g.data[p + 1] > 120 &&
          g.data[p + 2] < 140
        ) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
      }
    expect(x1 - x0 + 1).toBeGreaterThanOrEqual(7);
    expect(y1 - y0 + 1).toBeGreaterThanOrEqual(8);
  });
});

describe("the idle is alive, with the feet planted", () => {
  for (const [name, facing] of [
    ["idle-front", "front"],
    ["idle-back", "back"],
    ["idle-side", "side"],
  ] as const) {
    test(name, () => {
      const clip = POSE_CLIPS[name];
      const at = (phase: number) => {
        const pose = poseFor(rig, clip, sampleClip(clip, phase));
        const placed = placeRig(rig, facing, pose);
        const head = placed.find((p) => p.id === "head") as PlacedPart;
        const soles = placed
          .filter((p) => p.id.startsWith("shin"))
          .flatMap((p) => [
            framePoint(p, { x: 0, y: p.frame.h }),
            framePoint(p, { x: p.frame.w, y: p.frame.h }),
          ]);
        return {
          head: head.joint,
          feet: soles.map((q) => q.x).sort((a, b) => a - b),
          ground: Math.max(...soles.map((q) => q.y)),
        };
      };
      const lo = at(0);
      let rise = 0;
      for (let k = 0; k <= 24; k++) {
        const here = at(k / 24);
        rise = Math.max(rise, Math.abs(here.head.y - lo.head.y));
        // The feet stay where they are, to a fifth of a pixel.
        expect(Math.abs(here.ground - lo.ground)).toBeLessThan(0.2);
        here.feet.forEach((x, i) =>
          expect(Math.abs(x - lo.feet[i])).toBeLessThan(0.5),
        );
      }
      // About a pixel of breathing (atlas px at density 2 are art px).
      expect(rise / D).toBeGreaterThanOrEqual(1);
      expect(rise / D).toBeLessThan(2.5);
    });
  }
});
