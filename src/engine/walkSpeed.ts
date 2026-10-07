/**
 * How fast Daniele walks at the Phase H world scale.
 *
 * Adventure games slow the character down with depth: a walker who is small
 * because he's far away covers proportionally less of the screen, so he
 * covers the same number of body-heights a second everywhere. Otherwise, in
 * the Hall (34 px at the gates, 64 at the front) he'd cross 2.6 body-heights
 * a second at the back against 1.6 at the front, and scurry.
 *
 * Everything here is in "ground" distance: a screen displacement (dx, dy)
 * is `hypot(dx, dy / VERTICAL_SPEED)` along the floor, and Daniele covers
 * `WALK_SPEED * depthFactor` of it a second. Moving across the screen at
 * the front edge is the plain `WALK_SPEED`.
 *
 * The walk animations still advance by the *screen* distance moved (and
 * scale with depth): their frames are drawn in screen px, so that is what
 * keeps the feet planted, going up the screen as well as across it. Because
 * the pace and the stride both shrink with his height, his step rate is the
 * same at every depth.
 */
import { VERTICAL_SPEED, WALK_SPEED } from "./constants";
import { heightAt } from "./geometry";
import type { DepthScale } from "./types";

/**
 * His height with feet at `y`, over his height at the front edge: 1 at
 * `nearY`, less further back. Independent of the character's own size.
 */
export function depthFactor(depth: DepthScale, y: number): number {
  const near = heightAt(depth, depth.nearY, 1);
  return near > 0 ? heightAt(depth, y, 1) / near : 1;
}

/** Ground speed in px/s with feet at `y`. */
export function groundSpeed(depth: DepthScale, y: number): number {
  return WALK_SPEED * depthFactor(depth, y);
}

/** Ground distance covered by a screen displacement. */
export function groundDistance(dx: number, dy: number): number {
  return Math.hypot(dx, dy / VERTICAL_SPEED);
}
