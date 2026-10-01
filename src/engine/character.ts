/**
 * Daniele's sprite sheet (`src/assets/character/daniele.json`, written by
 * `npm run assets:pack`) and its animation rules:
 *
 * - walk frames advance by distance moved, one frame every `stride / 8`
 *   native px (scaled with the sprite), so the feet never slide;
 * - idle holds 2-4 s between a breath and a 120 ms blink;
 * - use reaches out for 150 ms, holds while the action runs, then returns;
 * - talk overlays a 16x16 head, a random mouth every 100-140 ms, only idle;
 * - west is east mirrored.
 *
 * Density (Phase R, the remaster): a density-1 sheet has 32x64 cells with the
 * feet on row 61; a density-2 sheet has 64x128 cells with the feet on row 123.
 * Everything in `daniele.json` is in sheet pixels, as `assets:pack` writes it:
 * `origin`, `talkHeadOffset`, `frames`, and `stride`, so a density-2 sheet has
 * twice the stride in pixels for the same logical stride. `parseSheet` turns
 * the stride into logical px, like every distance the engine walks. The sheet
 * states its `density` at 2; without one, it's read from the cell size.
 */
import { detectDensity, type Density } from "./density";
import type { Facing, Rect } from "./types";

type Timing =
  | { mode: "distance" }
  | { mode: "idle"; holdMs: [number, number]; blinkMs: number }
  | { mode: "static" }
  | { mode: "use"; reachMs: number }
  | { mode: "random"; frameMs: [number, number] };

interface TagRange {
  from: number;
  to: number;
  timing: Timing;
}

export interface CharacterSheet {
  /** URL of the packed sheet image. */
  image: string;
  /** Sheet pixels per logical px. */
  density: Density;
  /** Feet, in sheet pixels from a cell's top-left. */
  origin: { x: number; y: number };
  /** Logical px a foot travels in one `walk-e` cycle. */
  stride: number;
  /**
   * Standing height at scale 1, feet to the top of the hair, in logical px:
   * what a scene's `farHeight` and `nearHeight` are measured against.
   */
  figureHeight: number;
  talkHeadOffset: { x: number; y: number };
  frames: Rect[];
  tags: Record<string, TagRange>;
}

const BODY_TAGS = [
  "walk-e",
  "walk-s",
  "walk-n",
  "idle-e",
  "idle-s",
  "idle-n",
  "use-e",
  "use-n",
  "talk-e",
  "talk-s",
] as const;

type Tag = (typeof BODY_TAGS)[number];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const isNum = (v: unknown): v is number => typeof v === "number";
const isPoint = (v: unknown): v is { x: number; y: number } =>
  isRecord(v) && isNum(v.x) && isNum(v.y);
const isRect = (v: unknown): v is Rect =>
  isRecord(v) && isNum(v.x) && isNum(v.y) && isNum(v.w) && isNum(v.h);
const isPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every(isNum);
const isDensity = (v: unknown): v is Density => v === 1 || v === 2;

/** A character cell at density 1, in logical px. */
const CELL = { w: 32, h: 64 } as const;

/**
 * The sprite's standing height in logical px, when `daniele.json` doesn't
 * give a `figureHeight` (in sheet px): 115 rows at density 2, from row 9 to
 * the feet on row 123.
 */
const SHEET_FIGURE_HEIGHT = 57.5;

function isTiming(v: unknown): v is Timing {
  if (!isRecord(v)) return false;
  switch (v.mode) {
    case "distance":
    case "static":
      return true;
    case "idle":
      return isPair(v.holdMs) && isNum(v.blinkMs);
    case "use":
      return isNum(v.reachMs);
    case "random":
      return isPair(v.frameMs);
    default:
      return false;
  }
}

/** Validates `daniele.json`, so a bad pack fails loudly at start-up. */
export function parseSheet(json: unknown, imageUrl: string): CharacterSheet {
  if (
    !isRecord(json) ||
    !isPoint(json.origin) ||
    !isNum(json.stride) ||
    !isPoint(json.talkHeadOffset) ||
    !Array.isArray(json.frames) ||
    !json.frames.every(isRect) ||
    !isRecord(json.tags) ||
    (json.figureHeight !== undefined && !isNum(json.figureHeight)) ||
    (json.density !== undefined && !isDensity(json.density))
  ) {
    throw new Error("daniele.json doesn't match the character sheet format");
  }
  const frames: Rect[] = json.frames;
  if (frames.length === 0) throw new Error("daniele.json has no frames");
  const tags: Record<string, TagRange> = {};
  for (const tag of BODY_TAGS) {
    const t = json.tags[tag];
    if (
      !isRecord(t) ||
      !isNum(t.from) ||
      !isNum(t.to) ||
      !isTiming(t.timing) ||
      t.from > t.to ||
      t.to >= frames.length
    ) {
      throw new Error(`daniele.json has no valid "${tag}" tag`);
    }
    tags[tag] = { from: t.from, to: t.to, timing: t.timing };
  }
  const density = isDensity(json.density)
    ? json.density
    : detectDensity(frames[0], CELL);
  return {
    image: imageUrl,
    density,
    origin: json.origin,
    stride: json.stride / density,
    figureHeight: isNum(json.figureHeight)
      ? json.figureHeight / density
      : SHEET_FIGURE_HEIGHT,
    talkHeadOffset: json.talkHeadOffset,
    frames,
    tags,
  };
}

export interface Pose {
  body: Rect;
  /** Draw mirrored (facing west). */
  mirror: boolean;
  /** Talk head to draw over the body, at `talkHeadOffset`. */
  head: Rect | null;
}

type Mode =
  | { kind: "idle"; step: number; left: number }
  | { kind: "walk"; walked: number; frame: number } // `walked` in frames
  | { kind: "use"; phase: "reach" | "hold" | "return"; left: number };

export interface AnimInput {
  moving: boolean;
  /** Native px moved this frame. */
  distance: number;
  /** Current depth scale of the sprite. */
  scale: number;
  facing: Facing;
  talking: boolean;
  /**
   * The line being spoken and how long ago it started, for the rig's
   * mouth shapes (rig/animator.ts). The sprite sheet picks random mouths.
   */
  speech?: { text: string; elapsedMs: number };
}

/** Idle cycle: neutral, breath, neutral, blink. */
const IDLE_STEPS = [0, 1, 0, 2] as const;

export class CharacterAnimator {
  private mode: Mode;
  private facing: Facing = "s";
  private talking = false;
  private talkFrame = 0;
  private talkLeft = 0;
  private readonly sheet: CharacterSheet;
  private readonly rng: () => number;

  constructor(sheet: CharacterSheet, rng: () => number = Math.random) {
    this.sheet = sheet;
    this.rng = rng;
    this.mode = { kind: "idle", step: 0, left: this.idleHold() };
  }

  private range(tag: Tag): TagRange {
    return this.sheet.tags[tag];
  }

  private between([lo, hi]: [number, number]) {
    return lo + (hi - lo) * this.rng();
  }

  private idleTiming(): { holdMs: [number, number]; blinkMs: number } {
    const t = this.range(this.facing === "s" ? "idle-s" : "idle-e").timing;
    return t.mode === "idle" ? t : { holdMs: [2000, 4000], blinkMs: 120 };
  }

  private idleHold() {
    return this.between(this.idleTiming().holdMs);
  }

  private reachMs() {
    const t = this.range("use-e").timing;
    return t.mode === "use" ? t.reachMs : 150;
  }

  private talkMs() {
    const t = this.range("talk-e").timing;
    return this.between(t.mode === "random" ? t.frameMs : [100, 140]);
  }

  /** Starts reaching towards an object. Holds until `releaseUse()`. */
  startUse() {
    this.mode = { kind: "use", phase: "reach", left: this.reachMs() };
  }

  releaseUse() {
    if (this.mode.kind === "use" && this.mode.phase !== "return") {
      this.mode = { kind: "use", phase: "return", left: this.reachMs() };
    }
  }

  get using() {
    return this.mode.kind === "use";
  }

  /** Advances the animation. Returns true when a foot touches the floor. */
  update(dtMs: number, input: AnimInput): boolean {
    this.facing = input.facing;
    this.talking = input.talking;
    let footstep = false;
    const mode = this.mode;

    if (input.moving) {
      const walk =
        mode.kind === "walk"
          ? mode
          : { kind: "walk" as const, walked: 0, frame: 0 };
      // `walked` counts frames, not px: perFrame shrinks as he walks into
      // the distance, and a px total divided by it would jump ahead.
      const count = this.walkCount();
      const perFrame = Math.max(0.5, (this.sheet.stride / 8) * input.scale);
      walk.walked += input.distance / perFrame;
      const frame = Math.floor(walk.walked) % count;
      if (frame !== walk.frame && (frame === 0 || frame === count / 2)) {
        footstep = true;
      }
      walk.frame = frame;
      this.mode = walk;
    } else if (mode.kind === "walk") {
      this.mode = { kind: "idle", step: 0, left: this.idleHold() };
    } else if (mode.kind === "idle") {
      mode.left -= dtMs;
      while (mode.left <= 0) {
        mode.step = (mode.step + 1) % IDLE_STEPS.length;
        const frame = IDLE_STEPS[mode.step];
        const { blinkMs } = this.idleTiming();
        mode.left +=
          frame === 2 ? blinkMs : frame === 1 ? 400 : this.idleHold();
      }
    } else if (mode.phase !== "hold") {
      mode.left -= dtMs;
      if (mode.left <= 0) {
        this.mode =
          mode.phase === "reach"
            ? { kind: "use", phase: "hold", left: 0 }
            : { kind: "idle", step: 0, left: this.idleHold() };
      }
    }

    if (this.talking && this.mode.kind === "idle") {
      this.talkLeft -= dtMs;
      if (this.talkLeft <= 0) {
        this.talkFrame = Math.floor(this.rng() * 3);
        this.talkLeft = this.talkMs();
      }
    } else {
      this.talkLeft = 0;
    }
    return footstep;
  }

  private walkCount() {
    const r = this.range(this.walkTag());
    return r.to - r.from + 1;
  }

  private walkTag(): Tag {
    return this.facing === "n"
      ? "walk-n"
      : this.facing === "s"
        ? "walk-s"
        : "walk-e";
  }

  private frameOf(tag: Tag, index: number): Rect {
    const r = this.range(tag);
    const i = Math.min(r.to, r.from + Math.max(0, index));
    return this.sheet.frames[i];
  }

  pose(): Pose {
    const mirror = this.facing === "w";
    const side = this.facing === "e" || this.facing === "w";
    const mode = this.mode;
    if (mode.kind === "walk") {
      return {
        body: this.frameOf(this.walkTag(), mode.frame),
        mirror,
        head: null,
      };
    }
    if (mode.kind === "use") {
      const tag: Tag = this.facing === "n" ? "use-n" : "use-e";
      return {
        body: this.frameOf(tag, mode.phase === "hold" ? 1 : 0),
        mirror,
        head: null,
      };
    }
    const idleTag: Tag = side
      ? "idle-e"
      : this.facing === "s"
        ? "idle-s"
        : "idle-n";
    const idleFrame = idleTag === "idle-n" ? 0 : IDLE_STEPS[mode.step];
    const head =
      this.talking && this.facing !== "n"
        ? this.frameOf(side ? "talk-e" : "talk-s", this.talkFrame)
        : null;
    return { body: this.frameOf(idleTag, idleFrame), mirror, head };
  }
}

/** Where a scaled cell lands, in sheet pixels (see `placeCell`). */
interface CellPlacement {
  left: number;
  top: number;
  w: number;
  h: number;
}

/**
 * Where a cell drawn at depth `scale` lands with its origin on the logical
 * point `x`,`y`, in the sheet's own pixels. It rounds on the sheet's grid:
 * whole logical px at density 1, exactly as before the remaster, and half
 * logical px at density 2.
 */
export function placeCell(
  sheet: Pick<CharacterSheet, "density" | "origin">,
  cell: Rect,
  x: number,
  y: number,
  scale: number,
): CellPlacement {
  const d = sheet.density;
  return {
    left: Math.round(x * d - sheet.origin.x * scale),
    top: Math.round(y * d - sheet.origin.y * scale),
    w: Math.round(cell.w * scale),
    h: Math.round(cell.h * scale),
  };
}

/** Facing for a movement vector: sideways wins unless it's mostly vertical. */
export function facingFor(dx: number, dy: number, current: Facing): Facing {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return current;
  if (Math.abs(dx) >= Math.abs(dy) * 0.8) return dx > 0 ? "e" : "w";
  return dy < 0 ? "n" : "s";
}
