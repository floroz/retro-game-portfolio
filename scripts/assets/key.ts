/**
 * Background keying for Codex sprite sheets (docs/art-spec.md, F3).
 *
 * The G1 probe findings showed that Codex never paints exact `#FF00FF`: the
 * "magenta" background is mostly `#FA03FA`, drifts towards `#EB23ED` near the
 * corners, and has a soft, blended fringe where it meets a figure. An exact or
 * RGB-distance key either misses the background or eats into the figure, so
 * this module keys in OKLab and only removes magenta that is *connected to
 * the image edge* (a flood fill), plus large enclosed pockets such as the gap
 * between an arm and the body, plus a thin fringe around everything removed.
 *
 * It lives beside `lib.ts` rather than inside it, because `lib.ts` is
 * read-only after F1 (Rules for Opus tasks). The CLIs key with this module
 * first and hand `lib.pixelize` an already-transparent image.
 */
import {
  CHROMA_KEY,
  oklabDistance,
  parseHex,
  rgbToOklab,
  type Image,
  type Rgb,
} from "./lib";

/** Distance in OKLab from the key that counts as flat background. */
export const DEFAULT_KEY_OKLAB_TOLERANCE = 0.08;
/**
 * Distance in OKLab from the key that counts as fringe: a blend of background
 * and figure. In the probe, figure colours start at about 0.30 from the key.
 */
export const DEFAULT_FRINGE_OKLAB_TOLERANCE = 0.22;
/** How many pixels deep the fringe is eroded into the figure, at most. */
export const DEFAULT_FRINGE_PASSES = 3;
/** Enclosed background pockets smaller than this many raw pixels are kept. */
export const DEFAULT_MIN_HOLE = 64;

export interface KeyOptions {
  /** The key colour, or "auto" to use the most common colour on the border. */
  key?: Rgb | "auto";
  /** OKLab distance for the flood fill and for enclosed pockets. */
  tolerance?: number;
  /** OKLab distance for the fringe erosion. 0 disables it. */
  fringeTolerance?: number;
  fringePasses?: number;
  /** Minimum size of an enclosed pocket to key. Infinity disables pockets. */
  minHole?: number;
}

export interface KeyResult {
  image: Image;
  /** The key colour actually used (sampled when `key` was "auto"). */
  key: Rgb;
  /** Pixels made transparent, by stage. */
  flooded: number;
  holes: number;
  fringe: number;
}

/** The most common exact colour on the image's outermost ring of pixels. */
export function sampleBorderKey(img: Image): Rgb {
  const counts = new Map<number, number>();
  const add = (x: number, y: number) => {
    const i = (y * img.width + x) * 4;
    const k = (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2];
    counts.set(k, (counts.get(k) ?? 0) + 1);
  };
  for (let x = 0; x < img.width; x++) {
    add(x, 0);
    if (img.height > 1) add(x, img.height - 1);
  }
  for (let y = 1; y < img.height - 1; y++) {
    add(0, y);
    if (img.width > 1) add(img.width - 1, y);
  }
  let best = 0;
  let bestN = -1;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return [(best >> 16) & 255, (best >> 8) & 255, best & 255];
}

/** Parse `--key`: "auto", or a hex colour. Undefined means no keying. */
export function parseKeyArg(
  value: string | undefined,
): Rgb | "auto" | undefined {
  if (value === undefined) return undefined;
  return value === "auto" ? "auto" : parseHex(value);
}

/**
 * Key a flat-ish background out of a raw sheet. See the module comment for
 * the three stages. Already-transparent pixels count as background.
 */
export function floodKey(img: Image, opts: KeyOptions = {}): KeyResult {
  const key =
    opts.key === "auto" ? sampleBorderKey(img) : (opts.key ?? CHROMA_KEY);
  const tolerance = opts.tolerance ?? DEFAULT_KEY_OKLAB_TOLERANCE;
  const fringeTolerance =
    opts.fringeTolerance ?? DEFAULT_FRINGE_OKLAB_TOLERANCE;
  const fringePasses = opts.fringePasses ?? DEFAULT_FRINGE_PASSES;
  const minHole = opts.minHole ?? DEFAULT_MIN_HOLE;
  const { width: w, height: h, data } = img;
  const n = w * h;

  // Distance from the key for every pixel, cached per exact colour.
  const keyLab = rgbToOklab(key);
  const cache = new Map<number, number>();
  const dist = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (data[i + 3] === 0) {
      dist[p] = 0;
      continue;
    }
    const c = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let d = cache.get(c);
    if (d === undefined) {
      d = oklabDistance(
        rgbToOklab([data[i], data[i + 1], data[i + 2]]),
        keyLab,
      );
      cache.set(c, d);
    }
    dist[p] = d;
  }

  // 0 = figure, 1 = flooded from an edge, 2 = enclosed pocket, 3 = fringe.
  const mark = new Uint8Array(n);
  const stack: number[] = [];
  const neighbours = (p: number, visit: (q: number) => void) => {
    const x = p % w;
    if (x > 0) visit(p - 1);
    if (x < w - 1) visit(p + 1);
    if (p >= w) visit(p - w);
    if (p < n - w) visit(p + w);
  };

  // Stage 1: flood fill from every edge pixel that is close to the key.
  const seed = (p: number) => {
    if (mark[p] === 0 && dist[p] <= tolerance) {
      mark[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed(n - w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  let flooded = stack.length;
  while (stack.length > 0) {
    neighbours(stack.pop() as number, (q) => {
      if (mark[q] === 0 && dist[q] <= tolerance) {
        mark[q] = 1;
        flooded++;
        stack.push(q);
      }
    });
  }

  // Stage 2: enclosed pockets of background, if they're big enough.
  let holes = 0;
  if (Number.isFinite(minHole)) {
    const seen = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      if (mark[p] !== 0 || seen[p] || dist[p] > tolerance) continue;
      const region: number[] = [p];
      seen[p] = 1;
      for (let r = 0; r < region.length; r++) {
        neighbours(region[r], (q) => {
          if (!seen[q] && mark[q] === 0 && dist[q] <= tolerance) {
            seen[q] = 1;
            region.push(q);
          }
        });
      }
      if (region.length >= minHole) {
        for (const q of region) mark[q] = 2;
        holes += region.length;
      }
    }
  }

  // Stage 3: erode the blended fringe next to anything already removed.
  let fringe = 0;
  if (fringeTolerance > 0) {
    let frontier: number[] = [];
    for (let p = 0; p < n; p++) {
      if (mark[p] !== 0) continue;
      let touches = false;
      neighbours(p, (q) => {
        if (mark[q] !== 0) touches = true;
      });
      if (touches && dist[p] <= fringeTolerance) frontier.push(p);
    }
    for (let pass = 0; pass < fringePasses && frontier.length > 0; pass++) {
      for (const p of frontier) mark[p] = 3;
      fringe += frontier.length;
      const next = new Set<number>();
      for (const p of frontier) {
        neighbours(p, (q) => {
          if (mark[q] === 0 && dist[q] <= fringeTolerance) next.add(q);
        });
      }
      frontier = [...next];
    }
  }

  const out: Image = { width: w, height: h, data: new Uint8ClampedArray(data) };
  for (let p = 0; p < n; p++) {
    if (mark[p] === 0) continue;
    const i = p * 4;
    out.data[i] = 0;
    out.data[i + 1] = 0;
    out.data[i + 2] = 0;
    out.data[i + 3] = 0;
  }
  return { image: out, key, flooded, holes, fringe };
}
