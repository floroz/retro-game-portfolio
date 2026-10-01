/**
 * Procedural effects and moving props: what to draw at engine time `now`, from
 * the scene's `effects` and `props` (types.ts). Pure and deterministic, with no
 * `Math.random`: randomness comes from a hash of the effect's id and indices,
 * so a scene looks the same on every visit, and every rule is unit tested.
 * render.ts draws the shapes on the art's pixel grid with hard pixels.
 */
import type {
  FlutterEffect,
  GlintsEffect,
  LampsEffect,
  MovingProp,
  MusicNotesEffect,
  PendulumEffect,
  RainEffect,
  SceneEffect,
  SleepEffect,
  SteamEffect,
  StarsEffect,
} from "./types";

/** Something to draw, in logical px. `px` is one pixel of the art's grid. */
export type Shape =
  | { kind: "px"; x: number; y: number; color: string; alpha?: number }
  | {
      kind: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      alpha?: number;
    }
  | {
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      alpha?: number;
    }
  | {
      kind: "disc";
      x: number;
      y: number;
      r: number;
      color: string;
      alpha?: number;
    };

/** A hash of integers to [0, 1): the same inputs, the same number. */
export function hashRandom(...n: number[]): number {
  let h = 0x811c9dc5;
  for (const v of n) {
    h ^= Math.floor(v) | 0;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
  }
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A number per id, so two effects of one kind don't move in step. */
function seedOf(id: string): number {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 31);
  return h;
}

function rain(e: RainEffect, now: number): Shape[] {
  const seed = seedOf(e.id);
  const tan = Math.tan(((e.slant ?? 0) * Math.PI) / 180);
  const cycle = e.area.h + e.length;
  const out: Shape[] = [];
  for (let i = 0; i < e.drops; i++) {
    const fallen = (now / 1000) * e.speed + hashRandom(seed, i) * cycle;
    const pass = Math.floor(fallen / cycle);
    // The streak's bottom, from above the area to below it.
    const y2 = e.area.y + (fallen % cycle);
    const y1 = y2 - e.length;
    // A new column each pass; slanting as it falls.
    const x0 = e.area.x + hashRandom(seed, i, pass) * e.area.w;
    const x = (y: number) => x0 - (y - e.area.y) * tan;
    out.push({ kind: "line", x1: x(y1), y1, x2: x(y2), y2, color: e.color });
  }
  return out;
}

function steam(e: SteamEffect, now: number): Shape[] {
  const seed = seedOf(e.id);
  const out: Shape[] = [];
  const newest = Math.floor(now / e.everyMs);
  const alive = Math.ceil(e.lifeMs / e.everyMs);
  for (let k = newest; k > newest - alive - 1 && k >= 0; k--) {
    const t = (now - k * e.everyMs) / e.lifeMs;
    if (t < 0 || t >= 1) continue;
    const r = e.size * Math.sin(Math.PI * Math.min(1, t * 1.3));
    if (r < 0.5) continue;
    const sway = (hashRandom(seed, k) - 0.5) * 2 * (e.drift ?? 0);
    out.push({
      kind: "disc",
      x: e.x + sway * t,
      y: e.y - e.rise * t,
      r,
      color: e.color,
      alpha: e.opacity,
    });
  }
  return out;
}

function stars(e: StarsEffect, now: number): Shape[] {
  const seed = seedOf(e.id);
  const out: Shape[] = [];
  e.points.forEach(([x, y], i) => {
    const phase = now / e.periodMs + hashRandom(seed, i);
    const glow = 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);
    if (glow > 0.85) {
      // At its brightest: a four-point twinkle.
      out.push({ kind: "px", x, y, color: e.color });
      for (const [dx, dy] of [
        [-0.5, 0],
        [0.5, 0],
        [0, -0.5],
        [0, 0.5],
      ]) {
        out.push({ kind: "px", x: x + dx, y: y + dy, color: e.color });
      }
    } else if (glow > 0.35) {
      out.push({ kind: "px", x, y, color: e.color });
    } else if (e.dim) {
      out.push({ kind: "px", x, y, color: e.dim });
    } else {
      out.push({ kind: "px", x, y, color: e.color, alpha: 0.5 });
    }
  });
  return out;
}

function glints(e: GlintsEffect, now: number): Shape[] {
  const seed = seedOf(e.id);
  const out: Shape[] = [];
  for (let j = 0; j < e.count; j++) {
    const t = now / e.lifeMs + hashRandom(seed, j);
    const life = Math.floor(t);
    const p = t - life;
    const len = e.length * Math.sin(Math.PI * p);
    if (len < 0.5) continue;
    const cx = e.area.x + hashRandom(seed, j, life, 1) * e.area.w;
    const cy = e.area.y + hashRandom(seed, j, life, 2) * e.area.h;
    out.push({
      kind: "rect",
      x: cx - len / 2,
      y: cy,
      w: len,
      h: 0.5,
      color: e.color,
    });
  }
  return out;
}

/** Which lamps are lit at step `step`. */
export function litLamps(e: LampsEffect, step: number): boolean[] {
  const n = e.points.length;
  const seed = seedOf(e.id);
  return e.points.map((_, i) => {
    switch (e.pattern) {
      case "chase":
        return i === ((step % n) + n) % n;
      case "alternate":
        return (i + step) % 2 === 0;
      case "random":
        return hashRandom(seed, i, step) >= 0.5;
    }
  });
}

function lamps(e: LampsEffect, now: number): Shape[] {
  const lit = litLamps(e, Math.floor(now / e.stepMs));
  const out: Shape[] = [];
  e.points.forEach(([x, y], i) => {
    const color = lit[i] ? e.on : e.off;
    if (color) out.push({ kind: "rect", x, y, w: e.size, h: e.size, color });
  });
  return out;
}

/** Flaps flip every this many ms while a row flutters. */
const FLAP_MS = 70;

function flutter(e: FlutterEffect, now: number): Shape[] {
  const t = now % e.everyMs;
  const out: Shape[] = [];
  e.rows.forEach((row, r) => {
    const local = t - r * (e.staggerMs ?? 60);
    if (local < 0 || local >= e.durationMs) return;
    // A flap falls from the top edge to the hinge in the middle.
    const p = (local % FLAP_MS) / FLAP_MS;
    const mid = row.y + row.h / 2;
    const top = row.y + (mid - row.y) * p;
    out.push({
      kind: "rect",
      x: row.x,
      y: top,
      w: row.w,
      h: mid - top,
      color: e.face,
    });
    out.push({
      kind: "rect",
      x: row.x,
      y: top,
      w: row.w,
      h: 0.5,
      color: e.edge,
    });
    out.push({
      kind: "rect",
      x: row.x,
      y: mid,
      w: row.w,
      h: 0.5,
      color: e.edge,
    });
  });
  return out;
}

// The approved preview's glyph, sampled on the density-2 artwork grid.
const MUSIC_NOTE = [
  "0001100",
  "0001110",
  "0001011",
  "0001000",
  "0001000",
  "0111000",
  "1111000",
  "0110000",
];

function musicNotes(effect: MusicNotesEffect, now: number): Shape[] {
  const seconds = Math.floor((now * 12) / 1000) / 12;
  const out: Shape[] = [];
  for (let i = 0; i < 2; i++) {
    const p = (seconds / 3.6 + i / 2) % 1;
    const x = effect.x - 11 * p + Math.sin(p * Math.PI * 2 + i) * 1.5;
    const y = effect.y - 20 * p;
    const alpha = Math.min(1, p * 7, (1 - p) * 4) * 0.92;
    if (alpha <= 0) continue;
    // Shadow first, then the entire glyph, so adjoining pixels stay crisp.
    for (const shadow of [true, false]) {
      MUSIC_NOTE.forEach((row, dy) => {
        for (let dx = 0; dx < row.length; dx++) {
          if (row[dx] !== "1") continue;
          out.push({
            kind: "rect",
            x: x + dx / 2,
            y: y + (dy + (shadow ? 1 : 0)) / 2,
            w: shadow ? 1 : 0.5,
            h: shadow ? 1 : 0.5,
            color: shadow ? "#2b1c18" : effect.colors[i],
            alpha,
          });
        }
      });
    }
  }
  return out;
}

function pendulum(e: PendulumEffect, now: number): Shape[] {
  const angle = e.angle * Math.sin((now / e.periodMs) * Math.PI * 2);
  const x = e.x + Math.sin(angle) * e.length;
  const y = e.y + Math.cos(angle) * e.length;
  return [
    { kind: "line", x1: e.x, y1: e.y, x2: x, y2: y, color: e.edge },
    {
      kind: "line",
      x1: e.x + 0.25,
      y1: e.y,
      x2: x + 0.25,
      y2: y,
      color: e.color,
    },
    { kind: "disc", x, y, r: e.radius, color: e.edge },
    { kind: "disc", x, y, r: e.radius - 0.4, color: e.color },
    {
      kind: "disc",
      x: x - 0.25,
      y: y - 0.35,
      r: e.radius * 0.35,
      color: e.highlight,
    },
  ];
}

function sleep(e: SleepEffect, now: number): Shape[] {
  return Array.from({ length: 3 }, (_, i) => {
    const phase = ((now % e.periodMs) / e.periodMs + i / 3) % 1;
    const x = e.x + phase * e.drift;
    const y = e.y - phase * e.rise;
    const size = 1.5 + phase * 2;
    const alpha = Math.min(1, phase * 8, (1 - phase) * 5);
    return [
      {
        kind: "line" as const,
        x1: x,
        y1: y,
        x2: x + size,
        y2: y,
        color: e.color,
        alpha,
      },
      {
        kind: "line" as const,
        x1: x + size,
        y1: y,
        x2: x,
        y2: y + size,
        color: e.color,
        alpha,
      },
      {
        kind: "line" as const,
        x1: x,
        y1: y + size,
        x2: x + size,
        y2: y + size,
        color: e.color,
        alpha,
      },
    ];
  }).flat();
}

/** The shapes an effect draws at engine time `now` (ms). */
export function effectShapes(
  effect: SceneEffect,
  now: number,
  reducedMotion = false,
): Shape[] {
  if (reducedMotion && effect.hideForReducedMotion) return [];
  switch (effect.kind) {
    case "music-notes":
      return musicNotes(effect, now);
    case "pendulum":
      return pendulum(effect, reducedMotion ? 0 : now);
    case "sleep":
      return sleep(effect, reducedMotion ? effect.periodMs / 6 : now);
    case "rain":
      return rain(effect, now);
    case "steam":
      return steam(effect, now);
    case "stars":
      return stars(effect, now);
    case "glints":
      return glints(effect, now);
    case "lamps":
      return lamps(effect, now);
    case "flutter":
      return flutter(effect, now);
  }
}

/** True when a repeating cycle of `period` starting at `delay` begins in `(from, to]`. */
function started(period: number, delay: number, from: number, to: number) {
  if (to < delay) return false;
  const p = Math.max(1, period);
  return Math.floor((to - delay) / p) > Math.floor((from - delay) / p);
}

/**
 * True when an effect with a sound (the flutter) starts a cycle in the
 * engine time range `(from, to]`. The start at time 0 doesn't count.
 */
export function effectCycleStarted(
  effect: SceneEffect,
  from: number,
  to: number,
): boolean {
  return effect.kind === "flutter" && started(effect.everyMs, 0, from, to);
}

// --- Moving props ------------------------------------------------------------

export interface PropFrame {
  /** Sprite top-left, logical px. */
  x: number;
  y: number;
  scale: number;
  /** Strip frame. */
  frame: number;
  /** Mirrored (travelling left, with `faceTravel`). */
  flip: boolean;
}

const EASE: Record<NonNullable<MovingProp["ease"]>, (t: number) => number> = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
};

/** How often the prop sets off (ms). */
function propPeriod(prop: MovingProp): number {
  return Math.max(prop.everyMs ?? prop.durationMs, prop.durationMs, 1);
}

/**
 * Where a moving prop is at engine time `now` (ms), or null while it's
 * between passes (or before its first, at `delayMs`).
 */
export function propFrame(prop: MovingProp, now: number): PropFrame | null {
  const t = now - (prop.delayMs ?? 0);
  if (t < 0 || prop.path.length === 0) return null;
  const local = t % propPeriod(prop);
  if (local > prop.durationMs) return null;
  const p = EASE[prop.ease ?? "linear"](local / prop.durationMs);
  const keys = prop.path;
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].at <= p) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const span = b.at - a.at;
  const w = span > 0 ? Math.max(0, Math.min(1, (p - a.at) / span)) : 1;
  const lerp = (u: number, v: number) => u + (v - u) * w;
  return {
    x: lerp(a.x, b.x),
    y: lerp(a.y, b.y),
    scale: lerp(a.scale ?? 1, b.scale ?? 1),
    frame:
      prop.frames && prop.frames > 1
        ? Math.floor(local / (prop.frameMs ?? 100)) % prop.frames
        : 0,
    flip: Boolean(prop.faceTravel) && b.x < a.x,
  };
}

/**
 * True when a prop sets off in the engine time range `(from, to]`: when to
 * play its `sound`. A pass at time 0 doesn't count; one after `delayMs`
 * does.
 */
export function propPassStarted(
  prop: MovingProp,
  from: number,
  to: number,
): boolean {
  return started(propPeriod(prop), prop.delayMs ?? 0, from, to);
}
