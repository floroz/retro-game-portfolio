/**
 * What Codex's built-in image tool actually returns (the G1 probe findings).
 * The tool has no size parameter, so these are observations, not settings: if a
 * raw candidate arrives at another size, the tool changed and the crop defaults
 * need checking.
 */
import type { Rect } from "./lib";

/** Scene composites and the travel map: already 2:1, so `--crop auto` keeps the whole frame. */
export const CODEX_COMPOSITE_SIZE = { w: 1774, h: 887 } as const;
/** Character turnarounds and animation sheets: 3:2, on a near-magenta background. */
export const CODEX_SHEET_SIZE = { w: 1536, h: 1024 } as const;

export type CodexKind = "composite" | "sheet";

/** A warning when a raw image isn't the size the probe measured, else null. */
export function codexSizeWarning(
  kind: CodexKind,
  width: number,
  height: number,
): string | null {
  const expected =
    kind === "composite" ? CODEX_COMPOSITE_SIZE : CODEX_SHEET_SIZE;
  if (width === expected.w && height === expected.h) return null;
  return `raw ${kind} is ${width}x${height}, not the ${expected.w}x${expected.h} the G1 probe measured; check the crop`;
}

/**
 * A warning when downscaling `region` to `width` x `height` would stretch it
 * by more than `tolerance` (1% by default), else null.
 */
export function aspectWarning(
  region: Rect,
  width: number,
  height: number,
  tolerance = 0.01,
): string | null {
  const stretch = region.w / region.h / (width / height);
  if (Math.abs(stretch - 1) <= tolerance) return null;
  return `crop ${region.w}x${region.h} at ${region.x},${region.y} is stretched ${((stretch - 1) * 100).toFixed(1)}% to fit ${width}x${height}; pass --crop x,y,w,h at ${width}:${height}`;
}
