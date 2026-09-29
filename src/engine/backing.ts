/**
 * The scene canvas's backing store (docs/art-spec.md, "Phase H: HD
 * hand-painted"). Pixel-art scenes (density 1 and 2) keep the 640x320 canvas
 * that CSS scales up with `image-rendering: pixelated`, exactly as before.
 * HD scenes (density 4) are painted, so their canvas is backed at the size
 * it's displayed, in device pixels: 1280x640 on a standard screen, 2560x1280
 * on a 2x (Retina) one, smaller when the Win95 window shrinks the game. The
 * art is then resampled once, smoothly, by the canvas, and never again by
 * CSS. Everything is still drawn in logical px (320x160) through the
 * canvas transform.
 */
import { CANVAS_H, CANVAS_W, NATIVE_H, NATIVE_W } from "./constants";

export interface Backing {
  /** Backing store size in device pixels. */
  w: number;
  h: number;
  /** True for HD: smooth resampling, CSS `image-rendering: auto`. */
  smooth: boolean;
}

/** Where the canvas is on screen, in CSS px, and the device pixel ratio. */
export interface Display {
  w: number;
  h: number;
  dpr: number;
}

/** Smallest and largest HD backing width, in device pixels. */
const MIN_HD_W = NATIVE_W * 2;
const MAX_HD_W = NATIVE_W * 12;

/**
 * The backing store for a frame. Pixel art always gets the fixed 640x320
 * canvas. HD gets the displayed size times the device pixel ratio, clamped
 * so a hidden canvas (zero size) or a huge screen can't break it, and with
 * the scene's 2:1 aspect kept exactly. Without a display size, HD falls
 * back to 1280x640, the art's own size.
 */
export function backingSize(smooth: boolean, display?: Display): Backing {
  if (!smooth) return { w: CANVAS_W, h: CANVAS_H, smooth };
  const wanted = display ? Math.round(display.w * display.dpr) : NATIVE_W * 4;
  const w = Math.max(
    MIN_HD_W,
    Math.min(MAX_HD_W, wanted > 0 ? wanted : NATIVE_W * 4),
  );
  return { w, h: Math.round((w * NATIVE_H) / NATIVE_W), smooth };
}
