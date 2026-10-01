/**
 * Stamping transformed art onto the art's pixel grid (hard pixels, never
 * smooth). Anything rotated or scaled, such as the rig's parts or a plane
 * shrinking into the distance, is painted on a scratch canvas at the grid's own
 * resolution, its alpha made 0 or 255, then drawn on whole grid pixels,
 * nearest-neighbour. The CSS 2x upscale then keeps it crisp and on the same
 * grid as the scene.
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

const scratchCanvases = new WeakMap<object, HTMLCanvasElement[]>();

function scratch(
  owner: object,
  w: number,
  h: number,
  which = 0,
): CanvasRenderingContext2D | null {
  const canvases = scratchCanvases.get(owner) ?? [];
  scratchCanvases.set(owner, canvases);
  const c = canvases[which] ?? document.createElement("canvas");
  canvases[which] = c;
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
 * transform. `finish`, if given, edits the hardened pixels (RGBA, not
 * premultiplied) before they are stamped. `snap`, if given, paints thin
 * detail (a 1 px pupil) into a second scratch the same way, and `finish` gets
 * a mask of the pixels it covers by `snap.cut` (0 to 1) or more, which smoothing
 * the main image would otherwise have blurred away.
 * Each stable `owner` keeps its own scratch pair: reusing one source canvas
 * for unrelated sprites can make WebKit's deferred draws show the next
 * sprite's pixels at the previous sprite's position.
 */
export function stampOnGrid(
  ctx: CanvasRenderingContext2D,
  owner: object,
  grid: number,
  box: GridBox,
  paint: (sctx: CanvasRenderingContext2D) => void,
  finish?: (
    data: Uint8ClampedArray,
    w: number,
    h: number,
    snapped?: Uint8Array,
  ) => void,
  snap?: { paint: (sctx: CanvasRenderingContext2D) => void; cut: number },
  softEdges = false,
) {
  const { left, top, w, h } = box;
  if (w < 1 || h < 1) return;
  const sctx = scratch(owner, w, h);
  if (!sctx) return;
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = "high";
  sctx.save();
  paint(sctx);
  sctx.restore();
  const image = sctx.getImageData(0, 0, w, h);
  if (!softEdges) hardenAlpha(image.data);
  let snapped: Uint8Array | undefined;
  if (snap) {
    const s2 = scratch(owner, w, h, 1);
    if (s2) {
      s2.imageSmoothingEnabled = true;
      s2.imageSmoothingQuality = "low";
      s2.save();
      snap.paint(s2);
      s2.restore();
      const detail = s2.getImageData(0, 0, w, h).data;
      snapped = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++)
        snapped[i] = detail[i * 4 + 3] >= snap.cut * 255 ? 1 : 0;
    }
  }
  finish?.(image.data, w, h, snapped);
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
