/**
 * A stand-in rig made of flat rectangles, in the shape of the contract
 * (rigTypes.ts), for trying out the renderer and the pose clips before HB7
 * packs the painted parts. It has Phase H's proportions: 72 logical px
 * (288 atlas px) tall, a head about a quarter of that, long cartoon arms
 * and big feet. Each part is coloured like Daniele's outfit, with its
 * joint marked, and the head has `blink` and three mouth shapes.
 *
 * Dev only: the rig preview page (`/src/engine/rig/dev/preview.html`) and
 * `?rig=placeholder` in the game use it.
 */
import type {
  RigFacing,
  RigFacingData,
  RigFrame,
  RigJson,
  RigPart,
  RigPartId,
  RigPoint,
} from "../rigTypes";
import { REST_POSE, solveRig } from "./transform";

interface PartSpec {
  id: RigPartId;
  parent: RigPartId | null;
  z: number;
  attach: RigPoint;
  w: number;
  h: number;
  pivot: RigPoint;
  fill: string;
  /** The last `h` px are skin (a hand) or leather (a shoe). */
  end?: { fill: string; h: number; w?: number };
}

const INK = "#0f0d12";
const SKIN = "#e7bd98";
const HAIR = "#49322d";
const NAVY = "#2f3f66";
const NAVY_FAR = "#21283c";
const DENIM = "#466394";
const DENIM_FAR = "#2f3f66";
const SHOE = "#6d3f31";

type Side = "near" | "far";

function limbs(
  side: Side,
  suffix: "l" | "r",
  hip: RigPoint,
  shoulder: RigPoint,
  z: { leg: number; arm: number },
  front: boolean,
): PartSpec[] {
  const far = side === "far";
  const shoeW = front ? 30 : 46;
  return [
    {
      id: `thigh-${suffix}`,
      parent: "torso",
      z: z.leg,
      attach: hip,
      w: 30,
      h: 72,
      pivot: { x: 15, y: 6 },
      fill: far ? DENIM_FAR : DENIM,
    },
    {
      id: `shin-${suffix}`,
      parent: `thigh-${suffix}`,
      z: z.leg + 1,
      attach: { x: 0, y: 66 },
      w: shoeW,
      h: 72,
      pivot: { x: 15, y: 4 },
      fill: far ? DENIM_FAR : DENIM,
      end: { fill: SHOE, h: 14 },
    },
    {
      id: `upper-arm-${suffix}`,
      parent: "torso",
      z: z.arm,
      attach: shoulder,
      w: 24,
      h: 60,
      pivot: { x: 12, y: 6 },
      fill: far ? NAVY_FAR : NAVY,
    },
    {
      id: `forearm-${suffix}`,
      parent: `upper-arm-${suffix}`,
      z: z.arm + 1,
      attach: { x: 0, y: 52 },
      w: 22,
      h: 64,
      pivot: { x: 11, y: 4 },
      fill: far ? NAVY_FAR : NAVY,
      end: { fill: SKIN, h: 20, w: 26 },
    },
  ] as PartSpec[];
}

function facingSpecs(facing: RigFacing): PartSpec[] {
  const torso = (w: number): PartSpec => ({
    id: "torso",
    parent: null,
    z: 4,
    attach: { x: 0, y: -134 },
    w,
    h: 100,
    pivot: { x: w / 2, y: 94 },
    fill: NAVY,
  });
  const head = (z: number): PartSpec => ({
    id: "head",
    parent: "torso",
    z,
    attach: { x: facing === "side" ? 6 : 0, y: -86 },
    w: facing === "side" ? 58 : 64,
    h: 72,
    pivot: { x: facing === "side" ? 26 : 32, y: 68 },
    fill: facing === "back" ? HAIR : SKIN,
  });
  if (facing === "side") {
    return [
      torso(60),
      head(5),
      ...limbs(
        "far",
        "l",
        { x: -2, y: 0 },
        { x: -2, y: -80 },
        { leg: 2, arm: 0 },
        false,
      ),
      ...limbs(
        "near",
        "r",
        { x: 2, y: 0 },
        { x: 4, y: -80 },
        { leg: 6, arm: 8 },
        false,
      ),
    ];
  }
  // Facing the viewer his right is on screen left; from behind, screen right.
  const r = facing === "front" ? -1 : 1;
  return [
    torso(84),
    head(9),
    ...limbs(
      "near",
      "r",
      { x: 16 * r, y: 0 },
      { x: 44 * r, y: -82 },
      { leg: 0, arm: 5 },
      true,
    ),
    ...limbs(
      "near",
      "l",
      { x: -16 * r, y: 0 },
      { x: -44 * r, y: -82 },
      { leg: 2, arm: 7 },
      true,
    ),
  ];
}

const HEAD_VARIANTS = ["blink", "talk-1", "talk-2", "talk-3"] as const;

interface Cell {
  spec: PartSpec;
  facing: RigFacing;
  variant: string | null;
  frame: RigFrame;
}

const PAD = 2;
const ATLAS_W = 512;

/** The placeholder's `daniele-rig.json`, and where each image goes. */
export function placeholderRig(): { json: RigJson; cells: Cell[] } {
  const cells: Cell[] = [];
  let x = PAD;
  let y = PAD;
  let row = 0;
  const place = (spec: PartSpec, facing: RigFacing, variant: string | null) => {
    if (x + spec.w + PAD > ATLAS_W) {
      x = PAD;
      y += row + PAD;
      row = 0;
    }
    const frame: RigFrame = { x, y, w: spec.w, h: spec.h, pivot: spec.pivot };
    cells.push({ spec, facing, variant, frame });
    x += spec.w + PAD;
    row = Math.max(row, spec.h);
    return frame;
  };

  const facings = {} as Record<RigFacing, RigFacingData>;
  for (const facing of ["side", "front", "back"] as const) {
    const parts: RigPart[] = facingSpecs(facing)
      .sort((a, b) => a.z - b.z)
      .map((spec) => {
        const frame = place(spec, facing, null);
        const variants: Record<string, RigFrame> = {};
        if (spec.id === "head" && facing !== "back") {
          for (const v of HEAD_VARIANTS) variants[v] = place(spec, facing, v);
        }
        return {
          id: spec.id,
          parent: spec.parent,
          z: spec.z,
          attach: spec.attach,
          frame,
          variants,
        };
      });
    const data: RigFacingData = { parts, bounds: { x: 0, y: 0, w: 0, h: 0 } };
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of solveRig(data, REST_POSE)) {
      const left = p.joint.x - p.frame.pivot.x;
      const top = p.joint.y - p.frame.pivot.y;
      x0 = Math.min(x0, left);
      y0 = Math.min(y0, top);
      x1 = Math.max(x1, left + p.frame.w);
      y1 = Math.max(y1, top + p.frame.h);
    }
    data.bounds = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    facings[facing] = data;
  }
  return {
    json: {
      version: 1,
      image: "daniele-rig.png",
      density: 4,
      size: { w: ATLAS_W, h: y + row + PAD },
      facings,
    },
    cells,
  };
}

function paintCell(ctx: CanvasRenderingContext2D, cell: Cell) {
  const { spec, frame: f, variant, facing } = cell;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.fillStyle = spec.fill;
  ctx.beginPath();
  ctx.roundRect(1.5, 1.5, f.w - 3, f.h - 3, 8);
  ctx.fill();
  if (spec.end) {
    const ew = spec.end.w ?? f.w - 3;
    ctx.fillStyle = spec.end.fill;
    ctx.beginPath();
    ctx.roundRect(1.5, f.h - spec.end.h - 1.5, ew, spec.end.h, 6);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.roundRect(1.5, 1.5, f.w - 3, f.h - 3, 8);
  ctx.stroke();
  if (spec.id === "head" && facing !== "back") {
    // Hair on top, a beard below, eyes and a mouth.
    const side = facing === "side";
    ctx.fillStyle = HAIR;
    ctx.fillRect(3, 3, f.w - 6, 14);
    ctx.fillRect(side ? 3 : 6, 40, side ? 30 : f.w - 12, 26);
    ctx.fillStyle = INK;
    const eyes = side ? [f.w - 16] : [f.w / 2 - 14, f.w / 2 + 8];
    for (const ex of eyes) {
      if (variant === "blink") ctx.fillRect(ex, 30, 8, 2);
      else ctx.fillRect(ex, 25, 6, 9);
    }
    const mouth: Record<string, [number, number]> = {
      "talk-1": [14, 12],
      "talk-2": [8, 10],
      "talk-3": [12, 6],
    };
    const [mw, mh] = (variant && mouth[variant]) || [14, 2];
    ctx.fillStyle = "#5a1e1e";
    ctx.fillRect(side ? f.w - 22 : f.w / 2 - mw / 2, 50, mw, mh);
  }
  if (spec.id === "torso" && facing !== "back") {
    ctx.fillStyle = "#e8dcc8";
    ctx.fillRect(f.w / 2 - 14, 3, 28, 6);
  }
  // The joint.
  ctx.fillStyle = "#ff5fd2";
  ctx.beginPath();
  ctx.arc(f.pivot.x, f.pivot.y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Paints the placeholder atlas; returns it as a PNG data URL. */
export function placeholderAtlas(): string {
  const { json, cells } = placeholderRig();
  const canvas = document.createElement("canvas");
  canvas.width = json.size.w;
  canvas.height = json.size.h;
  const ctx = canvas.getContext("2d");
  if (ctx) for (const cell of cells) paintCell(ctx, cell);
  return canvas.toDataURL("image/png");
}
