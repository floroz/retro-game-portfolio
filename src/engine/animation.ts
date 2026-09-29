/**
 * Timing for `anim-*` strips (docs/art-spec.md, "Layers, depth, and slots").
 * Pure, so the loops can be tested without a canvas.
 */
import type { SceneAnimation } from "./types";

export interface AnimationFrame {
  frame: number;
  x: number;
  y: number;
}

/**
 * Which frame to draw, and where, at engine time `now` (ms). Returns null
 * while a moving loop is between passes.
 *
 * - no `everyMs`: loops forever;
 * - `everyMs`: plays one cycle every `everyMs`, holding frame 0 in between;
 * - `motion`: moves by `dx`,`dy` over `durationMs`, looping its frames, once
 *   every `everyMs` (or back to back without it), hidden between passes.
 */
export function animationFrame(
  anim: SceneAnimation,
  now: number,
): AnimationFrame | null {
  if (anim.motion) {
    const period = Math.max(anim.everyMs ?? anim.motion.durationMs, 1);
    const t = now % period;
    if (t > anim.motion.durationMs) return null;
    const p = t / anim.motion.durationMs;
    return {
      frame: Math.floor(t / anim.frameMs) % anim.frames,
      x: anim.x + anim.motion.dx * p,
      y: anim.y + anim.motion.dy * p,
    };
  }
  let frame: number;
  if (anim.everyMs) {
    const t = now % anim.everyMs;
    const cycle = anim.frames * anim.frameMs;
    frame = t < cycle ? Math.floor(t / anim.frameMs) : 0;
  } else {
    frame = Math.floor(now / anim.frameMs) % anim.frames;
  }
  return { frame, x: anim.x, y: anim.y };
}
