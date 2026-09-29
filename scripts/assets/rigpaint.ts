/**
 * Pixel painting for the rig's parts (`npm run assets:rigcut`, HR1).
 *
 * The cut-out puppet is drawn the way MI3's were: one clean silhouette
 * outline, no ink lines where parts overlap at a joint. So a part is not a
 * downscaled crop of a sheet with its own outline around it. It is painted
 * from elements, straight in the facing's drawing px:
 *
 * - an element has a silhouette (a procedural shape, or the sheet's alpha)
 *   and a map from drawing px back into the sheet, so the painting's fill
 *   and its drawn detail (cuffs, pockets, folds, the eyes) are sampled
 *   through it, supersampled, with the sheet's own outline kept out of the
 *   fill;
 * - elements are composited into a part, then the part's silhouette gets
 *   one 1 px ink ring, except in the "open" zones at its joint ends, where
 *   the part overlaps its neighbour and must blend into it;
 * - the renderer (src/engine/rig/draw.ts) rings the *union* of the posed
 *   parts, so a joint that bends still gets one outline.
 *
 * Pure functions on plain arrays, so they're unit tested.
 */
import { RIG_INK } from "../../src/engine/rigTypes";
import { createImage, type Image } from "./lib";

/** Sheet pixels at or below this brightness (max channel) are ink. */
const INK_MAX = 34;
/** Fill samples this dark are the blend of ink and fill, and are left out. */
const EDGE_MAX = 46;
/** Sub-samples per output pixel, per axis. */
const SUB = 6;

export type Rgb = readonly [number, number, number];

/** A part being painted, in drawing px: pixel (0, 0) covers (x0, y0). */
export interface Buf {
  x0: number;
  y0: number;
  w: number;
  h: number;
  inside: Uint8Array;
  /** 0 for none, else the id of the element that painted the pixel. */
  owner: Uint8Array;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  /** Interior ink: drawn detail and (after `finish`) the outline ring. */
  ink: Uint8Array;
  /** Pixels that are ring (outline), for the caller's checks. */
  ring: Uint8Array;
}

export function createBuf(x0: number, y0: number, w: number, h: number): Buf {
  const n = w * h;
  return {
    x0,
    y0,
    w,
    h,
    inside: new Uint8Array(n),
    owner: new Uint8Array(n),
    r: new Float32Array(n),
    g: new Float32Array(n),
    b: new Float32Array(n),
    ink: new Uint8Array(n),
    ring: new Uint8Array(n),
  };
}

const idx = (b: Buf, i: number, j: number) => j * b.w + i;
const has = (b: Buf, i: number, j: number) =>
  i >= 0 && j >= 0 && i < b.w && j < b.h && b.inside[j * b.w + i] === 1;

/** Drawing px of pixel (i, j)'s centre. */
export const centre = (b: Buf, i: number, j: number): [number, number] => [
  b.x0 + i + 0.5,
  b.y0 + j + 0.5,
];

export interface Element {
  id: number;
  /** The isolated sheet the element is sampled from. */
  raw: Image;
  /** Drawing px (continuous) to sheet px. */
  map: (x: number, y: number) => [number, number];
  /**
   * The silhouette by pixel centre in drawing px. Without it the sheet's
   * own alpha decides (a pixel is in when half its footprint is opaque).
   */
  inside?: (x: number, y: number) => boolean;
  /** Only paint where this holds (pixel centre, drawing px). */
  where?: (x: number, y: number) => boolean;
  /** Only sample sheet pixels where this holds (sheet px): cuts a sub-region. */
  source?: (sx: number, sy: number) => boolean;
  /** Fraction of a footprint that must be ink for the pixel to be ink. */
  inkTau?: number;
  /** No drawn detail this many px in from the element's own edge. */
  edgeNoInk?: number;
  /** No drawn detail at all: fill only. */
  fillOnly?: boolean;
  /** Ink where this element's edge meets another element painted before it. */
  contour?: boolean;
}

interface Stats {
  inside: boolean;
  colour: Rgb | null;
  ink: number;
}

function sampleAt(raw: Image, sx: number, sy: number) {
  const x = Math.floor(sx);
  const y = Math.floor(sy);
  if (x < 0 || y < 0 || x >= raw.width || y >= raw.height) return null;
  const p = (y * raw.width + x) * 4;
  if (raw.data[p + 3] < 128) return null;
  return [raw.data[p], raw.data[p + 1], raw.data[p + 2]] as const;
}

/** Paints `el` into `b`, over what is already there. */
export function paintElement(b: Buf, el: Element): void {
  const stats: (Stats | null)[] = new Array<Stats | null>(b.w * b.h).fill(null);
  for (let j = 0; j < b.h; j++) {
    for (let i = 0; i < b.w; i++) {
      const [cx, cy] = centre(b, i, j);
      if (el.where && !el.where(cx, cy)) continue;
      let opaque = 0;
      let nink = 0;
      let nfill = 0;
      let r = 0;
      let g = 0;
      let bl = 0;
      for (let v = 0; v < SUB; v++) {
        for (let u = 0; u < SUB; u++) {
          const [sx, sy] = el.map(
            cx - 0.5 + (u + 0.5) / SUB,
            cy - 0.5 + (v + 0.5) / SUB,
          );
          if (el.source && !el.source(sx, sy)) continue;
          const c = sampleAt(el.raw, sx, sy);
          if (!c) continue;
          opaque++;
          const m = Math.max(c[0], c[1], c[2]);
          if (m <= INK_MAX) nink++;
          if (m > EDGE_MAX) {
            nfill++;
            r += c[0];
            g += c[1];
            bl += c[2];
          }
        }
      }
      const total = SUB * SUB;
      const inside = el.inside ? el.inside(cx, cy) : opaque / total >= 0.5;
      if (!inside) continue;
      stats[idx(b, i, j)] = {
        inside: true,
        colour: nfill > 0 ? [r / nfill, g / nfill, bl / nfill] : null,
        ink: nink / total,
      };
    }
  }

  // Distance (4-connected steps) from the element's own edge, for edgeNoInk.
  const edge = el.edgeNoInk ?? 0;
  const dist = new Int16Array(b.w * b.h).fill(-1);
  if (edge > 0) {
    const queue: number[] = [];
    for (let j = 0; j < b.h; j++) {
      for (let i = 0; i < b.w; i++) {
        if (!stats[idx(b, i, j)]) continue;
        const onEdge = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => {
          const ni = i + dx;
          const nj = j + dy;
          return (
            ni < 0 || nj < 0 || ni >= b.w || nj >= b.h || !stats[idx(b, ni, nj)]
          );
        });
        if (onEdge) {
          dist[idx(b, i, j)] = 0;
          queue.push(idx(b, i, j));
        }
      }
    }
    for (let q = 0; q < queue.length; q++) {
      const p = queue[q];
      const i = p % b.w;
      const j = (p - i) / b.w;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const ni = i + dx;
        const nj = j + dy;
        if (ni < 0 || nj < 0 || ni >= b.w || nj >= b.h) continue;
        const np = idx(b, ni, nj);
        if (stats[np] && dist[np] < 0) {
          dist[np] = dist[p] + 1;
          queue.push(np);
        }
      }
    }
  }

  const tau = el.inkTau ?? 0.4;
  for (let j = 0; j < b.h; j++) {
    for (let i = 0; i < b.w; i++) {
      const p = idx(b, i, j);
      const s = stats[p];
      if (!s) continue;
      b.inside[p] = 1;
      b.owner[p] = el.id;
      const c = s.colour;
      b.r[p] = c ? c[0] : Number.NaN;
      b.g[p] = c ? c[1] : Number.NaN;
      b.b[p] = c ? c[2] : Number.NaN;
      b.ink[p] =
        !el.fillOnly && s.ink >= tau && (edge === 0 || dist[p] > edge - 1)
          ? 1
          : 0;
    }
  }
}

/** Paints pixels by a function: colour, or "ink", or null for nothing. */
export function paintProc(
  b: Buf,
  id: number,
  fn: (x: number, y: number) => Rgb | "ink" | "clear" | null,
): void {
  for (let j = 0; j < b.h; j++) {
    for (let i = 0; i < b.w; i++) {
      const [cx, cy] = centre(b, i, j);
      const v = fn(cx, cy);
      const p = idx(b, i, j);
      if (v === null) continue;
      if (v === "clear") {
        b.inside[p] = 0;
        b.ink[p] = 0;
        b.owner[p] = 0;
        continue;
      }
      b.inside[p] = 1;
      b.owner[p] = id;
      if (v === "ink") {
        b.ink[p] = 1;
      } else {
        b.ink[p] = 0;
        b.r[p] = v[0];
        b.g[p] = v[1];
        b.b[p] = v[2];
      }
    }
  }
}

const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * Tidies a silhouette that came from the sheet's alpha: drops spurs (a pixel
 * with at most one neighbour) and fills notches (an empty pixel with at
 * least three), so the ring is one clean line.
 */
export function tidySilhouette(b: Buf, ids?: readonly number[]): void {
  for (let pass = 0; pass < 2; pass++) {
    const drop: number[] = [];
    const add: number[] = [];
    for (let j = 0; j < b.h; j++) {
      for (let i = 0; i < b.w; i++) {
        const p = idx(b, i, j);
        const n = N4.filter(([dx, dy]) => has(b, i + dx, j + dy)).length;
        if (b.inside[p]) {
          if (ids && !ids.includes(b.owner[p])) continue;
          if (n <= 1) drop.push(p);
        } else if (n >= 3) add.push(p);
      }
    }
    for (const p of drop) {
      b.inside[p] = 0;
      b.owner[p] = 0;
      b.ink[p] = 0;
    }
    for (const p of add) {
      const i = p % b.w;
      const j = (p - i) / b.w;
      // Take the colour of a neighbour that is in.
      for (const [dx, dy] of N4) {
        if (has(b, i + dx, j + dy)) {
          const q = idx(b, i + dx, j + dy);
          b.inside[p] = 1;
          b.owner[p] = b.owner[q];
          b.r[p] = b.r[q];
          b.g[p] = b.g[q];
          b.b[p] = b.b[q];
          b.ink[p] = 0;
          break;
        }
      }
    }
  }
}

/** Gives colour-less pixels (all their samples were ink) a neighbour's. */
function fillGaps(b: Buf): void {
  for (let pass = 0; pass < 8; pass++) {
    let left = 0;
    for (let j = 0; j < b.h; j++) {
      for (let i = 0; i < b.w; i++) {
        const p = idx(b, i, j);
        if (!b.inside[p] || !Number.isNaN(b.r[p])) continue;
        let r = 0;
        let g = 0;
        let bl = 0;
        let n = 0;
        for (const [dx, dy] of N4) {
          if (!has(b, i + dx, j + dy)) continue;
          const q = idx(b, i + dx, j + dy);
          if (Number.isNaN(b.r[q])) continue;
          r += b.r[q];
          g += b.g[q];
          bl += b.b[q];
          n++;
        }
        if (n) {
          b.r[p] = r / n;
          b.g[p] = g / n;
          b.b[p] = bl / n;
        } else left++;
      }
    }
    if (!left) return;
  }
}

export interface FinishOptions {
  /** Ring pixels here get no ink: the part's joint ends (pixel centre, drawing px). */
  open?: (x: number, y: number) => boolean;
  /** Drop interior ink pixels that touch no other ink pixel. */
  despeckle?: boolean;
  /** Element ids whose edges against earlier elements are inked. */
  contour?: readonly number[];
}

/**
 * Inks the part: contours between elements, then the 1 px ring around the
 * silhouette, and cleans up stray ink. Leaves the buffer ready for `toImage`.
 */
export function finish(b: Buf, o: FinishOptions = {}): void {
  fillGaps(b);
  // Contours between elements: the element's pixel next to another element's.
  const contourMark: number[] = [];
  for (let j = 0; j < b.h; j++) {
    for (let i = 0; i < b.w; i++) {
      const p = idx(b, i, j);
      if (!b.inside[p] || !o.contour?.includes(b.owner[p])) continue;
      const touches = N4.some(([dx, dy]) => {
        if (!has(b, i + dx, j + dy)) return false;
        return b.owner[idx(b, i + dx, j + dy)] !== b.owner[p];
      });
      if (touches) contourMark.push(p);
    }
  }
  for (const p of contourMark) b.ink[p] = 1;

  if (o.despeckle) {
    const lone: number[] = [];
    for (let j = 0; j < b.h; j++) {
      for (let i = 0; i < b.w; i++) {
        const p = idx(b, i, j);
        if (!b.ink[p]) continue;
        let n = 0;
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            if (
              (di || dj) &&
              has(b, i + di, j + dj) &&
              b.ink[idx(b, i + di, j + dj)]
            )
              n++;
          }
        if (n === 0) lone.push(p);
      }
    }
    for (const p of lone) b.ink[p] = 0;
    fillInkGaps(b, lone);
  }

  b.ring.fill(0);
  for (let j = 0; j < b.h; j++) {
    for (let i = 0; i < b.w; i++) {
      const p = idx(b, i, j);
      if (!b.inside[p]) continue;
      const exposed = N4.some(([dx, dy]) => !has(b, i + dx, j + dy));
      if (!exposed) continue;
      const [cx, cy] = centre(b, i, j);
      if (o.open?.(cx, cy)) continue;
      b.ink[p] = 1;
      b.ring[p] = 1;
    }
  }
}

/** Gives the pixels that just lost their ink the colour of a neighbour's fill. */
function fillInkGaps(b: Buf, pixels: readonly number[]): void {
  for (const p of pixels) {
    const i = p % b.w;
    const j = (p - i) / b.w;
    if (!Number.isNaN(b.r[p])) continue;
    for (const [dx, dy] of N4) {
      if (!has(b, i + dx, j + dy)) continue;
      const q = idx(b, i + dx, j + dy);
      if (Number.isNaN(b.r[q])) continue;
      b.r[p] = b.r[q];
      b.g[p] = b.g[q];
      b.b[p] = b.b[q];
      break;
    }
  }
}

export function toImage(b: Buf): Image {
  const img = createImage(b.w, b.h);
  for (let p = 0; p < b.w * b.h; p++) {
    if (!b.inside[p]) continue;
    const c: Rgb = b.ink[p] ? RIG_INK : [b.r[p], b.g[p], b.b[p]];
    img.data[p * 4] = Math.round(c[0]);
    img.data[p * 4 + 1] = Math.round(c[1]);
    img.data[p * 4 + 2] = Math.round(c[2]);
    img.data[p * 4 + 3] = 255;
  }
  return img;
}

// --- Shapes ---------------------------------------------------------------------------------

/** Point in polygon, even-odd. */
export function inPolygon(
  poly: readonly (readonly [number, number])[],
  x: number,
  y: number,
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/** Linear interpolation through `[y, value]` stops, held beyond the ends. */
export function ramp(
  stops: readonly (readonly [number, number])[],
  y: number,
): number {
  if (y <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (y <= stops[i][0]) {
      const [y0, v0] = stops[i - 1];
      const [y1, v1] = stops[i];
      return v0 + ((v1 - v0) * (y - y0)) / (y1 - y0);
    }
  }
  return stops[stops.length - 1][1];
}

export interface TubeShape {
  /** Centre line, drawing px. */
  cx: number;
  yTop: number;
  yBot: number;
  /** Full width at drawing y, as `[y, width]` stops. */
  widths: readonly (readonly [number, number])[];
  /** Rounded end radii in px, 0 for a flat end. */
  capTop: number;
  capBot: number;
}

/** Half the tube's width at `y`, or 0 outside it. */
export function tubeHalf(t: TubeShape, y: number): number {
  if (y < t.yTop || y > t.yBot) return 0;
  let half = ramp(t.widths, y) / 2;
  if (t.capTop > 0 && y < t.yTop + t.capTop) {
    const d = (t.yTop + t.capTop - y) / t.capTop;
    half *= Math.sqrt(Math.max(0, 1 - d * d));
  }
  if (t.capBot > 0 && y > t.yBot - t.capBot) {
    const d = (y - (t.yBot - t.capBot)) / t.capBot;
    half *= Math.sqrt(Math.max(0, 1 - d * d));
  }
  return half;
}

export const inTube = (t: TubeShape, x: number, y: number) =>
  Math.abs(x - t.cx) <= tubeHalf(t, y) && tubeHalf(t, y) > 0;

// --- Sheet analysis -------------------------------------------------------------------------

/** The left and right edge of an isolated part on each sheet row, smoothed. */
export interface Spans {
  y0: number;
  centre: Float32Array;
  half: Float32Array;
  /** Thickness of the sheet's own outline at the edges, in sheet px. */
  band: number;
}

export function analyseSpans(raw: Image, smooth = 25): Spans {
  const { width: w, height: h, data } = raw;
  let y0 = h;
  let y1 = 0;
  const lo = new Float32Array(h).fill(Number.NaN);
  const hi = new Float32Array(h).fill(Number.NaN);
  const bands: number[] = [];
  for (let y = 0; y < h; y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] >= 128) {
        if (l < 0) l = x;
        r = x;
      }
    }
    if (l < 0) continue;
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
    lo[y] = l;
    hi[y] = r;
    let k = 0;
    while (
      l + k < r &&
      Math.max(
        ...data.subarray((y * w + l + k) * 4, (y * w + l + k) * 4 + 3),
      ) <= 60
    )
      k++;
    bands.push(k);
  }
  bands.sort((a, b) => a - b);
  const band = bands[Math.floor(bands.length / 2)] ?? 8;
  const centreA = new Float32Array(h);
  const halfA = new Float32Array(h);
  for (let y = y0; y <= y1; y++) {
    let c = 0;
    let hf = 0;
    let n = 0;
    for (let k = -smooth; k <= smooth; k++) {
      const yy = y + k;
      if (yy < y0 || yy > y1 || Number.isNaN(lo[yy])) continue;
      c += (lo[yy] + hi[yy]) / 2;
      hf += (hi[yy] - lo[yy]) / 2;
      n++;
    }
    centreA[y] = c / n;
    halfA[y] = hf / n;
  }
  return { y0, centre: centreA, half: halfA, band };
}

/**
 * The map of a tube: drawing px to sheet px, stretching the sheet rows
 * `rows` over the tube's length, and its interior (inside the sheet's own
 * outline) across the tube's interior (inside the ring).
 */
export function tubeMap(
  t: TubeShape,
  spans: Spans,
  rows: readonly [number, number],
  clampRows?: readonly [number, number],
): (x: number, y: number) => [number, number] {
  return (x, y) => {
    const f = (y - t.yTop) / (t.yBot - t.yTop);
    let sy = rows[0] + f * (rows[1] - rows[0]);
    if (clampRows) sy = Math.min(clampRows[1], Math.max(clampRows[0], sy));
    const row = Math.min(
      Math.max(Math.round(sy), spans.y0),
      spans.y0 + spans.centre.length - 1,
    );
    const hw = Math.max(1, spans.half[row] - spans.band);
    const out = Math.max(0.5, ramp(t.widths, y) / 2 - 1);
    const u = Math.max(-1, Math.min(1, (x - t.cx) / out));
    return [spans.centre[row] + u * hw, sy];
  };
}

/** Scales the fill of the pixels where `pred` holds (their drawn ink is left alone). */
export function tone(
  b: Buf,
  pred: (x: number, y: number) => boolean,
  k: number,
): void {
  for (let j = 0; j < b.h; j++) {
    for (let i = 0; i < b.w; i++) {
      const p = j * b.w + i;
      if (!b.inside[p] || b.ink[p]) continue;
      const [cx, cy] = centre(b, i, j);
      if (!pred(cx, cy)) continue;
      b.r[p] = Math.min(255, b.r[p] * k);
      b.g[p] = Math.min(255, b.g[p] * k);
      b.b[p] = Math.min(255, b.b[p] * k);
    }
  }
}
