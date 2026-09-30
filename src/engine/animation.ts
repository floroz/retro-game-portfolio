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

/** The seated upper body breathes while the lap and feet stay planted. */
export function idleRise(anim: SceneAnimation, now: number): number {
  const idle = anim.idle;
  if (!idle) return 0;
  return (
    idle.rise *
    (0.5 - 0.5 * Math.cos(((now + idle.phaseMs) / idle.periodMs) * Math.PI * 2))
  );
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

/**
 * How often the animation starts over (ms): every `everyMs`, or back to back
 * (one frame cycle, or one `motion` pass) without it. Matches
 * `animationFrame`.
 */
function animationPeriod(anim: SceneAnimation): number {
  if (anim.motion) return Math.max(anim.everyMs ?? anim.motion.durationMs, 1);
  return Math.max(anim.everyMs ?? anim.frames * anim.frameMs, 1);
}

/**
 * True when a cycle (or `motion` pass) starts in the engine time range
 * `(from, to]`: when to play the animation's `sound`. The start at time 0
 * doesn't count, so nothing plays before the first frame update.
 */
export function cycleStarted(
  anim: SceneAnimation,
  from: number,
  to: number,
): boolean {
  const period = animationPeriod(anim);
  return Math.floor(to / period) > Math.floor(from / period);
}
