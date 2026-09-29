/**
 * Keyframed pose clips for the cut-out rig: the format that
 * `src/engine/rig/poses.ts` is written in, and smooth sampling between
 * keys. Pure, so it's unit tested.
 *
 * A clip is a list of keys through one cycle (`at` from 0 to 1). A key sets
 * any part's angle and stretch, and the hips' offset; anything a key leaves
 * out is at rest (angle 0, stretch 1, offset 0). Between keys, each value
 * follows a Catmull-Rom curve through its neighbours, so motion never
 * stops dead at a key: a looping clip wraps round, and a one-shot clip
 * eases in and out at its ends.
 */
import type { RigFacing, RigPartId, RigPoint } from "../rigTypes";
import { REST_POSE, type RigPose } from "./transform";

export interface PoseKey {
  /** Where in the cycle, from 0 to 1. Keys are in order. */
  at: number;
  /** Degrees around each part's joint, counter-clockwise on screen (transform.ts). */
  angles?: Partial<Record<RigPartId, number>>;
  /** Scale along each part's length, for foreshortening (1 is rest). */
  stretch?: Partial<Record<RigPartId, number>>;
  /** Hips offset from rest, in logical px (y down). */
  root?: { x?: number; y?: number };
}

export interface PoseClip {
  /** Which drawing it animates. `side` faces east; west mirrors it. */
  facing: RigFacing;
  /** Loops forever, or plays once from 0 to 1 and holds. */
  loop: boolean;
  /**
   * How the cycle is timed:
   * - `{ ms }`: one cycle every `ms`;
   * - `{ stride }`: one cycle per `stride` times the rig's measured stride,
   *   the distance the planted foot sweeps back in a cycle, so the feet
   *   don't slide at any speed or depth scale. 1 for the side walk;
   *   less for the front and back walks, which cross the foreshortened
   *   floor.
   */
  timing: { ms: number } | { stride: number };
  /**
   * Keeps the lowest foot on the ground: the hips drop as the knees bend,
   * so the walk bobs with its legs and never sinks into the floor. The
   * clip's own `root.y` is added on top.
   */
  groundLock?: boolean;
  /**
   * For the side walk: the near foot is planted from phase 0 to 0.5 and the
   * far foot from 0.5 to 1, and the hips shift so the planted heel stays
   * exactly where it struck the floor while the body moves on at the
   * walking speed. The keys then only need to look right; the feet can't
   * slide.
   */
  footLock?: boolean;
  /** Where in the cycle a foot lands, for footstep sounds. */
  footfalls?: number[];
  keys: PoseKey[];
}

/** A sampled pose, without image variants (the animator picks those). */
export type PoseValues = Pick<RigPose, "angles" | "stretch" | "root">;

type Channel =
  | { kind: "angle"; id: RigPartId }
  | { kind: "stretch"; id: RigPartId }
  | { kind: "root"; axis: "x" | "y" };

function channels(clip: PoseClip): Channel[] {
  const angles = new Set<RigPartId>();
  const stretch = new Set<RigPartId>();
  for (const k of clip.keys) {
    for (const id of Object.keys(k.angles ?? {}) as RigPartId[]) angles.add(id);
    for (const id of Object.keys(k.stretch ?? {}) as RigPartId[])
      stretch.add(id);
  }
  return [
    ...[...angles].map((id) => ({ kind: "angle" as const, id })),
    ...[...stretch].map((id) => ({ kind: "stretch" as const, id })),
    { kind: "root", axis: "x" },
    { kind: "root", axis: "y" },
  ];
}

function valueOf(k: PoseKey, c: Channel): number {
  switch (c.kind) {
    case "angle":
      return k.angles?.[c.id] ?? 0;
    case "stretch":
      return k.stretch?.[c.id] ?? 1;
    case "root":
      return k.root?.[c.axis] ?? 0;
  }
}

/**
 * Cubic Hermite through `p1` at `t1` and `p2` at `t2`, with Catmull-Rom
 * tangents from the neighbours `p0` at `t0` and `p3` at `t3` (non-uniform
 * spacing allowed), at time `t`.
 */
export function catmullRom(
  t: number,
  [t0, p0]: readonly [number, number],
  [t1, p1]: readonly [number, number],
  [t2, p2]: readonly [number, number],
  [t3, p3]: readonly [number, number],
): number {
  const span = t2 - t1;
  if (span <= 0) return p2;
  const m1 = t2 - t0 > 0 ? ((p2 - p0) / (t2 - t0)) * span : 0;
  const m2 = t3 - t1 > 0 ? ((p3 - p1) / (t3 - t1)) * span : 0;
  const s = (t - t1) / span;
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * p1 +
    (s3 - 2 * s2 + s) * m1 +
    (-2 * s3 + 3 * s2) * p2 +
    (s3 - s2) * m2
  );
}

/** Keys as `[time, value]` for one channel, padded for Catmull-Rom. */
function samples(clip: PoseClip, c: Channel): [number, number][] {
  const keys = clip.keys.map((k) => [k.at, valueOf(k, c)] as [number, number]);
  if (clip.loop) {
    // Wrap: the last keys before 0 and the first after 1.
    const n = keys.length;
    const before = keys
      .slice(-2)
      .map(([t, v]) => [t - 1, v] as [number, number]);
    const after = keys
      .slice(0, 2)
      .map(([t, v]) => [t + 1, v] as [number, number]);
    return n ? [...before, ...keys, ...after] : [];
  }
  // One-shot: mirrored padding gives flat tangents, so it eases out of its
  // first key and into its last.
  const n = keys.length;
  if (n === 0) return [];
  const [t0, v0] = keys[0];
  const [t1, v1] = keys[Math.min(1, n - 1)];
  const [tl, vl] = keys[n - 1];
  const [tp, vp] = keys[Math.max(0, n - 2)];
  return [
    [n > 1 ? 2 * t0 - t1 : t0 - 1, n > 1 ? v1 : v0],
    ...keys,
    [n > 1 ? 2 * tl - tp : tl + 1, n > 1 ? vp : vl],
  ];
}

/** One channel's value at `phase` (0 to 1), from `samples()`. */
function sampleChannel(pts: [number, number][], phase: number): number {
  const n = pts.length;
  if (n === 0) return 0;
  // Before the first key or after the last: only a one-shot gets here (a
  // loop's padding lies outside 0-1), and it holds the key.
  if (phase <= pts[1][0]) return pts[1][1];
  if (phase >= pts[n - 2][0]) return pts[n - 2][1];
  let j = 1;
  while (j < n - 3 && pts[j + 1][0] <= phase) j++;
  return catmullRom(phase, pts[j - 1], pts[j], pts[j + 1], pts[j + 2]);
}

const cache = new WeakMap<
  PoseClip,
  { channel: Channel; pts: [number, number][] }[]
>();

/**
 * The clip's pose at `phase`: wrapped into 0-1 for a loop, clamped for a
 * one-shot. Root offsets come back in logical px.
 */
export function sampleClip(clip: PoseClip, phase: number): PoseValues {
  let tracks = cache.get(clip);
  if (!tracks) {
    tracks = channels(clip).map((channel) => ({
      channel,
      pts: samples(clip, channel),
    }));
    cache.set(clip, tracks);
  }
  const p = clip.loop
    ? phase - Math.floor(phase)
    : Math.max(0, Math.min(1, phase));
  const out: PoseValues = { angles: {}, stretch: {}, root: { x: 0, y: 0 } };
  for (const { channel: c, pts } of tracks) {
    const v = sampleChannel(pts, p);
    if (c.kind === "angle") out.angles[c.id] = v;
    else if (c.kind === "stretch") out.stretch[c.id] = v;
    else out.root = { ...out.root, [c.axis]: v };
  }
  return out;
}

const lerp = (a: number, b: number, w: number) => a + (b - a) * w;

/** Mixes two poses: `w` 0 is `a`, 1 is `b`. */
export function blendPoses(
  a: PoseValues,
  b: PoseValues,
  w: number,
): PoseValues {
  const ids = <T extends object>(x: T, y: T) =>
    [...new Set([...Object.keys(x), ...Object.keys(y)])] as RigPartId[];
  const angles: PoseValues["angles"] = {};
  for (const id of ids(a.angles, b.angles)) {
    angles[id] = lerp(a.angles[id] ?? 0, b.angles[id] ?? 0, w);
  }
  const stretch: PoseValues["stretch"] = {};
  for (const id of ids(a.stretch, b.stretch)) {
    stretch[id] = lerp(a.stretch[id] ?? 1, b.stretch[id] ?? 1, w);
  }
  const root: RigPoint = {
    x: lerp(a.root.x, b.root.x, w),
    y: lerp(a.root.y, b.root.y, w),
  };
  return { angles, stretch, root };
}

/** Smoothstep, for blends between clips. */
export function ease(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export const REST_VALUES: PoseValues = {
  angles: REST_POSE.angles,
  stretch: REST_POSE.stretch,
  root: REST_POSE.root,
};
