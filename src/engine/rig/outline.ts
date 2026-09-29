/**
 * The puppet's outline (docs/art-spec.md, "Phase H", "Character"): one solid
 * 1 px ink line around the whole posed figure, as MI3 drew its sprites, and
 * none where its parts overlap.
 *
 * The parts are painted with an ink ring of their own, except at their
 * joint ends (scripts/assets/rigpaint.ts), so at rest the ring is already
 * there. This pass makes it true in every pose: once the posed parts are
 * composited and their alpha is hard, every pixel on the figure's edge
 * becomes ink, so a knee or elbow that bends, a limb that swings clear of
 * the body, and a figure scaled down for depth all keep the same continuous
 * outline, never thinned, dotted or anti-aliased. It also tidies the edge
 * first: a pixel sticking out on its own is dropped and a one-pixel notch is
 * filled, so rotating the parts never leaves stray dots.
 */
import { RIG_INK } from "../rigTypes";

const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * Outlines an RGBA image whose alpha is already hard (0 or 255), in place.
 * The image needs a transparent margin of one pixel round the figure.
 */
export function outlineSilhouette(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  snapped?: Uint8Array,
): void {
  const opaque = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height
      ? data[(y * width + x) * 4 + 3] === 255
      : false;
  const around = (x: number, y: number) =>
    N4.filter(([dx, dy]) => opaque(x + dx, y + dy)).length;

  // Tidy the edge: notches filled from a neighbour, spurs dropped.
  const fill: number[] = [];
  const drop: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = around(x, y);
      if (opaque(x, y)) {
        if (n <= 1) drop.push(y * width + x);
      } else if (n >= 3) {
        fill.push(y * width + x);
      }
    }
  }
  for (const p of fill) {
    const x = p % width;
    const y = (p - x) / width;
    const [dx, dy] = N4.find(([a, b]) => opaque(x + a, y + b)) ?? [0, 0];
    const q = ((y + dy) * width + x + dx) * 4;
    data.copyWithin(p * 4, q, q + 4);
  }
  for (const p of drop) data[p * 4 + 3] = 0;

  const edge: number[] = [];
  const onEdge = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (opaque(x, y) && around(x, y) < 4) {
        edge.push(y * width + x);
        onEdge[y * width + x] = 1;
      }
    }
  }
  thinDoubledInk(data, width, height, onEdge);
  for (const p of edge) {
    data[p * 4] = RIG_INK[0];
    data[p * 4 + 1] = RIG_INK[1];
    data[p * 4 + 2] = RIG_INK[2];
    data[p * 4 + 3] = 255;
  }
  // Drawn detail the smoothing thinned to grey (a pupil at depth scale 0.8)
  // is set back to solid ink, the way the outline is.
  if (snapped) {
    for (let p = 0; p < width * height; p++) {
      if (snapped[p] !== 1 || data[p * 4 + 3] !== 255) continue;
      data[p * 4] = RIG_INK[0];
      data[p * 4 + 1] = RIG_INK[1];
      data[p * 4 + 2] = RIG_INK[2];
    }
  }
}

/** Within this much of RIG_INK on every channel, a pixel counts as ink. */
const INK_NEAR = 26;

const isInk = (data: Uint8ClampedArray, p: number) =>
  Math.abs(data[p * 4] - RIG_INK[0]) <= INK_NEAR &&
  Math.abs(data[p * 4 + 1] - RIG_INK[1]) <= INK_NEAR &&
  Math.abs(data[p * 4 + 2] - RIG_INK[2]) <= INK_NEAR;

/**
 * The parts carry a ring of ink of their own, which lies exactly on the
 * figure's edge at rest and full size. Rotated, or scaled down for depth,
 * it can land one pixel inside the edge, and with the edge inked that would
 * be a 2 px line. So ink right behind the edge takes the colour of the
 * nearest fill behind it. (The edge pixels themselves are inked afterwards.)
 */
function thinDoubledInk(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  onEdge: Uint8Array,
): void {
  const behind: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (onEdge[p] || data[p * 4 + 3] !== 255 || !isInk(data, p)) continue;
      if (N4.some(([dx, dy]) => onEdge[(y + dy) * width + x + dx] === 1))
        behind.push(p);
    }
  }
  const colours: [number, number, number][] = [];
  for (const p of behind) {
    const x = p % width;
    const y = (p - x) / width;
    let best: number | null = null;
    // The nearest opaque, non-ink, non-edge pixel within two steps.
    for (let r = 1; r <= 2 && best === null; r++) {
      for (let dy = -r; dy <= r && best === null; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
          const q = yy * width + xx;
          if (onEdge[q] || data[q * 4 + 3] !== 255 || isInk(data, q)) continue;
          best = q;
          break;
        }
      }
    }
    colours.push(
      best === null
        ? [data[p * 4], data[p * 4 + 1], data[p * 4 + 2]]
        : [data[best * 4], data[best * 4 + 1], data[best * 4 + 2]],
    );
  }
  behind.forEach((p, i) => {
    data[p * 4] = colours[i][0];
    data[p * 4 + 1] = colours[i][1];
    data[p * 4 + 2] = colours[i][2];
  });
}
