/**
 * Logical scene size (docs/art-spec.md, "Resolution and coordinates"). All
 * scene data is in these px, whatever the density of the art (density.ts).
 */
export const NATIVE_W = 320;
export const NATIVE_H = 160;

/**
 * Canvas pixels per logical px. The canvas is 640x320, so density-2 art
 * and the pixel font draw 1:1, and density-1 art draws at 2x
 * nearest-neighbour, exactly as it looked on the old 320x160 canvas.
 */
const RENDER_SCALE = 2;
export const CANVAS_W = NATIVE_W * RENDER_SCALE;
export const CANVAS_H = NATIVE_H * RENDER_SCALE;
/**
 * Logical viewport: a 1280x640 scene over a 1280x160 toolbar. The Win95
 * window scales it to fit; game code never sees screen pixels.
 */
export const VIEWPORT = {
  width: 1280,
  height: 800,
  sceneHeight: 640,
  toolbarHeight: 160,
} as const;

/**
 * The Phase H world scale (docs/art-spec.md, "Phase H: HD hand-painted",
 * the scale sheet): Daniele stands 72 logical px tall at the front of the
 * walkbox and 58 at the back. HD scenes spread it into `depth`:
 * `depth: { farY: 108, nearY: 156, ...HD_WORLD_SCALE }`.
 */
export const HD_WORLD_SCALE = { farHeight: 58, nearHeight: 72 } as const;

/** Logical scene px to logical viewport px (1280x640). */
const PIXEL_SCALE = 4;

/**
 * Walking speed in native px per second: 350 logical px/s, as in v1.
 * Walk frames advance by distance, so the feet keep up at any speed.
 */
export const WALK_SPEED = 350 / PIXEL_SCALE;

/**
 * Longest a shortcut walk may take, in seconds (docs/expansion-plan.md,
 * "Verb shortcuts"). Longer walks speed up to fit.
 */
export const MAX_TRAVEL_TIME = 1.5;

export const IRIS_MS = 400;
export const IRIS_HOLD_MS = 120;

/** Widest speech line, in native px. */
export const SPEECH_WIDTH = 220;

/** Speech stays up for this long, plus per character. */
export function speechMs(text: string) {
  return Math.max(1500, 800 + text.length * 55);
}

/** Colours from the core palette (assets-src/palette/master.hex). */
export const CORE = {
  black: "#0f0d12",
  paper: "#e8dcc8",
  brass: "#e0b040",
  red: "#c8483a",
  navy: "#21283c",
} as const;
