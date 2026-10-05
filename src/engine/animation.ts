/**
 * Timing for `anim-*` strips. Pure, so the loops can be tested without a
 * canvas.
 */
import type { ObjectPulse, SceneAnimation } from "./types";

/** Same 12 fps, 650 ms compression as the approved jukebox preview. */
export function objectPulseScale(
  pulse: ObjectPulse,
  now: number,
  reducedMotion = false,
): number {
  if (reducedMotion || now < pulse.everyMs) return 1;
  const stepped = (Math.floor((now * 12) / 1000) * 1000) / 12;
  const local = (stepped - pulse.everyMs) % pulse.everyMs;
  if (local < 0 || local >= pulse.durationMs) return 1;
  return (
    1 - pulse.compression * Math.sin((local / pulse.durationMs) * Math.PI) ** 2
  );
}

export interface AnimationFrame {
  frame: number;
  x: number;
  y: number;
}

function stripDuration(anim: SceneAnimation): number {
  return (
    anim.frameDurationsMs?.reduce((sum, ms) => sum + ms, 0) ??
    anim.frames * anim.frameMs
  );
}

function stripFrame(anim: SceneAnimation, time: number): number {
  if (!anim.frameDurationsMs)
    return Math.floor(time / anim.frameMs) % anim.frames;
  let remaining = time % stripDuration(anim);
  for (const [frame, duration] of anim.frameDurationsMs.entries()) {
    if (remaining < duration) return frame;
    remaining -= duration;
  }
  return 0;
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
  reducedMotion = false,
): AnimationFrame | null {
  if (reducedMotion && anim.freezeForReducedMotion)
    return { frame: 0, x: anim.x, y: anim.y };
  now += anim.phaseMs ?? 0;
  if (anim.motion) {
    const period = Math.max(anim.everyMs ?? anim.motion.durationMs, 1);
    const t = now % period;
    if (t > anim.motion.durationMs) return null;
    const p = t / anim.motion.durationMs;
    return {
      frame: stripFrame(anim, t),
      x: anim.x + anim.motion.dx * p,
      y: anim.y + anim.motion.dy * p,
    };
  }
  let frame: number;
  if (anim.everyMs) {
    const t = now % anim.everyMs;
    const cycle = stripDuration(anim);
    frame = t < cycle ? stripFrame(anim, t) : 0;
  } else {
    frame = stripFrame(anim, now);
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
  return Math.max(anim.everyMs ?? stripDuration(anim), 1);
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
  const phase = anim.phaseMs ?? 0;
  return (
    Math.floor((to + phase) / period) > Math.floor((from + phase) / period)
  );
}
