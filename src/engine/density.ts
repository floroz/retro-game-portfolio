/**
 * Pixel density (docs/art-spec.md, "Phase R: Remaster" and "Phase H: HD
 * hand-painted"). Scene data is in logical px (320x160) at any density. An
 * image at density 1 has one pixel per logical px, as all the art had before
 * the remaster. An image at density 2 has two pixels per logical px in each
 * direction: a 640x320 background, a 64x128 character cell. Density 4 is
 * Phase H's hand-painted HD art: a 1280x640 background, drawn smoothly
 * rather than as pixel art (see `isSmooth`).
 *
 * The engine works out each image's density from its size, so remastered
 * files can replace the old ones in place, one scene at a time, with no
 * change to scene data:
 *
 * - a background (and a foreground) is 320x160 logical px;
 * - an object, exit, state, or animation strip has its scene background's
 *   density, because a scene is remastered as a whole;
 * - a shared sprite (slots, folds, the map plane and marker) has the
 *   logical size of its density-1 original, in `SHARED_LOGICAL_SIZES`;
 * - the character sheet says so in `daniele.json` (see `character.ts`).
 */

/** Image pixels per logical px, in each direction. */
export type Density = 1 | 2 | 4;

/** Every density the engine can draw, lowest first. */
const DENSITIES: readonly Density[] = [1, 2, 4];

/**
 * True for HD art (density 4), which is painted, not pixelled: it's drawn
 * with high-quality smoothing on a canvas backed at display resolution.
 * Density 1 and 2 stay pixel art, drawn nearest-neighbour.
 */
export function isSmooth(d: Density): boolean {
  return d >= 4;
}

export interface Size {
  w: number;
  h: number;
}

/**
 * The density at which an image of `pixels` best matches `logical`: the one
 * whose logical size comes closest in both directions. It tolerates a few
 * pixels of difference (a cutout redrawn a little wider) because the
 * densities are a factor of two apart, so anything within about 40% of
 * a density's size is unambiguous.
 */
export function detectDensity(pixels: Size, logical: Size): Density {
  let best: Density = 1;
  let bestError = Infinity;
  for (const d of DENSITIES) {
    const error = Math.max(
      Math.abs(Math.log(pixels.w / d / logical.w)),
      Math.abs(Math.log(pixels.h / d / logical.h)),
    );
    if (error < bestError) {
      best = d;
      bestError = error;
    }
  }
  return best;
}

/**
 * Rounds a logical coordinate to the pixel grid of an image at density `d`:
 * whole logical px at density 1, as before the remaster, half logical px
 * at density 2, and a quarter at density 4 (one display pixel at 1280x640).
 */
export function snap(v: number, d: Density): number {
  return Math.round(v * d) / d;
}

/**
 * Logical size of each shared sprite, from its density-1 original. RB6
 * redraws them at twice these sizes and keeps the footprint.
 */
export const SHARED_LOGICAL_SIZES: Readonly<Record<string, Size>> = {
  "map-marker": { w: 7, h: 7 },
  "map-plane": { w: 136, h: 17 },
  "slot-magnet": { w: 8, h: 7 },
  "slot-magnet-more": { w: 12, h: 11 },
  "slot-photo-frame": { w: 20, h: 16 },
  "slot-photo-frame-more": { w: 20, h: 16 },
  "slot-tap": { w: 7, h: 16 },
  "slot-tap-more": { w: 11, h: 16 },
};
