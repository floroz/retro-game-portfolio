/**
 * Cut-out rig transforms (docs/art-spec.md, "Phase H", "Character"; the
 * contract is src/engine/rigTypes.ts). Pure 2D affine math, so the joint
 * chain can be unit tested without a canvas.
 *
 * Everything is in atlas px (display px at density 4, depth scale 1.0),
 * with the feet at the origin and y down, as in the contract:
 *
 *   joint(root)  = feet + root.attach, offset by the pose's `root`
 *   joint(child) = joint(parent) + child.attach, rotated by the parent's angle
 *   each part is drawn with its frame's `pivot` on its joint, rotated by its
 *   own (accumulated) angle, and stretched along its own axis by `stretch`
 *
 * Angles are in degrees, counter-clockwise on screen. In the side view,
 * which faces east, that swings a hanging limb forward (a positive thigh
 * steps out, a positive forearm bends the elbow) and leans the torso back
 * (a negative torso angle leans forward). With no pose, the rest pose
 * reproduces the facing's drawing exactly.
 */
import type { RigFacingData, RigFrame, RigPartId, RigPoint } from "../rigTypes";

/** A 2D affine matrix `[a, b, c, d, e, f]`, as `CanvasRenderingContext2D`. */
export type Mat = readonly [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/** `m` then `n`: the matrix that applies `n` first, then `m`. */
export function multiply(m: Mat, n: Mat): Mat {
  const [a, b, c, d, e, f] = m;
  const [a2, b2, c2, d2, e2, f2] = n;
  return [
    a * a2 + c * b2,
    b * a2 + d * b2,
    a * c2 + c * d2,
    b * c2 + d * d2,
    a * e2 + c * f2 + e,
    b * e2 + d * f2 + f,
  ];
}

export function translate(x: number, y: number): Mat {
  return [1, 0, 0, 1, x, y];
}

/** Rotation by `deg` degrees counter-clockwise on screen (y down). */
export function rotate(deg: number): Mat {
  const r = (-deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [cos, sin, -sin, cos, 0, 0];
}

function scale(sx: number, sy: number): Mat {
  return [sx, 0, 0, sy, 0, 0];
}

export function apply(m: Mat, p: RigPoint): RigPoint {
  const [a, b, c, d, e, f] = m;
  return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
}

/**
 * One frame of the puppet: an angle and a stretch per part, the hips'
 * offset from rest, and which image each part shows.
 */
export interface RigPose {
  /** Degrees around each part's joint, counter-clockwise on screen. */
  angles: Partial<Record<RigPartId, number>>;
  /**
   * Scale along each part's own length (1 is rest), for foreshortening: a
   * knee lifting towards the viewer in the front view shortens the thigh.
   * It stretches the part's image and moves its children's joints with it.
   */
  stretch: Partial<Record<RigPartId, number>>;
  /** Hips offset from rest, in atlas px (y down): the walk's bob. */
  root: RigPoint;
  /** A variant image per part ("blink", "talk-2"), instead of its `frame`. */
  variants: Partial<Record<RigPartId, string>>;
}

export const REST_POSE: RigPose = {
  angles: {},
  stretch: {},
  root: { x: 0, y: 0 },
  variants: {},
};

/** A part placed for drawing. */
export interface PlacedPart {
  id: RigPartId;
  /** The image: the part's `frame`, or the variant the pose asks for. */
  frame: RigFrame;
  /**
   * Atlas px of the frame (relative to its top-left) to feet-relative atlas
   * px: draw the frame at `-pivot` under this matrix.
   */
  matrix: Mat;
  /** The joint, feet-relative. */
  joint: RigPoint;
}

/**
 * Places every part of a facing for `pose`, in draw order (back to front).
 * Parents come before children in the joint chain, whatever their z-order.
 */
export function solveRig(facing: RigFacingData, pose: RigPose): PlacedPart[] {
  const byId = new Map(facing.parts.map((p) => [p.id, p]));
  /** The world matrix at each part's joint, before its own stretch. */
  const jointMats = new Map<RigPartId, Mat>();

  const jointMat = (id: RigPartId, depth = 0): Mat => {
    const known = jointMats.get(id);
    if (known) return known;
    const part = byId.get(id);
    if (!part || depth > byId.size) return IDENTITY;
    let parent: Mat;
    if (part.parent) {
      // The parent's stretch moves this joint along the parent's length.
      const p = part.parent;
      parent = multiply(jointMat(p, depth + 1), scale(1, pose.stretch[p] ?? 1));
    } else {
      parent = translate(pose.root.x, pose.root.y);
    }
    const m = multiply(
      multiply(parent, translate(part.attach.x, part.attach.y)),
      rotate(pose.angles[id] ?? 0),
    );
    jointMats.set(id, m);
    return m;
  };

  return facing.parts.map((part) => {
    const at = jointMat(part.id);
    const variant = pose.variants[part.id];
    const frame = (variant && part.variants[variant]) || part.frame;
    const matrix = multiply(at, scale(1, pose.stretch[part.id] ?? 1));
    return { id: part.id, frame, matrix, joint: apply(at, { x: 0, y: 0 }) };
  });
}

/**
 * Where a point of a part's frame lands, feet-relative: e.g. the bottom of
 * a shin, to find where the foot is.
 */
export function framePoint(placed: PlacedPart, p: RigPoint): RigPoint {
  return apply(placed.matrix, {
    x: p.x - placed.frame.pivot.x,
    y: p.y - placed.frame.pivot.y,
  });
}
