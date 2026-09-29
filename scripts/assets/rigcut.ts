/**
 * Codex parts sheets to the rig's part images and rig.json (docs/art-spec.md,
 * Phase H, "Character"; task HB7). The cut half of the rig pipeline:
 *
 *   npm run assets:rigcut -- [--out assets-src/character-rig] [--preview <dir>]
 *   npm run assets:rig -- --parts assets-src/character-rig --density 2
 *
 * It reads the five approved sheets in assets-src/approved/ (char-parts-side,
 * -front and -back, and the five-head sheets char-heads-side and -front),
 * splits each into its parts by connected regions, and for every part runs
 * the painted pipeline of `assets:prepare --painted` (soft key from the
 * sheet's alpha, Lanczos resize, hard alpha), then boosts the ink so the eye
 * pupils and outlines survive the downscale as solid dark pixels. Nothing
 * else in the painting is changed, except that the torso's placeholder neck
 * peg is cut away so the head's own neck shows through the collar.
 *
 * Then it lays each facing out as an assembled figure: every part gets an
 * integer joint (pivot) inside its image and a landmark for each child, from
 * the shape of the painted caps (the round ends drawn for overlap), and the
 * scale is searched so the side figure stands exactly 144 art px tall, 72
 * logical px at the front. It writes each part PNG in its facing's drawing
 * px, and a `rig.json` (`RigSource`, rigpack.ts) for `assets:rig`.
 *
 * The landmarks in the tables below are read off the picked candidates
 * (candidate 01 of each sheet); another candidate needs new numbers.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { RigFacing, RigPartId, RigPoint } from "../../src/engine/rigTypes";
import { keyOptions, prepare } from "./hd";
import {
  REPO_ROOT,
  alphaBounds,
  cliPath,
  createImage,
  fail,
  readImage,
  writePng,
  type Image,
  type Rect,
} from "./lib";
import { finishPainted } from "./painted";
import type { RigSource, RigSourcePart } from "./rigpack";

const APPROVED = join(REPO_ROOT, "assets-src/approved");
/** The standing height in art px (72 logical px at density 2). */
const FIGURE_HEIGHT = 144;

// --- Regions of a sheet -------------------------------------------------------------------

interface Region extends Rect {
  id: number;
  area: number;
}

interface Sheet {
  img: Image;
  /** Region id per pixel, 0 for none. */
  labels: Int32Array;
  regions: Region[];
}

/** Connected regions of pixels with alpha >= 40, 8-connected, big ones only. */
function labelSheet(img: Image, minArea = 800): Sheet {
  const { width: w, height: h, data } = img;
  const labels = new Int32Array(w * h);
  const regions: Region[] = [];
  let n = 0;
  for (let s = 0; s < w * h; s++) {
    if (labels[s] || data[s * 4 + 3] < 40) continue;
    n++;
    const stack = [s];
    labels[s] = n;
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    let area = 0;
    while (stack.length) {
      const p = stack.pop() as number;
      const x = p % w;
      const y = (p - x) / w;
      area++;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const q = yy * w + xx;
          if (!labels[q] && data[q * 4 + 3] >= 40) {
            labels[q] = n;
            stack.push(q);
          }
        }
      }
    }
    regions.push({
      id: n,
      x: x0,
      y: y0,
      w: x1 - x0 + 1,
      h: y1 - y0 + 1,
      area,
    });
  }
  return { img, labels, regions: regions.filter((r) => r.area >= minArea) };
}

/** The sheet with everything but region `id` made transparent. */
function isolate(sheet: Sheet, id: number): Image {
  const { img, labels } = sheet;
  const out: Image = { ...img, data: new Uint8ClampedArray(img.data) };
  for (let p = 0; p < labels.length; p++)
    if (labels[p] !== id) out.data.fill(0, p * 4, p * 4 + 4);
  return out;
}

const region = (sheet: Sheet, id: number): Region => {
  const r = sheet.regions.find((q) => q.id === id);
  if (!r) throw new Error(`the sheet has no region ${id}`);
  return r;
};

/** Mean brightness of a region's mid-tones: the far limb is painted darker. */
function brightness(sheet: Sheet, r: Region): number {
  let sum = 0;
  let n = 0;
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      const p = y * sheet.img.width + x;
      if (sheet.labels[p] !== r.id) continue;
      const d = sheet.img.data;
      const m = Math.max(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
      if (m < 40) continue;
      sum += d[p * 4] + d[p * 4 + 1] + d[p * 4 + 2];
      n++;
    }
  }
  return sum / Math.max(n, 1);
}

/** Left and right edge of a region's pixels on row `y`. */
function rowSpan(sheet: Sheet, r: Region, y: number): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (let x = r.x; x < r.x + r.w; x++) {
    if (sheet.labels[y * sheet.img.width + x] === r.id) {
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
  }
  return hi < lo ? null : [lo, hi];
}

// --- Landmarks ------------------------------------------------------------------------------

/**
 * A limb's two joints, in the sheet's px: `prox` at its top cap and `dist`
 * at its bottom cap. Each cap is drawn as a dome whose seam is the joint,
 * so the joint sits a fixed fraction of the shaft width from the end.
 */
function limbJoints(
  sheet: Sheet,
  r: Region,
): { prox: RigPoint; dist: RigPoint } {
  const widths: number[] = [];
  for (let y = r.y + Math.round(0.25 * r.h); y < r.y + 0.5 * r.h; y++) {
    const s = rowSpan(sheet, r, y);
    if (s) widths.push(s[1] - s[0] + 1);
  }
  widths.sort((a, b) => a - b);
  const w0 = widths[Math.floor(widths.length / 2)] ?? r.w;
  const at = (y: number): RigPoint => {
    const s = rowSpan(sheet, r, Math.round(y));
    return { x: s ? (s[0] + s[1]) / 2 : r.x + r.w / 2, y };
  };
  return {
    prox: at(r.y + 0.3 * w0),
    dist: at(r.y + r.h - 0.4 * w0),
  };
}

/** Centre of a region's row `y`. */
function centreAt(sheet: Sheet, r: Region, y: number): number {
  const s = rowSpan(sheet, r, y);
  return s ? (s[0] + s[1]) / 2 : r.x + r.w / 2;
}

// --- Ink ------------------------------------------------------------------------------------

const INK_MAX = 34;

/**
 * Downscaling turns a 20 px black pupil or a 10 px outline into a mid grey.
 * Every output pixel whose footprint in the raw crop is mostly ink (near
 * black) becomes solid ink, and a nearly opaque neighbourhood of ink keeps
 * the silhouette closed. Everything else is left as the resize made it.
 */
function boostInk(out: Image, raw: Image, crop: Rect): Image {
  const res: Image = { ...out, data: new Uint8ClampedArray(out.data) };
  const sx = crop.w / out.width;
  const sy = crop.h / out.height;
  for (let j = 0; j < out.height; j++) {
    for (let i = 0; i < out.width; i++) {
      const x0 = Math.floor(crop.x + i * sx);
      const x1 = Math.max(x0 + 1, Math.floor(crop.x + (i + 1) * sx));
      const y0 = Math.floor(crop.y + j * sy);
      const y1 = Math.max(y0 + 1, Math.floor(crop.y + (j + 1) * sy));
      let dark = 0;
      let opaque = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = (y * raw.width + x) * 4;
          if (raw.data[p + 3] < 128) continue;
          opaque++;
          if (
            Math.max(raw.data[p], raw.data[p + 1], raw.data[p + 2]) <= INK_MAX
          ) {
            dark++;
            r += raw.data[p];
            g += raw.data[p + 1];
            b += raw.data[p + 2];
          }
        }
      }
      const area = (x1 - x0) * (y1 - y0);
      const q = (j * out.width + i) * 4;
      const solid = dark / area >= 0.4;
      const inside =
        res.data[q + 3] === 255 &&
        dark / Math.max(opaque, 1) >= 0.5 &&
        dark / area >= 0.25;
      if (solid || inside) {
        res.data[q] = Math.round(r / dark);
        res.data[q + 1] = Math.round(g / dark);
        res.data[q + 2] = Math.round(b / dark);
        res.data[q + 3] = 255;
      }
    }
  }
  return res;
}

// --- One part image -------------------------------------------------------------------------

interface Cut {
  image: Image;
  /** The raw crop, so raw landmarks can be mapped into the image. */
  crop: Rect;
}

const PAD = 4;

/** Prepare (key, resize, hard alpha, ink) region `r` of `raw` at `scale`. */
async function cutPart(raw: Image, crop: Rect, scale: number): Promise<Cut> {
  const result = await prepare(raw, {
    kind: "sprite",
    crop,
    scale,
    key: keyOptions({}, "auto"),
  });
  const hard = finishPainted(result.image, { quantize: false }).image;
  return { image: boostInk(hard, raw, crop), crop };
}

const padded = (r: Rect, img: Image): Rect => {
  const x = Math.max(0, r.x - PAD);
  const y = Math.max(0, r.y - PAD);
  return {
    x,
    y,
    w: Math.min(img.width, r.x + r.w + PAD) - x,
    h: Math.min(img.height, r.y + r.h + PAD) - y,
  };
};

/** Raw sheet px to a point in the cut image. */
const mapTo = (cut: Cut, p: RigPoint): RigPoint => ({
  x: ((p.x - cut.crop.x) * cut.image.width) / cut.crop.w,
  y: ((p.y - cut.crop.y) * cut.image.height) / cut.crop.h,
});

// --- Facing tables --------------------------------------------------------------------------

type Limb = "upper-arm" | "forearm" | "thigh" | "shin";
const LIMBS: Limb[] = ["upper-arm", "forearm", "thigh", "shin"];
/**
 * The sheets draw MI3-long arms and short legs; the arms are scaled down and
 * the legs up so the hands reach mid-thigh and the legs are half the height.
 */
const LIMB_SCALE: Record<Limb, number> = {
  "upper-arm": 0.88,
  forearm: 0.88,
  thigh: 1.1,
  shin: 1.1,
};
/** Sheet px the front and back arms' shoulder joints sit inside the torso's edge. */
const SHOULDER_INSET = 40;

interface FacingSpec {
  sheet: string;
  /** Region ids of the torso, and per limb [r, l] (side: sorted by brightness). */
  torso: number;
  limbs: Record<Limb, [number, number]>;
  /** The head: a region of the parts sheet, or the heads sheet's file. */
  head: { sheet: string } | { region: number };
  /** Torso landmarks in sheet px. */
  hip: RigPoint;
  hipHalf: number;
  shoulder: { r: RigPoint; l: RigPoint } | "auto";
  neck: RigPoint;
  /** Ellipse (centre, semi-axes) of the peg to cut from the torso, if any. */
  peg?: { cx: number; cy: number; a: number; b: number };
  /** Base scales: body (sheet px to art px) and head. */
  body: number;
  headScale: number;
  /** Art px of the head's neck hidden under the collar. */
  tuck: number;
  /** Draw order, back to front. */
  order: RigPartId[];
  /** Nudge of the whole head, in art px. */
  headNudge?: RigPoint;
}

const ORDER_SIDE: RigPartId[] = [
  "forearm-l",
  "upper-arm-l",
  "shin-l",
  "thigh-l",
  "head",
  "shin-r",
  "thigh-r",
  "torso",
  "forearm-r",
  "upper-arm-r",
];
const ORDER_FRONT: RigPartId[] = [
  "shin-r",
  "thigh-r",
  "shin-l",
  "thigh-l",
  "head",
  "torso",
  "forearm-r",
  "upper-arm-r",
  "forearm-l",
  "upper-arm-l",
];

const SPECS: Record<RigFacing, FacingSpec> = {
  side: {
    sheet: "char-parts-side@hd.webp",
    torso: 1,
    limbs: {
      "upper-arm": [3, 4],
      forearm: [5, 6],
      thigh: [8, 9],
      shin: [7, 10],
    },
    head: { sheet: "char-heads-side@hd.webp" },
    hip: { x: 613, y: 446 },
    hipHalf: 0,
    shoulder: { r: { x: 613, y: 150 }, l: { x: 613, y: 150 } },
    neck: { x: 606, y: 100 },
    peg: { cx: 607, cy: 72, a: 52, b: 24 },
    body: 0.118,
    headScale: 0.0967,
    tuck: 5,
    order: ORDER_SIDE,
  },
  front: {
    sheet: "char-parts-front@hd.webp",
    torso: 1,
    limbs: {
      "upper-arm": [3, 2],
      forearm: [4, 5],
      thigh: [7, 8],
      shin: [9, 10],
    },
    head: { sheet: "char-heads-front@hd.webp" },
    hip: { x: 732, y: 446 },
    hipHalf: 85,
    shoulder: "auto",
    neck: { x: 735, y: 114 },
    peg: { cx: 735, cy: 90, a: 54, b: 22 },
    body: 0.1291,
    headScale: 0.0753,
    tuck: 5,
    order: ORDER_FRONT,
  },
  back: {
    sheet: "char-parts-back@hd.webp",
    torso: 4,
    limbs: {
      "upper-arm": [2, 3],
      forearm: [6, 5],
      thigh: [8, 7],
      shin: [10, 9],
    },
    head: { region: 1 },
    hip: { x: 513, y: 745 },
    hipHalf: 90,
    shoulder: "auto",
    neck: { x: 513, y: 358 },
    body: 0.1264,
    headScale: 0.1264,
    tuck: 5,
    order: ORDER_FRONT,
  },
};

// --- Assembly -------------------------------------------------------------------------------

interface BuiltPart {
  id: RigPartId;
  image: Image;
  /** The joint inside the image, whole px. */
  pivot: RigPoint;
  /** Where each child's joint sits inside the image, whole px. */
  marks: Partial<Record<RigPartId, RigPoint>>;
  variants: Record<string, Image>;
}

const round = (p: RigPoint): RigPoint => ({
  x: Math.round(p.x),
  y: Math.round(p.y),
});

const PARENT: Record<RigPartId, RigPartId | null> = {
  torso: null,
  head: "torso",
  "upper-arm-r": "torso",
  "upper-arm-l": "torso",
  "forearm-r": "upper-arm-r",
  "forearm-l": "upper-arm-l",
  "thigh-r": "torso",
  "thigh-l": "torso",
  "shin-r": "thigh-r",
  "shin-l": "thigh-l",
};

/** The peg cut from the torso's raw image. */
function cutPeg(raw: Image, p: NonNullable<FacingSpec["peg"]>): void {
  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) {
      const dx = x - p.cx;
      const ax = Math.abs(dx);
      if (ax > p.a + 12) continue;
      const limit =
        ax <= p.a ? p.cy + p.b * Math.sqrt(1 - (dx / p.a) ** 2) : p.cy;
      if (y < limit)
        raw.data.fill(0, (y * raw.width + x) * 4, (y * raw.width + x) * 4 + 4);
    }
  }
}

/**
 * The best whole-px shift of `v` onto `base` (both regions of one sheet),
 * from the hair and forehead where the heads don't differ.
 */
function alignShift(sheet: Sheet, base: Region, v: Region): RigPoint {
  const { data, width } = sheet.img;
  const rows = Math.floor(base.h * 0.4);
  let best = { x: v.x - base.x, y: v.y - base.y };
  let bestScore = Infinity;
  const gx = v.x - base.x;
  const gy = v.y - base.y;
  for (let dy = gy - 6; dy <= gy + 6; dy++) {
    for (let dx = gx - 6; dx <= gx + 6; dx++) {
      let sum = 0;
      let n = 0;
      for (let y = 0; y < rows; y += 2) {
        for (let x = 0; x < base.w; x += 2) {
          const p = ((base.y + y) * width + base.x + x) * 4;
          const q = ((base.y + y + dy) * width + base.x + x + dx) * 4;
          if (data[p + 3] < 200 || data[q + 3] < 200) continue;
          sum +=
            Math.abs(data[p] - data[q]) +
            Math.abs(data[p + 1] - data[q + 1]) +
            Math.abs(data[p + 2] - data[q + 2]);
          n++;
        }
      }
      const score = n < 50 ? Infinity : sum / n;
      if (score < bestScore) {
        bestScore = score;
        best = { x: dx, y: dy };
      }
    }
  }
  return best;
}

/**
 * The head sheets show, left to right: closed (the rest head), open, wide,
 * O, and the blink. The animator's mouth shapes (rig/animator.ts) are
 * talk-1 for a, e, i (wide), talk-2 for o, u, w (O), and talk-3 for the
 * other consonants (half open).
 */
const MOUTHS = [
  ["talk-1", 2],
  ["talk-2", 3],
  ["talk-3", 1],
  ["blink", 4],
] as const;

async function buildFacing(
  facing: RigFacing,
  s: number,
  write: ((file: string, img: Image) => Promise<void>) | null,
  cache: Map<string, Sheet>,
): Promise<{
  source: RigSource["facings"][RigFacing];
  height: number;
  parts: Map<RigPartId, { image: Image; off: RigPoint }>;
}> {
  const spec = SPECS[facing];
  const load = async (name: string): Promise<Sheet> => {
    let sheet = cache.get(name);
    if (!sheet) {
      sheet = labelSheet(await readImage(join(APPROVED, name)));
      cache.set(name, sheet);
    }
    return sheet;
  };
  const sheet = await load(spec.sheet);
  const kb = spec.body * s;
  const kh = spec.headScale * s;

  const built = new Map<RigPartId, BuiltPart>();

  // Torso.
  const tr = region(sheet, spec.torso);
  const torsoRaw = isolate(sheet, spec.torso);
  if (spec.peg) cutPeg(torsoRaw, spec.peg);
  const tCut = await cutPart(torsoRaw, padded(tr, torsoRaw), kb);
  const sh =
    spec.shoulder === "auto"
      ? (() => {
          const y = tr.y + (facing === "front" ? 105 : 92);
          const [lo, hi] = rowSpan(sheet, tr, y) as [number, number];
          return {
            r: {
              x: facing === "front" ? lo + SHOULDER_INSET : hi - SHOULDER_INSET,
              y,
            },
            l: {
              x: facing === "front" ? hi - SHOULDER_INSET : lo + SHOULDER_INSET,
              y,
            },
          };
        })()
      : spec.shoulder;
  built.set("torso", {
    id: "torso",
    image: tCut.image,
    pivot: round(mapTo(tCut, spec.hip)),
    marks: {
      "thigh-r": round(
        mapTo(tCut, { x: spec.hip.x - spec.hipHalf, y: spec.hip.y }),
      ),
      "thigh-l": round(
        mapTo(tCut, { x: spec.hip.x + spec.hipHalf, y: spec.hip.y }),
      ),
      "upper-arm-r": round(mapTo(tCut, sh.r)),
      "upper-arm-l": round(mapTo(tCut, sh.l)),
      head: round(mapTo(tCut, spec.neck)),
    },
    variants: {},
  });

  // Limbs.
  const pair = (limb: Limb): [Region, Region] => {
    const [a, b] = spec.limbs[limb].map((id) => region(sheet, id));
    if (facing !== "side") return [a, b];
    // In the side view the near limb (r) is the brighter one.
    return brightness(sheet, a) >= brightness(sheet, b) ? [a, b] : [b, a];
  };
  for (const limb of LIMBS) {
    const [rr, ll] = pair(limb);
    for (const [side, r] of [
      ["r", rr],
      ["l", ll],
    ] as const) {
      const id = `${limb}-${side}` as RigPartId;
      const raw = isolate(sheet, r.id);
      const cut = await cutPart(raw, padded(r, raw), kb * LIMB_SCALE[limb]);
      const j = limbJoints(sheet, r);
      const marks: BuiltPart["marks"] = {};
      const child: Partial<Record<Limb, RigPartId>> = {
        "upper-arm": `forearm-${side}`,
        thigh: `shin-${side}`,
      };
      const c = child[limb];
      if (c) marks[c] = round(mapTo(cut, j.dist));
      built.set(id, {
        id,
        image: cut.image,
        pivot: round(mapTo(cut, j.prox)),
        marks,
        variants: {},
      });
    }
  }

  // Head.
  {
    const variants: Record<string, Image> = {};
    let restCut: Cut;
    let pivot: RigPoint;
    if ("region" in spec.head) {
      const r = region(sheet, spec.head.region);
      const raw = isolate(sheet, r.id);
      restCut = await cutPart(raw, padded(r, raw), kh);
      const yb = r.y + r.h;
      pivot = mapTo(restCut, {
        x: centreAt(sheet, r, yb - 30),
        y: yb - spec.tuck / kh,
      });
    } else {
      const hs = await load(spec.head.sheet);
      const regs = [...hs.regions].sort((a, b) => a.x - b.x);
      const base = regs[0];
      const box = padded(base, hs.img);
      const raw0 = isolate(hs, base.id);
      restCut = await cutPart(raw0, box, kh);
      const yb = base.y + base.h;
      pivot = mapTo(restCut, {
        x: centreAt(hs, base, yb - 30),
        y: yb - spec.tuck / kh,
      });
      for (const [name, at] of MOUTHS) {
        const v = regs[at];
        const d = alignShift(hs, base, v);
        const vbox = { ...box, x: box.x + d.x, y: box.y + d.y };
        const vraw = isolate(hs, v.id);
        variants[name] = (await cutPart(vraw, vbox, kh)).image;
      }
    }
    built.set("head", {
      id: "head",
      image: restCut.image,
      pivot: round(pivot),
      marks: {},
      variants,
    });
  }

  // Joints in the drawing: the torso's is the origin.
  const joint = new Map<RigPartId, RigPoint>([["torso", { x: 0, y: 0 }]]);
  const place = (id: RigPartId): RigPoint => {
    const known = joint.get(id);
    if (known) return known;
    const parent = PARENT[id] as RigPartId;
    const pp = built.get(parent) as BuiltPart;
    const mark = pp.marks[id] as RigPoint;
    const pj = place(parent);
    const j = {
      x: pj.x + mark.x - pp.pivot.x,
      y: pj.y + mark.y - pp.pivot.y,
    };
    joint.set(id, j);
    return j;
  };
  const nudge = spec.headNudge ?? { x: 0, y: 0 };
  const parts = new Map<RigPartId, { image: Image; off: RigPoint }>();
  let top = Infinity;
  let sole = -Infinity;
  for (const [id, b] of built) {
    const j = place(id);
    const jn = id === "head" ? { x: j.x + nudge.x, y: j.y + nudge.y } : j;
    joint.set(id, jn);
    const off = { x: jn.x - b.pivot.x, y: jn.y - b.pivot.y };
    parts.set(id, { image: b.image, off });
    const bb = alphaBounds(b.image, 1) as Rect;
    top = Math.min(top, off.y + bb.y);
    if (id === "shin-l" || id === "shin-r")
      sole = Math.max(sole, off.y + bb.y + bb.h);
  }
  const height = sole - top;

  const files: RigSource["facings"][RigFacing]["parts"] = {} as never;
  const z = new Map(spec.order.map((id, i) => [id, i]));
  for (const [id, b] of built) {
    const { off } = parts.get(id) as { off: RigPoint };
    const j = joint.get(id) as RigPoint;
    const dir = `${facing}/${id}`;
    const entry: RigSourcePart = {
      file: `${dir}.png`,
      offset: off,
      pivot: j,
      z: z.get(id) as number,
    };
    if (PARENT[id]) entry.parent = PARENT[id] as RigPartId;
    if (write) await write(entry.file, b.image);
    const names = Object.keys(b.variants);
    if (names.length) {
      entry.variants = {};
      for (const name of names) {
        const file = `${dir}-${name}.png`;
        entry.variants[name] = { file, offset: off };
        if (write) await write(file, b.variants[name]);
      }
    }
    files[id] = entry;
  }
  return {
    source: { feet: { x: 0, y: sole }, parts: files },
    height,
    parts,
  };
}

/** A rest-pose picture of one facing, for checking the joints. */
function restPicture(
  parts: Map<RigPartId, { image: Image; off: RigPoint }>,
  order: RigPartId[],
  feet: RigPoint,
): Image {
  const pad = 8;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const { image, off } of parts.values()) {
    x0 = Math.min(x0, off.x);
    y0 = Math.min(y0, off.y);
    x1 = Math.max(x1, off.x + image.width);
    y1 = Math.max(y1, off.y + image.height);
  }
  const out = createImage(
    x1 - x0 + 2 * pad,
    y1 - y0 + 2 * pad,
    [111, 126, 116],
  );
  for (const id of order) {
    const { image, off } = parts.get(id) as { image: Image; off: RigPoint };
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const p = (y * image.width + x) * 4;
        if (image.data[p + 3] === 0) continue;
        const q =
          ((off.y + y - y0 + pad) * out.width + off.x + x - x0 + pad) * 4;
        out.data.set(image.data.subarray(p, p + 4), q);
      }
    }
  }
  const fx = Math.round(feet.x - x0 + pad);
  const fy = Math.round(feet.y - y0 + pad);
  for (let k = -3; k <= 3; k++) {
    if (fx + k >= 0 && fx + k < out.width && fy < out.height)
      out.data.set([255, 0, 255, 255], (fy * out.width + fx + k) * 4);
  }
  return out;
}

async function main() {
  const { values } = parseArgs({
    options: { out: { type: "string" }, preview: { type: "string" } },
  });
  const outDir = values.out
    ? cliPath(values.out)
    : join(REPO_ROOT, "assets-src/character-rig");
  const cache = new Map<string, Sheet>();

  // Each facing's scale, so it stands exactly 144 art px tall.
  const scales = {} as Record<RigFacing, number>;
  for (const facing of ["side", "front", "back"] as const) {
    let scale = 1;
    let best = { scale, miss: Infinity };
    for (let i = 0; i < 14 && best.miss > 0; i++) {
      const { height } = await buildFacing(facing, scale, null, cache);
      const miss = Math.abs(height - FIGURE_HEIGHT);
      if (miss < best.miss) best = { scale, miss };
      // Converge, then feel around the last whole-pixel step.
      scale *=
        i < 4 ? FIGURE_HEIGHT / height : 1 + (i % 2 ? 1 : -1) * 0.002 * (i - 3);
    }
    scales[facing] = best.scale;
    console.log(
      `${facing}: scale ${best.scale.toFixed(4)}, ${FIGURE_HEIGHT + (best.miss ? "±" + best.miss : "")}`,
    );
  }

  mkdirSync(outDir, { recursive: true });
  const write = async (file: string, img: Image) =>
    writePng(join(outDir, file), img);
  const source = { facings: {} } as unknown as RigSource;
  for (const facing of ["side", "front", "back"] as const) {
    const built = await buildFacing(facing, scales[facing], write, cache);
    source.facings[facing] = built.source;
    console.log(`${facing}: ${built.height} px tall`);
    if (values.preview) {
      const pic = restPicture(
        built.parts,
        SPECS[facing].order,
        built.source.feet,
      );
      await writePng(join(cliPath(values.preview), `rest-${facing}.png`), pic);
    }
  }
  writeFileSync(
    join(outDir, "rig.json"),
    `${JSON.stringify(source, null, 2)}\n`,
  );
  console.log(outDir);
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
