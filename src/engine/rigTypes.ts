/**
 * The cut-out rig contract: the shape of
 * `src/assets/character/daniele-rig.json`, which `npm run assets:rig`
 * (scripts/assets/rigpack.ts) writes and the engine's rig renderer reads.
 * Change it only together with both sides.
 *
 * Daniele is one HD drawing per facing, split into parts that hang off each
 * other at joints. Every coordinate is in atlas pixels, `density` per
 * logical px with the character at depth scale 1.0: 2 for painted art at MI3
 * pixel density (hard alpha, shown at 2x nearest-neighbour), or 4 for the
 * smooth HD path.
 *
 * To draw the rest pose, which reproduces the facing's drawing exactly:
 *
 *   joint(root)  = feet + root.attach
 *   joint(child) = joint(parent) + child.attach, rotated by the parent's angle
 *   draw each part's frame with its `pivot` on its joint, rotated by its
 *   own angle, in `parts` order (back to front)
 *
 * A pose adds an angle per part around its joint. `side` is drawn facing
 * east; west is `side` mirrored. `l` and `r` are Daniele's own left and
 * right, so in `side` the `r` limbs are nearest the viewer.
 */

/**
 * Ink colour for the optional pixel puppet outline. The renderer inks the
 * posed silhouette with it (rig/draw.ts), so a joint that bends still gets a
 * single outline. The current portrait rig preserves its painted source edges.
 */
export const RIG_INK = [6, 5, 12] as const;

export const RIG_FACINGS = ["side", "front", "back"] as const;
export type RigFacing = (typeof RIG_FACINGS)[number];

/** Every facing has all of these parts. */
export const RIG_PART_IDS = [
  "torso",
  "head",
  "upper-arm-l",
  "forearm-l",
  "upper-arm-r",
  "forearm-r",
  "thigh-l",
  "shin-l",
  "thigh-r",
  "shin-r",
] as const;
export type RigPartId = (typeof RIG_PART_IDS)[number];

/** Atlas px per logical px: 2 (painted, MI3 pixel density) or 4 (smooth HD). */
export type RigDensity = 2 | 4;

export interface RigPoint {
  x: number;
  y: number;
}

/** One image in the atlas, and where its joint sits inside it. */
export interface RigFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  /** The part's joint, in px from the frame's top-left. May lie outside it. */
  pivot: RigPoint;
}

export interface RigPart {
  id: RigPartId;
  /** Null for the facing's one root part (the torso, pivoting at the hips). */
  parent: RigPartId | null;
  /** Draw order within the facing; `parts` is already sorted by it. */
  z: number;
  /**
   * The joint's rest position relative to the parent's joint, or, for the
   * root, relative to the feet.
   */
  attach: RigPoint;
  /** The rest image. */
  frame: RigFrame;
  /**
   * Alternative images drawn in place of `frame` on the same joint. The
   * head has `blink` and `talk-1`, `talk-2`, ... (mouth shapes); other
   * parts may have none.
   */
  variants: Record<string, RigFrame>;
}

export interface RigFacingData {
  /** Draw order, back to front. */
  parts: RigPart[];
  /** The rest pose's bounding box relative to the feet (y is negative up). */
  bounds: { x: number; y: number; w: number; h: number };
}

export interface RigJson {
  version: 1;
  /** The atlas file name beside the JSON: "daniele-rig.png". */
  image: string;
  /** Atlas px per logical px at depth scale 1.0. */
  density: RigDensity;
  /** The atlas size. */
  size: { w: number; h: number };
  facings: Record<RigFacing, RigFacingData>;
}
