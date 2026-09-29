/**
 * The cut-out rig as the engine uses it: `daniele-rig.json` (the contract
 * in src/engine/rigTypes.ts, written by `npm run assets:rig`) checked and
 * measured, plus posing a facing with a clip.
 *
 * Two measurements come from the rig itself rather than from hand-set
 * numbers, so HB7 can repaint the parts without retuning the engine:
 * - `figureHeight`: the side drawing's height, what a scene's world scale
 *   (`farHeight`, `nearHeight`) is measured against;
 * - `stride`: how far the planted foot sweeps back through one `walk-side`
 *   cycle, so walking advances the cycle by distance and the feet stay put.
 */
import {
  RIG_FACINGS,
  RIG_PART_IDS,
  type RigFacing,
  type RigFacingData,
  type RigJson,
  type RigPoint,
} from "../rigTypes";
import type { PoseClip, PoseValues } from "./clip";
import { sampleClip } from "./clip";
import { POSE_CLIPS, type ClipName } from "./poses";
import {
  framePoint,
  solveRig,
  type PlacedPart,
  type RigPose,
} from "./transform";

export interface Rig {
  /** URL of the atlas image. */
  image: string;
  /** Atlas px per logical px at depth scale 1.0 (4). */
  density: number;
  facings: Record<RigFacing, RigFacingData>;
  /** Standing height in logical px at scale 1 (the side drawing's). */
  figureHeight: number;
  /** Logical px the body travels in one `walk-side` cycle, at scale 1. */
  stride: number;
  /** The head's mouth-shape variants, "talk-1", "talk-2", ..., in order. */
  mouths: string[];
  /** True if the head has a `blink` variant. */
  blinks: boolean;
  clips: Record<ClipName, PoseClip>;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isPoint = (v: unknown): v is RigPoint =>
  isRecord(v) && isNum(v.x) && isNum(v.y);
const isFrame = (v: unknown) =>
  isRecord(v) &&
  isNum(v.x) &&
  isNum(v.y) &&
  isNum(v.w) &&
  isNum(v.h) &&
  isPoint(v.pivot);

/**
 * Checks the shape the renderer relies on, so a bad pack fails loudly at
 * start-up (`lint:assets` checks the rest against the atlas).
 */
function checkRigJson(json: unknown): json is RigJson {
  if (!isRecord(json) || json.version !== 1 || !isNum(json.density))
    return false;
  if (!isRecord(json.facings)) return false;
  const facings = json.facings;
  return RIG_FACINGS.every((name) => {
    const f = facings[name];
    if (!isRecord(f) || !Array.isArray(f.parts) || !isRecord(f.bounds))
      return false;
    const parts: unknown[] = f.parts;
    const ids = new Set(parts.map((p) => (isRecord(p) ? p.id : undefined)));
    return (
      RIG_PART_IDS.every((id) => ids.has(id)) &&
      parts.every(
        (p) =>
          isRecord(p) &&
          isPoint(p.attach) &&
          isFrame(p.frame) &&
          isRecord(p.variants) &&
          Object.values(p.variants).every(isFrame),
      )
    );
  });
}

/** Solves `facing` for `pose` and returns where each part lands. */
export function placeRig(
  rig: Pick<Rig, "facings">,
  facing: RigFacing,
  pose: RigPose,
): PlacedPart[] {
  return solveRig(rig.facings[facing], pose);
}

/** The two bottom corners of a shin's image, feet-relative. */
function soles(placed: PlacedPart): RigPoint[] {
  const { w, h } = placed.frame;
  return [
    framePoint(placed, { x: 0, y: h }),
    framePoint(placed, { x: w, y: h }),
  ];
}

/** The heel: the bottom of a shin's image, under its knee. */
export function heelOf(placed: PlacedPart): RigPoint {
  return framePoint(placed, { x: placed.frame.pivot.x, y: placed.frame.h });
}

/** A heel's feet-relative x in the pose, in atlas px. */
function heelX(
  rig: Pick<Rig, "facings">,
  facing: RigFacing,
  pose: RigPose,
  shin: "shin-l" | "shin-r",
): number {
  const part = placeRig(rig, facing, pose).find((p) => p.id === shin);
  return part ? heelOf(part).x : 0;
}

/** The unlocked pose of a clip's values, in atlas px. */
function rawPose(
  rig: Pick<Rig, "density">,
  values: PoseValues,
  variants: RigPose["variants"],
): RigPose {
  const d = rig.density;
  return {
    angles: values.angles,
    stretch: values.stretch,
    root: { x: values.root.x * d, y: values.root.y * d },
    variants,
  };
}

/**
 * The pose for a clip's values on a facing, in atlas px, with the clip's
 * locks applied (clip.ts): with `footLock` and the clip's `phase`, the hips
 * shift so the planted heel keeps its place as the body moves on by
 * `rig.stride` per cycle; with `groundLock`, they move so the lowest sole
 * is on the ground.
 */
export function poseFor(
  rig: Pick<Rig, "facings" | "density"> & {
    stride?: number;
    clips?: Rig["clips"];
  },
  clip: PoseClip,
  values: PoseValues,
  variants: RigPose["variants"] = {},
  phase?: number,
): RigPose {
  let pose = rawPose(rig, values, variants);
  if (clip.footLock && phase !== undefined && rig.stride) {
    const p = phase - Math.floor(phase);
    const near = p < 0.5;
    const shin = near ? "shin-r" : "shin-l";
    const struck = near ? 0 : 0.5;
    const atStrike = heelX(
      rig,
      clip.facing,
      rawPose(rig, sampleClip(clip, struck), {}),
      shin,
    );
    const target = atStrike - rig.stride * rig.density * (p - struck);
    const shift = target - heelX(rig, clip.facing, pose, shin);
    pose = { ...pose, root: { x: pose.root.x + shift, y: pose.root.y } };
  }
  if (!clip.groundLock) return pose;
  const placed = placeRig(rig, clip.facing, pose);
  let lowest = -Infinity;
  for (const part of placed) {
    if (part.id !== "shin-l" && part.id !== "shin-r") continue;
    for (const p of soles(part)) lowest = Math.max(lowest, p.y);
  }
  if (!Number.isFinite(lowest)) return pose;
  return { ...pose, root: { x: pose.root.x, y: pose.root.y - lowest } };
}

/**
 * Logical px the body travels in one `walk-side` cycle at scale 1: the
 * near heel's sweep from its strike (phase 0) to lifting off (phase 0.5),
 * twice, one stance per foot.
 */
function measureStride(
  rig: Pick<Rig, "facings" | "density">,
  clip: PoseClip,
): number {
  const heelAt = (phase: number) => {
    const pose = poseFor(rig, clip, sampleClip(clip, phase));
    const shin = placeRig(rig, clip.facing, pose).find(
      (p) => p.id === "shin-r",
    );
    return shin ? heelOf(shin).x : 0;
  };
  const sweep = Math.abs(heelAt(0) - heelAt(0.5));
  return (2 * sweep) / rig.density;
}

/** Validates and measures `daniele-rig.json`. */
export function parseRig(
  json: unknown,
  imageUrl: string,
  clips: Record<ClipName, PoseClip> = POSE_CLIPS,
): Rig {
  if (!checkRigJson(json)) {
    throw new Error("daniele-rig.json doesn't match the rig contract");
  }
  const head = json.facings.side.parts.find((p) => p.id === "head");
  const names = Object.keys(head?.variants ?? {});
  const mouths = names
    .filter((n) => /^talk-\d+$/.test(n))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
  const base = { facings: json.facings, density: json.density };
  const stride = measureStride(base, clips["walk-side"]);
  return {
    image: imageUrl,
    density: json.density,
    facings: json.facings,
    figureHeight: json.facings.side.bounds.h / json.density,
    stride: stride > 0 ? stride : 26,
    mouths,
    blinks: names.includes("blink"),
    clips,
  };
}
