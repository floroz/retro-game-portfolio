/**
 * Draws the cut-out rig (docs/art-spec.md, "Phase H"), as MI3 drew its
 * sprites: on the art's own pixel grid, with hard edges.
 *
 * The parts are posed (transform.ts) and rasterized onto a scratch canvas
 * at the grid's resolution, 2 px per logical px for the 640x320 art, with
 * smoothing inside the grid so rotated parts keep clean colour. Then every
 * pixel is made fully opaque or fully transparent, and the result is
 * stamped onto the scene on whole grid pixels, nearest-neighbour. The CSS
 * 2x upscale then keeps him crisp, on the same pixel grid as the scene.
 */
import type { RigState } from "./animator";
import { placeRig, type Rig } from "./rig";
import { apply } from "./transform";

/** Alpha at or above this is ink; below it, nothing. */
const ALPHA_CUT = 128;

let scratchCanvas: HTMLCanvasElement | null = null;

function scratch(w: number, h: number): CanvasRenderingContext2D | null {
  const c = scratchCanvas ?? document.createElement("canvas");
  scratchCanvas = c;
  if (c.width < w || c.height < h) {
    c.width = Math.max(c.width, w);
    c.height = Math.max(c.height, h);
  }
  const sctx = c.getContext("2d", { willReadFrequently: true });
  if (!sctx) return null;
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, w, h);
  return sctx;
}

/**
 * Snaps partial alpha to 0 or 255, for hard sprite edges. `data` is RGBA,
 * not premultiplied, as `getImageData` returns it.
 */
export function hardenAlpha(data: Uint8ClampedArray, cut = ALPHA_CUT) {
  for (let i = 3; i < data.length; i += 4) {
    data[i] = data[i] >= cut ? 255 : 0;
  }
}

/**
 * Daniele with his feet on logical `x`,`y`, at depth `scale` (1 is his own
 * size, `rig.figureHeight` logical px tall), on `ctx`, whose transform is in
 * logical px. `grid` is the art's pixels per logical px (2 at 640x320).
 */
export function drawRig(
  ctx: CanvasRenderingContext2D,
  atlas: CanvasImageSource,
  rig: Pick<Rig, "facings" | "density">,
  state: RigState,
  x: number,
  y: number,
  scale: number,
  grid = 2,
) {
  const parts = placeRig(rig, state.facing, state.pose);
  // Atlas px to grid px, feet at the origin.
  const k = (scale / rig.density) * grid;
  const sx = state.mirror ? -k : k;

  // The posed figure's box, in grid px from the feet.
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const { frame: f, matrix: m } of parts) {
    for (const [cx, cy] of [
      [0, 0],
      [f.w, 0],
      [0, f.h],
      [f.w, f.h],
    ]) {
      const p = apply(m, { x: cx - f.pivot.x, y: cy - f.pivot.y });
      x0 = Math.min(x0, p.x * sx);
      x1 = Math.max(x1, p.x * sx);
      y0 = Math.min(y0, p.y * k);
      y1 = Math.max(y1, p.y * k);
    }
  }
  if (!Number.isFinite(x0)) return;
  const left = Math.floor(x0) - 1;
  const top = Math.floor(y0) - 1;
  const w = Math.ceil(x1) + 1 - left;
  const h = Math.ceil(y1) + 1 - top;
  if (w < 1 || h < 1) return;

  const sctx = scratch(w, h);
  if (!sctx) return;
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = "high";
  sctx.setTransform(sx, 0, 0, k, -left, -top);
  for (const { frame: f, matrix: m } of parts) {
    sctx.save();
    sctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    sctx.drawImage(atlas, f.x, f.y, f.w, f.h, -f.pivot.x, -f.pivot.y, f.w, f.h);
    sctx.restore();
  }
  const image = sctx.getImageData(0, 0, w, h);
  hardenAlpha(image.data);
  sctx.putImageData(image, 0, 0);

  // Stamp it on whole grid pixels.
  const feetX = Math.round(x * grid);
  const feetY = Math.round(y * grid);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sctx.canvas,
    0,
    0,
    w,
    h,
    (feetX + left) / grid,
    (feetY + top) / grid,
    w / grid,
    h / grid,
  );
  ctx.restore();
}
