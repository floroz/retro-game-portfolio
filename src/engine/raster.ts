/**
 * Stamping transformed art onto the art's pixel grid (docs/art-spec.md,
 * "Phase H": hard pixels, never smooth). Anything rotated or scaled, such
 * as the rig's parts or a plane shrinking into the distance, is painted on
 * a scratch canvas at the grid's own resolution, its alpha made 0 or 255,
 * then drawn on whole grid pixels, nearest-neighbour. The CSS 2x upscale
 * then keeps it crisp and on the same grid as the scene.
 */

/** Alpha at or above this is ink; below it, nothing. */
const ALPHA_CUT = 128;

/**
 * Snaps partial alpha to 0 or 255, for hard sprite edges. `data` is RGBA,
 * not premultiplied, as `getImageData` returns it.
 */
export function hardenAlpha(data: Uint8ClampedArray, cut = ALPHA_CUT) {
  for (let i = 3; i < data.length; i += 4) {
    data[i] = data[i] >= cut ? 255 : 0;
  }
}

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

/** A box of whole grid pixels. */
export interface GridBox {
  left: number;
  top: number;
  w: number;
  h: number;
}

/**
 * Paints with `paint` into a scratch canvas whose pixel (0, 0) is grid
 * pixel (`box.left`, `box.top`), hardens its alpha, and draws it on `ctx`
 * (whose transform is in logical px) at `grid` pixels per logical px. The
 * scratch context comes smoothing-enabled (high quality) with an identity
 * transform.
 */
export function stampOnGrid(
  ctx: CanvasRenderingContext2D,
  grid: number,
  box: GridBox,
  paint: (sctx: CanvasRenderingContext2D) => void,
) {
  const { left, top, w, h } = box;
  if (w < 1 || h < 1) return;
  const sctx = scratch(w, h);
  if (!sctx) return;
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = "high";
  sctx.save();
  paint(sctx);
  sctx.restore();
  const image = sctx.getImageData(0, 0, w, h);
  hardenAlpha(image.data);
  sctx.putImageData(image, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sctx.canvas,
    0,
    0,
    w,
    h,
    left / grid,
    top / grid,
    w / grid,
    h / grid,
  );
  ctx.restore();
}
