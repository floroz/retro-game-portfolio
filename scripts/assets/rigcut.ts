/**
 * Codex parts sheets to the rig's part images and rig.json (docs/art-spec.md,
 * Phase H, "Character"; tasks HB7 and HR1). The cut half of the rig pipeline:
 *
 *   npm run assets:rigcut -- [--out assets-src/character-rig] [--preview <dir>]
 *   npm run assets:rig -- --parts assets-src/character-rig --density 2
 *
 * It reads the five approved sheets in assets-src/approved/ (char-parts-side,
 * -front and -back, and the five-head sheets char-heads-side and -front) and
 * paints every part straight in its facing's drawing px (144 px tall, 72
 * logical px), from a body model (`M`) that all three facings share, so the
 * arms, legs and torso are the same size from every side. The sheets supply
 * the painting: fills, folds, the cuffs, hem, pockets, and the faces. Their
 * silhouettes are replaced (rigpaint.ts):
 *
 * - limbs are tubes with round joint caps and a taper, sampled from the
 *   sheet's clean shaft rows, so the sheet's own dome-and-seam caps never
 *   show as lines at a knee, elbow or shoulder;
 * - the torso is a sloped-shoulder polygon, sampled from the sheet's body;
 * - hands are drawn by hand (`HANDS`), relaxed and mitten-simple, because a
 *   painted finger is a claw at 7 px;
 * - each part gets one 1 px ink ring except in its open joint-end zones, and
 *   the renderer rings the posed union (rig/draw.ts).
 *
 * The sheet regions and raw rows below are read off the picked candidates
 * (candidate 01 of each sheet); another candidate needs new numbers.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { RigFacing, RigPartId, RigPoint } from "../../src/engine/rigTypes";
import {
  REPO_ROOT,
  cliPath,
  createImage,
  fail,
  readImage,
  writePng,
  type Image,
  type Rect,
} from "./lib";
import {
  analyseSpans,
  createBuf,
  finish,
  inPolygon,
  inTube,
  paintElement,
  paintProc,
  rimLight,
  liftDetail,
  tubeCentre,
  tidySilhouette,
  tone,
  toImage,
  tubeMap,
  type Buf,
  type Element,
  type Rgb,
  type Spans,
  type TubeShape,
} from "./rigpaint";
import type { RigSource, RigSourcePart } from "./rigpack";

const APPROVED = join(REPO_ROOT, "assets-src/approved");

// --- The body model ---------------------------------------------------------------------------

/**
 * Every facing's body, in px above the soles (drawing px are y down, so
 * `-Y`). Head-heavy in the MI3 way: the head is 25.5 of 144 (1/5.65); the
 * sweater's hem is at 45% of his height with a long torso above it; the hands
 * end on the thigh. The arms leave the shoulders 1 to 2 px clear of the torso
 * (front and back), so they read as limbs and not as part of a block.
 */
const M = {
  top: 144,
  chin: 118.5,
  /** The torso's top edge at the neck. */
  neck: 119,
  /** The arms' joint: just under the shoulder line. */
  shoulder: 107,
  elbow: 84,
  wrist: 69,
  hip: 68,
  /** The bottom of the sweater. */
  hem: 65,
  knee: 34,
  /** Where the jeans end on the shoe. */
  jeansEnd: 5.5,
  /** The x of the arms' and legs' joints (front and back). */
  armX: 16,
  legX: 7,
  /** Widths (full) of the limbs, top to bottom. */
  upperArm: [7, 7],
  forearm: [7, 5.6],
  thigh: [12, 12],
  shin: [12, 10, 10],
  /** Sleeve tone against the torso, and the lit rim on a limb's left edge. */
  sleeve: 1.22,
  rim: 1.75,
} as const;

const Yd = (up: number) => -up;

// --- Regions of a sheet -------------------------------------------------------------------------

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

// --- Hands ----------------------------------------------------------------------------------------

/** Skin ramp, sampled from the sheets' hands. */
const SKIN: Rgb = [244, 176, 112];
const SKIN_SHADE: Rgb = [214, 140, 88];
const CREAM: Rgb = [238, 228, 208];
const CREAM_SHADE: Rgb = [206, 194, 172];

/**
 * A hanging hand, top row under the cuff. `#` skin, `d` shade, `k` ink
 * detail (a thumb crease). The outline is added by the ring, so only the
 * silhouette and the few interior marks are drawn here. The thumb is on the
 * right; the left hand is the mirror.
 */
const HAND_FRONT = [
  "..#####..",
  ".#######.",
  "#########",
  "######d##",
  "######d##",
  ".#####d##",
  ".#####d#.",
  ".######..",
  ".#d#d##..",
  ".#d#d##..",
  "..#####..",
  "...###...",
];
const HAND_BACK = HAND_FRONT;
const HAND_SIDE = [
  "..####...",
  ".######..",
  ".#######.",
  ".######d#",
  ".######d#",
  ".#####d##",
  ".#####d#.",
  ".######..",
  ".#d#d##..",
  ".#d#d#...",
  "..#####..",
  "...###...",
];

interface HandSpec {
  rows: readonly string[];
  /** Mirror so the thumb is on the left. */
  flip: boolean;
  /** Drawing px of the top-left of the hand. */
  x: number;
  y: number;
}

function paintHand(b: Buf, id: number, h: HandSpec): void {
  const w = h.rows[0].length;
  paintProc(b, id, (x, y) => {
    const c = Math.floor(x - h.x);
    const r = Math.floor(y - h.y);
    if (r < 0 || r >= h.rows.length || c < 0 || c >= w) return null;
    const ch = h.rows[r][h.flip ? w - 1 - c : c];
    if (ch === "#") return SKIN;
    if (ch === "d") return SKIN_SHADE;
    if (ch === "k") return "ink";
    return null;
  });
}

// --- Facing tables ------------------------------------------------------------------------------

type Limb = "upper-arm" | "forearm" | "thigh" | "shin";
const LIMBS: Limb[] = ["upper-arm", "forearm", "thigh", "shin"];

interface RowSpec {
  /** Sheet rows stretched over the tube. */
  rows: [number, number];
  /** Clamp the sampled rows, to skip a drawn cap. */
  clamp?: [number, number];
}

interface FacingSpec {
  sheet: string;
  /** Region ids of the torso, and per limb [r, l] (side: sorted by brightness). */
  torso: number;
  limbs: Record<Limb, [number, number]>;
  /** The head: a region of the parts sheet, or the heads sheet's file. */
  head: { sheet: string } | { region: number };
  /** Torso body rows in the sheet (collar top to hem bottom) and a clean row for its width. */
  torsoRows: [number, number];
  torsoWidthRow: number;
  /** Tube rows per limb. */
  tubes: Record<Limb, RowSpec>;
  /** Shoe: sheet rows from which the shoe is cut. */
  shoeFrom: number;
  /** x of each part's joints: r and l (screen x). */
  armX: [number, number];
  legX: [number, number];
  /** How far the upper arm and forearm lean by their far ends: outwards, or forwards in the side view (px). */
  lean: [number, number];
  /** Draw order, back to front. */
  order: RigPartId[];
  /** Head: the chin's row in the sheet, the neck's centre column (from the head region's left), and its x. */
  headAt: { chinY: number; neckX: number; x: number; pad?: number };
  /** Neck stub kept below the chin, in art px. */
  neckKeep: number;
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
    torsoRows: [96, 445],
    torsoWidthRow: 300,
    tubes: {
      "upper-arm": { rows: [165, 400] },
      forearm: { rows: [205, 362] },
      thigh: { rows: [600, 770] },
      shin: { rows: [545, 725] },
    },
    shoeFrom: 735,
    armX: [0, 0],
    legX: [0, 0],
    lean: [1, 1.5],
    order: ORDER_SIDE,
    headAt: { chinY: 598, neckX: 155, x: -0.5, pad: 8 },
    neckKeep: 2.5,
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
    torsoRows: [105, 448],
    torsoWidthRow: 320,
    tubes: {
      "upper-arm": { rows: [200, 395] },
      forearm: { rows: [175, 400] },
      thigh: { rows: [630, 845] },
      shin: { rows: [640, 835] },
    },
    shoeFrom: 850,
    armX: [-M.armX, M.armX],
    legX: [-M.legX, M.legX],
    lean: [1, 0.8],
    order: ORDER_FRONT,
    headAt: { chinY: 528, neckX: 182, x: 0 },
    neckKeep: 5,
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
    torsoRows: [358, 752],
    torsoWidthRow: 600,
    tubes: {
      "upper-arm": { rows: [205, 400] },
      forearm: { rows: [505, 697] },
      thigh: { rows: [777, 1090], clamp: [840, 1090] },
      shin: { rows: [1140, 1390] },
    },
    shoeFrom: 1402,
    armX: [M.armX, -M.armX],
    legX: [M.legX, -M.legX],
    lean: [1, 0.8],
    order: [
      "shin-r",
      "thigh-r",
      "shin-l",
      "thigh-l",
      "torso",
      "head",
      "forearm-r",
      "upper-arm-r",
      "forearm-l",
      "upper-arm-l",
    ],
    headAt: { chinY: 268, neckX: 99, x: 0 },
    neckKeep: 3,
  },
};

// --- Assembly ---------------------------------------------------------------------------------------

interface Built {
  image: Image;
  /** Top-left in the drawing, whole px. */
  offset: RigPoint;
  /** The joint, in the drawing. */
  pivot: RigPoint;
  variants: Record<string, Image>;
}

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

/** The polygon of a symmetric shape from its right half, top to bottom. */
function symmetric(
  right: readonly (readonly [number, number])[],
): [number, number][] {
  return [
    ...right.map(([x, y]) => [x, y] as [number, number]),
    ...[...right].reverse().map(([x, y]) => [-x, y] as [number, number]),
  ];
}

/** Sheet colours the procedural bits share. */
const ID = { base: 1, shoe: 2, hand: 3, detail: 4 } as const;

interface Ctx {
  facing: RigFacing;
  spec: FacingSpec;
  sheet: Sheet;
}

/** +1 if the arm's outside is towards +x (or forwards, in the side view), else -1. */
const outward = (spec: FacingSpec, side: number) =>
  spec.armX[side] === 0 ? 1 : Math.sign(spec.armX[side]);

/** Where a limb's joint is, in the drawing. */
function jointOf(id: RigPartId, spec: FacingSpec): RigPoint {
  const side = id.endsWith("-r") ? 0 : 1;
  switch (id) {
    case "torso":
      return { x: 0, y: Yd(M.hip) };
    case "head":
      return { x: 0, y: Yd(M.neck - 5) };
    case "upper-arm-r":
    case "upper-arm-l":
      return { x: spec.armX[side], y: Yd(M.shoulder) };
    case "forearm-r":
    case "forearm-l":
      return {
        x: spec.armX[side] + outward(spec, side) * spec.lean[0],
        y: Yd(M.elbow),
      };
    case "thigh-r":
    case "thigh-l":
      return { x: spec.legX[side], y: Yd(M.hip) };
    case "shin-r":
    case "shin-l":
      return { x: spec.legX[side], y: Yd(M.knee) };
  }
}

const boxFor = (cx: number, w: number, yTop: number, yBot: number) => {
  const x0 = Math.floor(cx - w / 2) - 3;
  const y0 = Math.floor(yTop) - 2;
  return createBuf(x0, y0, Math.ceil(w) + 6, Math.ceil(yBot) - y0 + 3);
};

function widthsOf(top: number, bot: number, yTop: number, yBot: number) {
  return [
    [yTop, top],
    [yBot, bot],
  ] as const;
}

/** Paints a tube part (a limb) and returns it. */
function limbPart(
  ctx: Ctx,
  id: RigPartId,
  limb: Limb,
  region_: Region,
  raw: Image,
): Built {
  const { spec, facing } = ctx;
  const side = id.endsWith("-r") ? 0 : 1;
  const joint = jointOf(id, spec);
  const cx = joint.x;
  const spans = analyseSpans(raw);
  const rows = spec.tubes[limb];
  const [wa, wb] = limbWidths(limb);
  let tube: TubeShape;
  let open: (x: number, y: number) => boolean;
  let buf: Buf;
  const before: ((b: Buf) => void)[] = [];
  let contour = false;
  switch (limb) {
    case "upper-arm": {
      const R = wa / 2;
      const yTop = Yd(M.shoulder) - R;
      const yBot = Yd(M.elbow) + wb / 2;
      const lean = leaned(
        cx,
        Yd(M.shoulder),
        (outward(spec, side) * spec.lean[0]) / (M.shoulder - M.elbow),
        yTop,
        yBot,
      );
      tube = {
        ...lean,
        yTop,
        yBot,
        widths: widthsOf(wa, wb, yTop, yBot),
        capTop: R,
        capBot: wb / 2,
      };
      open = (_x, y) => y < Yd(M.shoulder) || y > Yd(M.elbow);
      buf = boxFor(
        cx + (lean.dx ?? 0) / 2,
        wa + Math.abs(lean.dx ?? 0),
        yTop,
        yBot,
      );
      break;
    }
    case "forearm": {
      const R = wa / 2;
      const yTop = Yd(M.elbow) - R;
      const yBot = Yd(M.wrist) + 1;
      const o = outward(spec, side);
      const lean = leaned(
        cx,
        Yd(M.elbow),
        (o * spec.lean[1]) / (M.elbow - M.wrist),
        yTop,
        yBot,
      );
      tube = {
        ...lean,
        yTop,
        yBot,
        widths: [
          [yTop, wa],
          [Yd(M.wrist + 10), wb + 0.4],
          [yBot, wb],
        ],
        capTop: R,
        capBot: 0,
      };
      open = (_x, y) => y < Yd(M.elbow);
      buf = boxFor(cx, 16, yTop, yBot + 14);
      // The hand hangs under the cuff.
      const hand = handFor(facing, side);
      const wristX = tubeCentre(tube, Yd(M.wrist));
      before.push((b) =>
        paintHand(b, ID.hand, {
          rows: hand.rows,
          flip: hand.flip,
          x: Math.round(wristX - hand.rows[0].length / 2 + hand.dx),
          y: Yd(M.wrist) - 1,
        }),
      );
      break;
    }
    case "thigh": {
      const R = wa / 2;
      const yTop = Yd(M.hip) - R;
      const yBot = Yd(M.knee) + wb / 2;
      tube = {
        cx,
        yTop,
        yBot,
        widths: widthsOf(wa, wb, yTop, yBot),
        capTop: R,
        capBot: wb / 2,
      };
      open = (_x, y) => y < Yd(M.hip) || y > Yd(M.knee);
      buf = boxFor(cx, wa, yTop, yBot);
      break;
    }
    case "shin": {
      const yTop = Yd(M.knee) - M.shin[0] / 2;
      const yBot = Yd(M.jeansEnd);
      tube = {
        cx,
        yTop,
        yBot,
        widths: [
          [yTop, M.shin[0]],
          [Yd(27), M.shin[0]],
          [Yd(21), M.shin[1]],
          [yBot, M.shin[2]],
        ],
        capTop: M.shin[0] / 2,
        capBot: 0,
      };
      open = (_x, y) => y < Yd(M.knee);
      buf = boxFor(cx, 26, yTop, 2);
      contour = true;
      before.push((b) => paintShoe(ctx, b, region_, raw, spans, cx, side));
      break;
    }
  }
  for (const f of before) f(buf);
  const el: Element = {
    id: ID.base,
    raw,
    map: tubeMap(tube, spans, rows.rows, rows.clamp),
    inside: (x, y) => inTube(tube, x, y),
    contour,
  };
  paintElement(buf, el);
  const arm = limb === "upper-arm" || limb === "forearm";
  // A sleeve reads a little lighter than the body it hangs in front of.
  if (arm) tone(buf, () => true, M.sleeve, ID.base);
  if (limb === "forearm") {
    // A rib cuff under a shadow line.
    tone(buf, (_x, y) => y > Yd(M.wrist + 1.5) && y <= Yd(M.wrist - 1), 1.12);
    tone(buf, (_x, y) => y > Yd(M.wrist + 2.5) && y <= Yd(M.wrist + 1.5), 0.55);
  }
  finish(buf, { open, despeckle: true, contour: contour ? [ID.base] : [] });
  // ... and has a lit edge, so it is seen against the dark sweater.
  if (arm) rimLight(buf, M.rim, ID.base);
  return {
    image: toImage(buf),
    offset: { x: buf.x0, y: buf.y0 },
    pivot: joint,
    variants: {},
  };
}

/** A tube leaning `slope` px of x per px of y through (`jx`, `jy`), from `yTop` to `yBot`. */
function leaned(
  jx: number,
  jy: number,
  slope: number,
  yTop: number,
  yBot: number,
): { cx: number; dx: number } {
  return { cx: jx + slope * (yTop - jy), dx: slope * (yBot - yTop) };
}

function limbWidths(limb: Limb): [number, number] {
  switch (limb) {
    case "upper-arm":
      return [M.upperArm[0], M.upperArm[1]];
    case "forearm":
      return [M.forearm[0], M.forearm[1]];
    case "thigh":
      return [M.thigh[0], M.thigh[1]];
    case "shin":
      return [M.shin[0], M.shin[2]];
  }
}

function handFor(facing: RigFacing, side: number) {
  // Screen side of each hand: the thumb faces the body.
  const rightOnLeft =
    facing === "front" ? side === 0 : facing === "back" ? side === 1 : true;
  return {
    rows:
      facing === "front"
        ? HAND_FRONT
        : facing === "back"
          ? HAND_BACK
          : HAND_SIDE,
    // Thumb on the right by default; a hand on the screen-right flips it.
    flip: facing === "side" ? false : !rightOnLeft,
    dx: 0,
  };
}

const SHOE_SCALE = 0.1;

/** The shoe, cut from the sheet's shin region below `shoeFrom`. */
function paintShoe(
  ctx: Ctx,
  b: Buf,
  r: Region,
  raw: Image,
  spans: Spans,
  cx: number,
  side: number,
): void {
  const { spec, facing } = ctx;
  const row = Math.min(
    spec.tubes.shin.rows[1],
    spans.y0 + spans.centre.length - 1,
  );
  const legCentre = spans.centre[row];
  const bottom = r.y + r.h;
  // The shoe of the near or far foot points a little outwards in front/back.
  const out =
    facing === "side"
      ? 0
      : (side === 0 ? -1 : 1) * (facing === "front" ? 0.5 : 0.3);
  const shoe: Element = {
    id: ID.shoe,
    raw,
    map: (x, y) => [
      legCentre + (x - cx - out) / SHOE_SCALE,
      bottom + (y - 0) / SHOE_SCALE,
    ],
    source: (_sx, sy) => sy >= spec.shoeFrom,
    edgeNoInk: 1,
  };
  paintElement(b, shoe);
  tidySilhouette(b, [ID.shoe]);
}

// --- Torso ------------------------------------------------------------------------------------------

/** The neckline's height (px above the soles) at `u` (0 centre, 1 the side of the neck). */
function necklineY(facing: RigFacing, u: number): number {
  const dip = facing === "front" ? 115.3 : 116;
  const edge = M.neck - (facing === "front" ? 1.2 : 1.8);
  return dip + (edge - dip) * u * u;
}

/** The torso's outline, right half from the neck down (drawing px), per facing. */
function torsoOutline(facing: RigFacing): [number, number][] {
  if (facing === "side") {
    // Chest forward (+x), back behind; a round sweater.
    return [
      [-5.5, -119.5],
      [-9, -115.5],
      [-11, -110],
      [-11.5, -98],
      [-10.5, Yd(M.hem + 12)],
      [-11.5, Yd(M.hem + 2)],
      [-11, Yd(M.hem)],
      [10.5, Yd(M.hem)],
      [12, Yd(M.hem + 2)],
      [12, Yd(M.hem + 15)],
      [12, -100],
      [10.5, -109],
      [7.5, -114.5],
      [4.5, -116.3],
      [2, -117],
    ];
  }
  const neck = facing === "front" ? 5.2 : 5.6;
  const pts: [number, number][] = [];
  // The neckline: a U, deeper at the front.
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push([neck * u, Yd(necklineY(facing, u))]);
  }
  // Sloped shoulders (the sleeves start under their tips), a narrower chest
  // so the arms can hang clear of it, a bloused hem.
  const right: [number, number][] = [
    ...pts,
    [neck + 1.2, Yd(M.neck - 0.8)],
    [10, Yd(114.6)],
    [14, Yd(110.6)],
    [14.4, Yd(107)],
    [13.6, Yd(104)],
    [11.6, Yd(100)],
    [11.4, Yd(M.hem + 14)],
    [12.2, Yd(M.hem + 6)],
    [13.6, Yd(M.hem + 1)],
    [13.4, Yd(M.hem)],
    [6, Yd(M.hem - 0.4)],
    [0, Yd(M.hem - 0.4)],
  ];
  return symmetric(right);
}

function paintTorso(ctx: Ctx, raw: Image, spans: Spans): Built {
  const { spec, facing } = ctx;
  const poly = torsoOutline(facing);
  const buf = createBuf(-16, Yd(M.neck) - 3, 32, M.neck - M.hem + 6);
  const [ya, yb] = spec.torsoRows;
  const cxRaw = spans.centre[spec.torsoWidthRow];
  const hwRaw = spans.half[spec.torsoWidthRow] - spans.band;
  const half = facing === "side" ? 12 : 13;
  const scaleY = (yb - ya) / (M.neck - M.hem + 1);
  const el: Element = {
    id: ID.base,
    raw,
    map: (x, y) => [
      cxRaw + Math.max(-1, Math.min(1, x / half)) * hwRaw,
      ya + (y - Yd(M.neck)) * scaleY,
    ],
    inside: (x, y) => inPolygon(poly, x, y),
  };
  paintElement(buf, el);
  // The sweater hem: a rib band under a shadow line.
  tone(buf, (_x, y) => y > Yd(M.hem + 4) && y <= Yd(M.hem - 1), 1.1);
  tone(
    buf,
    (x, y) =>
      y > Yd(M.hem + 4) && y <= Yd(M.hem - 1) && Math.floor(x) % 2 === 0,
    0.93,
  );
  tone(buf, (_x, y) => y > Yd(M.hem + 5) && y <= Yd(M.hem + 4), 0.55);
  // The collar: a cream band along the top edge, at the neck only.
  const neckHalf = facing === "front" ? 5.2 : 5.6;
  paintProc(buf, ID.detail, (x, y) => {
    if (!inPolygon(poly, x, y) || inPolygon(poly, x, y - 3)) return null;
    const near =
      facing === "side" ? x > -6.5 && x < 5 : Math.abs(x) < neckHalf + 1.4;
    if (!near) return null;
    return inPolygon(poly, x, y - 2.2) ? CREAM_SHADE : CREAM;
  });
  finish(buf, { despeckle: true });
  return {
    image: toImage(buf),
    offset: { x: buf.x0, y: buf.y0 },
    pivot: { x: 0, y: Yd(M.hip) },
    variants: {},
  };
}

// --- Head -------------------------------------------------------------------------------------------

/**
 * The head variants, from the head sheets, left to right: closed (the rest
 * head), open, wide, O, and the blink. The animator's mouth shapes
 * (rig/animator.ts) are talk-1 for a, e, i (wide), talk-2 for o, u, w (O),
 * and talk-3 for the other consonants (half open).
 */
const MOUTHS = [
  ["talk-1", 2],
  ["talk-2", 3],
  ["talk-3", 1],
  ["blink", 4],
] as const;

const hasPixels = (img: Image) => img.data.some((v, i) => i % 4 === 3 && v > 0);

async function paintHead(
  ctx: Ctx,
  load: (n: string) => Promise<Sheet>,
): Promise<Built> {
  const { spec } = ctx;
  const at = spec.headAt;
  const paint = (
    raw: Image,
    shift: RigPoint,
    base: Region,
  ): { image: Image; ink: Image } => {
    const left = base.x;
    // Hair tip to chin is the head's height.
    const scale = (M.top - M.chin) / (at.chinY - base.y - (at.pad ?? 0));
    const buf = createBuf(
      -19,
      Yd(M.top) - 3,
      38,
      Math.ceil(M.top - M.chin) + 12,
    );
    const el: Element = {
      id: ID.base,
      raw,
      map: (x, y) => [
        left + at.neckX + shift.x + (x - at.x) / scale,
        at.chinY + shift.y + (y - Yd(M.chin)) / scale,
      ],
      // Keep only a short stub of neck under the chin.
      where: (_x, y) => y <= Yd(M.chin - spec.neckKeep),
      edgeNoInk: 1,
    };
    paintElement(buf, el);
    tidySilhouette(buf);
    finish(buf, { open: (_x, y) => y > Yd(M.chin - spec.neckKeep) - 1.2 });
    const ink = liftDetail(buf);
    return { image: toImage(buf), ink };
  };
  const offset = { x: -19, y: Yd(M.top) - 3 };
  const pivot = jointOf("head", spec);
  if ("region" in spec.head) {
    const r = region(ctx.sheet, spec.head.region);
    const rest = paint(isolate(ctx.sheet, r.id), { x: 0, y: 0 }, r);
    return {
      image: rest.image,
      offset,
      pivot,
      variants: hasPixels(rest.ink) ? { ink: rest.ink } : {},
    };
  }
  const hs = await load(spec.head.sheet);
  const regs = [...hs.regions].sort((a, b) => a.x - b.x);
  const base = regs[0];
  const rest = paint(isolate(hs, base.id), { x: 0, y: 0 }, base);
  // Each head has an "-ink" twin holding only its drawn detail (pupils,
  // mouth lines): the renderer snaps those to solid ink after resampling.
  const variants: Record<string, Image> = hasPixels(rest.ink)
    ? { ink: rest.ink }
    : {};
  for (const [name, i] of MOUTHS) {
    const v = regs[i];
    const d = alignShift(hs, base, v);
    // The variant's pixel (sx + d) is the base's (sx).
    const drawn = paint(isolate(hs, v.id), d, base);
    variants[name] = drawn.image;
    if (hasPixels(drawn.ink)) variants[`${name}-ink`] = drawn.ink;
  }
  return { image: rest.image, offset, pivot, variants };
}

// --- Facing ------------------------------------------------------------------------------------------

async function buildFacing(
  facing: RigFacing,
  cache: Map<string, Sheet>,
): Promise<Record<RigPartId, Built>> {
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
  const ctx: Ctx = { facing, spec, sheet };
  const out = {} as Record<RigPartId, Built>;

  const torsoRaw = isolate(sheet, spec.torso);
  out.torso = paintTorso(ctx, torsoRaw, analyseSpans(torsoRaw, 12));

  const pair = (limb: Limb): [Region, Region] => {
    const [a, b] = spec.limbs[limb].map((id) => region(sheet, id));
    if (facing !== "side") return [a, b];
    // In the side view the near limb (r) is the brighter one.
    return brightness(sheet, a) >= brightness(sheet, b) ? [a, b] : [b, a];
  };
  for (const limb of LIMBS) {
    const [rr, ll] = pair(limb);
    for (const [s, r] of [
      ["r", rr],
      ["l", ll],
    ] as const) {
      const id = `${limb}-${s}` as RigPartId;
      out[id] = limbPart(ctx, id, limb, r, isolate(sheet, r.id));
    }
  }
  out.head = await paintHead(ctx, load);
  return out;
}

/** A rest-pose picture of one facing, for checking the joints. */
function restPicture(
  parts: Record<RigPartId, Built>,
  order: RigPartId[],
): Image {
  const pad = 8;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of Object.values(parts)) {
    x0 = Math.min(x0, p.offset.x);
    y0 = Math.min(y0, p.offset.y);
    x1 = Math.max(x1, p.offset.x + p.image.width);
    y1 = Math.max(y1, p.offset.y + p.image.height);
  }
  const out = createImage(
    x1 - x0 + 2 * pad,
    y1 - y0 + 2 * pad,
    [111, 126, 116],
  );
  for (const id of order) {
    const { image, offset } = parts[id];
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const p = (y * image.width + x) * 4;
        if (image.data[p + 3] === 0) continue;
        const q =
          ((offset.y + y - y0 + pad) * out.width + offset.x + x - x0 + pad) * 4;
        out.data.set(image.data.subarray(p, p + 4), q);
      }
    }
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
  mkdirSync(outDir, { recursive: true });

  const source = { facings: {} } as unknown as RigSource;
  for (const facing of ["side", "front", "back"] as const) {
    const parts = await buildFacing(facing, cache);
    const spec = SPECS[facing];
    const z = new Map(spec.order.map((id, i) => [id, i]));
    const files = {} as RigSource["facings"][RigFacing]["parts"];
    for (const id of Object.keys(parts) as RigPartId[]) {
      const p = parts[id];
      const dir = `${facing}/${id}`;
      const entry: RigSourcePart = {
        file: `${dir}.png`,
        offset: p.offset,
        pivot: p.pivot,
        z: z.get(id) as number,
      };
      const parent = PARENT[id];
      if (parent) entry.parent = parent;
      await writePng(join(outDir, entry.file), p.image);
      const names = Object.keys(p.variants);
      if (names.length) {
        entry.variants = {};
        for (const name of names) {
          const file = `${dir}-${name}.png`;
          entry.variants[name] = { file, offset: p.offset };
          await writePng(join(outDir, file), p.variants[name]);
        }
      }
      files[id] = entry;
    }
    source.facings[facing] = { feet: { x: 0, y: 0 }, parts: files };
    if (values.preview) {
      await writePng(
        join(cliPath(values.preview), `rest-${facing}.png`),
        restPicture(parts, spec.order),
      );
    }
  }
  writeFileSync(
    join(outDir, "rig.json"),
    `${JSON.stringify(source, null, 2)}\n`,
  );
  console.log(outDir);
}

main().catch((e: unknown) => {
  console.error(e);
  fail(e instanceof Error ? e.message : String(e));
});
