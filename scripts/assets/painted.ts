/**
 * Painted density-2 assets (Phase H). Phase H art matches MI3's pixel density:
 * painted in full colour, authored at 640x320 (density 2 over the 320x160
 * logical grid), and shown at 2x with nearest-neighbour, so every art pixel is
 * a hard 2x2 block on screen. That needs three things the density-4 path
 * (hd.ts) doesn't do:
 *
 * 1. **Hard alpha** (`hardAlpha`): every pixel is fully opaque or fully
 *    transparent, with a threshold on the soft matte, so the silhouette is a
 *    clean 1px edge with no fringe and no stray specks.
 * 2. **At most 256 colours per scene, with no dithering** (`buildPalette`,
 *    `remapToPalette`): a weighted median cut in OKLab seeds a k-means
 *    refinement, then every pixel takes its nearest palette colour. With no
 *    error diffusion a painted gradient becomes smooth bands, never noise.
 * 3. **One palette across a scene's layers**: `buildPalette` takes several
 *    images at once (bg, fg, objects, props) and can keep a set of fixed
 *    colours (a bg that is already quantized), adding new ones only up to the
 *    budget.
 *
 * `preparePainted` runs hd.ts's key, crop, and resize, then these steps.
 * There's no master palette and no ramp: the scene's own colours are its
 * palette.
 */
import {
  blendOver,
  oklabToRgb,
  overCheckerboard,
  padBottomCentre,
  prepare,
  resizeLanczos,
  type PrepareOptions,
  type PrepareResult,
} from "./hd";
import {
  LOGICAL_SCENE_SIZE,
  blit,
  createImage,
  drawText,
  rgbToOklab,
  textWidth,
  upscale,
  type Image,
  type Oklab,
  type Rgb,
} from "./lib";

/** Painted art is density 2: two art px per logical px. */
export const PAINTED_DENSITY = 2;
/** A painted scene: 320x160 logical px at density 2. */
export const PAINTED_SCENE_SIZE = {
  w: LOGICAL_SCENE_SIZE.w * PAINTED_DENSITY,
  h: LOGICAL_SCENE_SIZE.h * PAINTED_DENSITY,
} as const;
/** The colour budget for one scene: every file in its folder together. */
export const MAX_PAINTED_COLOURS = 256;
/** Soft alpha at or above this becomes opaque; below it, transparent. */
export const DEFAULT_HARD_ALPHA_THRESHOLD = 128;

// --- Hard alpha --------------------------------------------------------------------------

export interface HardAlphaOptions {
  /** Alpha at or above this is opaque. Default 128. */
  threshold?: number;
  /**
   * Opaque pixels with fewer than this many opaque 8-neighbours are cleared
   * (dust left by the key). Default 1: only fully isolated pixels. 0 keeps all.
   */
  minNeighbours?: number;
}

export interface HardAlphaResult {
  image: Image;
  /** Pixels that had partial alpha before. */
  partial: number;
  /** Isolated opaque specks removed. */
  specks: number;
}

/**
 * Make every pixel fully opaque or fully transparent. Transparent pixels are
 * zeroed (0, 0, 0, 0), so no hidden colour counts toward the palette. The
 * colour of an edge pixel is kept as it is: hd.ts keys with unmixing and
 * resizes premultiplied, so it is already the figure's colour, not the key's.
 */
export function hardAlpha(
  img: Image,
  opts: HardAlphaOptions = {},
): HardAlphaResult {
  const threshold = opts.threshold ?? DEFAULT_HARD_ALPHA_THRESHOLD;
  const minNeighbours = opts.minNeighbours ?? 1;
  const { width: w, height: h } = img;
  const out: Image = { ...img, data: new Uint8ClampedArray(img.data) };
  const d = out.data;
  let partial = 0;
  const solid = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const a = d[p * 4 + 3];
    if (a > 0 && a < 255) partial++;
    solid[p] = a >= threshold ? 1 : 0;
  }
  let specks = 0;
  if (minNeighbours > 0) {
    const keep = solid.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (!solid[p]) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < w && yy < h && solid[yy * w + xx])
              n++;
          }
        }
        if (n < minNeighbours) {
          keep[p] = 0;
          specks++;
        }
      }
    }
    solid.set(keep);
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (solid[p]) d[i + 3] = 255;
    else d.fill(0, i, i + 4);
  }
  return { image: out, partial, specks };
}

/**
 * Pad a sprite with a transparent column on the right and a row at the
 * bottom as needed, so both sides are even (a whole number of logical px at
 * density 2). The top-left, and so its position in the scene, is unchanged.
 */
export function padToEven(img: Image): Image {
  const w = img.width + (img.width % 2);
  const h = img.height + (img.height % 2);
  if (w === img.width && h === img.height) return img;
  const out = createImage(w, h);
  for (let y = 0; y < img.height; y++) {
    const from = y * img.width * 4;
    out.data.set(img.data.subarray(from, from + img.width * 4), y * w * 4);
  }
  return out;
}

/** Pixels whose alpha is neither 0 nor 255. */
export function countPartialAlpha(img: Image): number {
  let n = 0;
  for (let i = 3; i < img.data.length; i += 4)
    if (img.data[i] > 0 && img.data[i] < 255) n++;
  return n;
}

// --- Colours -------------------------------------------------------------------------------

const pack = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;
const unpack = (c: number): Rgb => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

/** The distinct colours of every visible (alpha > 0) pixel across `images`, packed 0xRRGGBB. */
export function visibleColours(images: readonly Image[]): Set<number> {
  const set = new Set<number>();
  for (const img of images) {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4)
      if (d[i + 3] > 0) set.add(pack(d[i], d[i + 1], d[i + 2]));
  }
  return set;
}

export interface PaletteOptions {
  /** The total budget, fixed colours included. Default 256. */
  colours?: number;
  /** Colours that must be in the palette as they are (a quantized bg's). */
  fixed?: readonly Rgb[];
  /** k-means passes after the median cut. Default 12. */
  iterations?: number;
}

/** Weighted points in OKLab: 3 floats each, plus a weight. */
interface Points {
  lab: Float64Array;
  weight: Float64Array;
  n: number;
}

/**
 * Collect the visible pixels as weighted OKLab points. Colours are binned at
 * 6 bits per channel (each bin keeps the mean of its exact colours), which
 * keeps the point count small without moving any colour by more than a
 * quarter of a bin.
 */
function collectPoints(images: readonly Image[]): Points {
  const sums = new Map<number, [number, number, number, number]>();
  const labCache = new Map<number, Oklab>();
  for (const img of images) {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const c = pack(d[i], d[i + 1], d[i + 2]);
      let lab = labCache.get(c);
      if (!lab) {
        lab = rgbToOklab([d[i], d[i + 1], d[i + 2]]);
        labCache.set(c, lab);
      }
      const bin =
        ((d[i] >> 2) << 12) | ((d[i + 1] >> 2) << 6) | (d[i + 2] >> 2);
      const s = sums.get(bin);
      if (s) {
        s[0] += lab[0];
        s[1] += lab[1];
        s[2] += lab[2];
        s[3]++;
      } else sums.set(bin, [lab[0], lab[1], lab[2], 1]);
    }
  }
  const n = sums.size;
  const lab = new Float64Array(n * 3);
  const weight = new Float64Array(n);
  let k = 0;
  for (const [L, a, b, count] of sums.values()) {
    lab[k * 3] = L / count;
    lab[k * 3 + 1] = a / count;
    lab[k * 3 + 2] = b / count;
    weight[k] = count;
    k++;
  }
  return { lab, weight, n };
}

/**
 * Weighted median cut in OKLab: repeatedly split the box with the largest
 * weighted squared error along its widest axis at the weighted median.
 * Returns up to `count` centres.
 */
function medianCut(points: Points, count: number): number[][] {
  const { lab, weight } = points;
  type Box = { idx: number[]; sse: number; axis: number; mean: number[] };
  const measure = (idx: number[]): Box => {
    let w = 0;
    const m = [0, 0, 0];
    for (const p of idx) {
      w += weight[p];
      for (let c = 0; c < 3; c++) m[c] += weight[p] * lab[p * 3 + c];
    }
    for (let c = 0; c < 3; c++) m[c] /= w || 1;
    const v = [0, 0, 0];
    for (const p of idx) {
      for (let c = 0; c < 3; c++) {
        const e = lab[p * 3 + c] - m[c];
        v[c] += weight[p] * e * e;
      }
    }
    const axis = v[0] >= v[1] && v[0] >= v[2] ? 0 : v[1] >= v[2] ? 1 : 2;
    return { idx, sse: v[0] + v[1] + v[2], axis, mean: m };
  };
  const all: number[] = [];
  for (let p = 0; p < points.n; p++) all.push(p);
  const boxes: Box[] = [measure(all)];
  while (boxes.length < count) {
    let best = -1;
    for (let b = 0; b < boxes.length; b++) {
      if (boxes[b].idx.length < 2) continue;
      if (best < 0 || boxes[b].sse > boxes[best].sse) best = b;
    }
    if (best < 0 || boxes[best].sse === 0) break;
    const box = boxes[best];
    const axis = box.axis;
    const sorted = [...box.idx].sort(
      (p, q) => lab[p * 3 + axis] - lab[q * 3 + axis],
    );
    const half = sorted.reduce((s, p) => s + weight[p], 0) / 2;
    let acc = 0;
    let cut = 1;
    for (let k = 0; k < sorted.length - 1; k++) {
      acc += weight[sorted[k]];
      if (acc >= half) {
        cut = k + 1;
        break;
      }
    }
    boxes.splice(
      best,
      1,
      measure(sorted.slice(0, cut)),
      measure(sorted.slice(cut)),
    );
  }
  return boxes.map((b) => b.mean);
}

/** Index of the nearest centre (squared OKLab distance) to a point. */
function nearest(
  centres: Float64Array,
  k: number,
  L: number,
  a: number,
  b: number,
) {
  let best = 0;
  let bestD = Infinity;
  for (let c = 0; c < k; c++) {
    const dL = centres[c * 3] - L;
    const da = centres[c * 3 + 1] - a;
    const db = centres[c * 3 + 2] - b;
    const dist = dL * dL + da * da + db * db;
    if (dist < bestD) {
      bestD = dist;
      best = c;
    }
  }
  return { index: best, dist: bestD };
}

/**
 * Build one palette of at most `colours` for every visible pixel across
 * `images` together (a scene's layers). If they already use few enough
 * distinct colours, those exact colours are the palette. Otherwise the fixed
 * colours are kept as they are, and the rest of the budget comes from a
 * weighted median cut in OKLab refined by k-means (fixed centres never move).
 */
export function buildPalette(
  images: readonly Image[],
  opts: PaletteOptions = {},
): Rgb[] {
  const budget = opts.colours ?? MAX_PAINTED_COLOURS;
  if (
    !(Number.isInteger(budget) && budget >= 1 && budget <= MAX_PAINTED_COLOURS)
  )
    throw new Error(
      `The colour budget is a whole number from 1 to ${MAX_PAINTED_COLOURS}, not ${budget}`,
    );
  const fixed = [...new Set((opts.fixed ?? []).map((c) => pack(...c)))];
  if (fixed.length > budget)
    throw new Error(
      `${fixed.length} fixed colours don't fit a budget of ${budget}`,
    );
  const exact = visibleColours(images);
  for (const c of fixed) exact.add(c);
  if (exact.size <= budget) return [...exact].map(unpack);
  const free = budget - fixed.length;
  if (free === 0) return fixed.map(unpack);

  const points = collectPoints(images);
  const k = fixed.length + free;
  const centres = new Float64Array(k * 3);
  fixed.forEach((c, i) => centres.set(rgbToOklab(unpack(c)), i * 3));
  const seeds = medianCut(points, free);
  seeds.forEach((m, i) => centres.set(m, (fixed.length + i) * 3));
  const used = fixed.length + seeds.length;

  const iterations = opts.iterations ?? 12;
  const assign = new Int32Array(points.n);
  for (let it = 0; it < iterations; it++) {
    const sum = new Float64Array(used * 4);
    let worst = -1;
    let worstD = -1;
    for (let p = 0; p < points.n; p++) {
      const L = points.lab[p * 3];
      const a = points.lab[p * 3 + 1];
      const b = points.lab[p * 3 + 2];
      const { index, dist } = nearest(centres, used, L, a, b);
      assign[p] = index;
      const w = points.weight[p];
      sum[index * 4] += w * L;
      sum[index * 4 + 1] += w * a;
      sum[index * 4 + 2] += w * b;
      sum[index * 4 + 3] += w;
      if (dist * w > worstD) {
        worstD = dist * w;
        worst = p;
      }
    }
    let moved = 0;
    for (let c = fixed.length; c < used; c++) {
      const w = sum[c * 4 + 3];
      if (w === 0) {
        // An empty cluster moves to the worst-served point.
        if (worst >= 0)
          centres.set(points.lab.subarray(worst * 3, worst * 3 + 3), c * 3);
        moved = Infinity;
        continue;
      }
      for (let ch = 0; ch < 3; ch++) {
        const v = sum[c * 4 + ch] / w;
        moved = Math.max(moved, Math.abs(v - centres[c * 3 + ch]));
        centres[c * 3 + ch] = v;
      }
    }
    if (moved < 1e-4) break;
  }
  const out = new Set<number>(fixed);
  for (let c = fixed.length; c < used; c++) {
    const [r, g, b] = oklabToRgb([
      centres[c * 3],
      centres[c * 3 + 1],
      centres[c * 3 + 2],
    ]);
    out.add(pack(r, g, b));
  }
  return [...out].map(unpack);
}

/**
 * Map every visible pixel to its nearest palette colour in OKLab, with no
 * dithering: equal colours in always give equal colours out, so a gradient
 * becomes bands. Transparent pixels are zeroed.
 */
export function remapToPalette(img: Image, palette: readonly Rgb[]): Image {
  if (palette.length === 0) throw new Error("remapToPalette: empty palette");
  const centres = new Float64Array(palette.length * 3);
  palette.forEach((c, i) => centres.set(rgbToOklab(c), i * 3));
  const out: Image = { ...img, data: new Uint8ClampedArray(img.data) };
  const d = out.data;
  const cache = new Map<number, number>();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) {
      d.fill(0, i, i + 4);
      continue;
    }
    const c = pack(d[i], d[i + 1], d[i + 2]);
    let index = cache.get(c);
    if (index === undefined) {
      const [L, a, b] = rgbToOklab([d[i], d[i + 1], d[i + 2]]);
      index = nearest(centres, palette.length, L, a, b).index;
      cache.set(c, index);
    }
    const [r, g, b] = palette[index];
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  return out;
}

/** Quantize several images to one shared palette (see buildPalette). */
export function quantizeJointly(
  images: readonly Image[],
  opts: PaletteOptions = {},
): { images: Image[]; palette: Rgb[] } {
  const palette = buildPalette(images, opts);
  return { images: images.map((img) => remapToPalette(img, palette)), palette };
}

// --- The whole pipeline ---------------------------------------------------------------

export interface PaintedOptions extends HardAlphaOptions {
  /** The colour budget for this image, fixed colours included. Default 256. */
  colours?: number;
  /** Keep these colours and add new ones only up to the budget (--palette-from). */
  fixed?: readonly Rgb[];
  /** Skip quantizing (for a joint pass with assets:quantize later). */
  quantize?: boolean;
}

export interface PaintedResult {
  image: Image;
  palette: Rgb[] | null;
  /** Distinct visible colours in the result. */
  colours: number;
  partial: number;
  specks: number;
}

/**
 * Finish an image as a painted density-2 asset: hard alpha, then (unless
 * `quantize` is false) the ≤256-colour remap with no dither.
 */
export function finishPainted(
  img: Image,
  opts: PaintedOptions = {},
): PaintedResult {
  const hard = hardAlpha(img, opts);
  let image = hard.image;
  let palette: Rgb[] | null = null;
  if (opts.quantize !== false) {
    palette = buildPalette([image], {
      colours: opts.colours,
      fixed: opts.fixed,
    });
    image = remapToPalette(image, palette);
  }
  return {
    image,
    palette,
    colours: visibleColours([image]).size,
    partial: hard.partial,
    specks: hard.specks,
  };
}

/**
 * Raw candidate to painted density-2 asset: hd.ts's key, crop, and resize
 * (scenes default to 640x320; sprite sizes are art px at density 2), then
 * `finishPainted`. Sprites that need `--align` should be aligned between
 * `prepare` and `finishPainted` instead, as prepare.ts does.
 */
export async function preparePainted(
  raw: Image,
  opts: PrepareOptions & PaintedOptions,
): Promise<PrepareResult & { painted: PaintedResult }> {
  const size =
    opts.kind === "scene" ? (opts.size ?? PAINTED_SCENE_SIZE) : opts.size;
  const result = await prepare(raw, { ...opts, size });
  const painted = finishPainted(result.image, opts);
  return { ...result, image: painted.image, painted };
}

/** Parse `--palette-from`'s images into fixed colours; throws past the budget. */
export function fixedColoursFrom(
  images: readonly Image[],
  budget = MAX_PAINTED_COLOURS,
): Rgb[] {
  const colours = visibleColours(images);
  if (colours.size > budget)
    throw new Error(
      `--palette-from: those files use ${colours.size} colours together, more than the ${budget} budget; quantize them first`,
    );
  return [...colours].map(unpack);
}

// --- Review sheets ----------------------------------------------------------------------

export interface PaintedSheetOptions {
  cols?: number;
  /** One label per image; default 01, 02, ... */
  labels?: string[];
  /** Blended over every tile (resized to the tile width, bottom-aligned). */
  overlay?: Image;
  overlayOpacity?: number;
  /** Shown first, alone, labelled REF. */
  reference?: Image;
  /** Display scale, nearest-neighbour. Default 2, as the engine shows it. */
  scale?: number;
}

/** A label in lib's 3x5 pixel font at twice its size. */
function label(text: string): Image {
  const small = createImage(textWidth(text) + 2, 7);
  drawText(small, text, 1, 1, [240, 240, 240]);
  return upscale(small, 2);
}

/**
 * A numbered review sheet for painted candidates, judged as they'll appear:
 * every image at its native size (never resampled), over a checkerboard so
 * its hard alpha shows, padded bottom-centre into equal cells, then the
 * whole sheet scaled by `scale` (2) with nearest-neighbour.
 */
export async function paintedContactSheet(
  images: readonly Image[],
  opts: PaintedSheetOptions = {},
): Promise<Image> {
  if (images.length === 0) throw new Error("paintedContactSheet: no images");
  const all = opts.reference ? [opts.reference, ...images] : [...images];
  const labels = images.map(
    (_, i) => opts.labels?.[i] ?? String(i + 1).padStart(2, "0"),
  );
  if (opts.reference) labels.unshift("REF");
  const cellW = Math.max(...images.map((i) => i.width));
  const cellH = Math.max(...images.map((i) => i.height));
  const tiles: Image[] = [];
  for (const [i, img] of all.entries()) {
    let src = img;
    if (
      opts.reference &&
      i === 0 &&
      (img.width !== cellW || img.height !== cellH)
    ) {
      // The reference is shown at the candidates' size.
      const k = Math.min(cellW / img.width, cellH / img.height);
      src = await resizeLanczos(
        img,
        Math.max(1, Math.round(img.width * k)),
        Math.max(1, Math.round(img.height * k)),
      );
    }
    let tile = overCheckerboard(padBottomCentre(src, cellW, cellH), 8);
    if (opts.overlay && !(opts.reference && i === 0)) {
      const ov = opts.overlay;
      const oh = Math.max(1, Math.round((ov.height * cellW) / ov.width));
      const scaled = await resizeLanczos(ov, cellW, oh);
      const o = createImage(cellW, cellH);
      for (let y = 0; y < cellH; y++) {
        const sy = y - (cellH - oh);
        if (sy < 0 || sy >= oh) continue;
        o.data.set(
          scaled.data.subarray(sy * cellW * 4, (sy + 1) * cellW * 4),
          y * cellW * 4,
        );
      }
      tile = blendOver(tile, o, opts.overlayOpacity ?? 0.35);
    }
    tiles.push(tile);
  }
  const cols = opts.cols ?? Math.min(2, tiles.length);
  const gap = 8;
  const labelH = 14;
  const rows = Math.ceil(tiles.length / cols);
  const sheet = createImage(
    cols * cellW + (cols + 1) * gap,
    rows * (cellH + labelH) + (rows + 1) * gap,
    [40, 40, 48],
  );
  tiles.forEach((tile, i) => {
    const x = gap + (i % cols) * (cellW + gap);
    const y = gap + Math.floor(i / cols) * (cellH + labelH + gap);
    blit(sheet, tile, x, y);
    blit(sheet, label(labels[i]), x, y + cellH);
  });
  return upscale(sheet, opts.scale ?? 2);
}
