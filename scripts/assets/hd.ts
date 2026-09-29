/**
 * HD asset preparation (docs/art-spec.md, Phase H; task H0). Phase H art is
 * hand-painted at 1280x640, density 4 over the 320x160 logical grid, with no
 * palette and soft alpha, so none of the pixel-art path applies: no
 * area-average downscale, no palette remap, no alpha threshold.
 *
 * A raw candidate becomes an HD asset in four steps, in this order:
 *
 * 1. an optional soft key at the raw resolution (`softKey`): a magenta or
 *    near-magenta background, or the alpha that `transparent_background`
 *    already gave, becomes clean alpha, with the key colour unmixed from the
 *    blended edge (defringing), the key's hue removed from the edge band
 *    (despill), and the edge choked inwards;
 * 2. a crop: the centred 2:1 frame for scenes, the alpha bounds for sprites,
 *    or an explicit rectangle;
 * 3. a Lanczos resize through `sharp` (premultiplied, so a keyed background
 *    never bleeds in): 1280x640 for scenes, or a given size for sprites;
 * 4. optional colour adjustments (levels, then OKLab saturation).
 *
 * `register` and `alignSprite` find where a separately generated object
 * sprite sits in the chosen composite, so the empty plate and the objects
 * line up.
 *
 * It lives beside `lib.ts` because `lib.ts` is read-only (Rules for Opus
 * tasks); it reuses lib's image type, I/O, and OKLab conversion.
 */
import sharp from "sharp";
import { floodKey, sampleBorderKey } from "./key";
import {
  alphaBounds,
  areaDownscale,
  blit,
  centredAspectCrop,
  createImage,
  crop,
  drawText,
  oklabDistance,
  parseHex,
  rgbToOklab,
  textWidth,
  upscale,
  type Image,
  type Oklab,
  type Rect,
  type Rgb,
} from "./lib";

/** Phase H density: display px per logical px. */
export const HD_DENSITY = 4;
/** Phase H scenes: 320x160 logical px at density 4. */
export const HD_SCENE_SIZE = { w: 1280, h: 640 } as const;

// --- Sizes -------------------------------------------------------------------------

/** A target size where either side may be left to the aspect ratio. */
export interface TargetSize {
  w?: number;
  h?: number;
}

/** Parse `--size`: "400x300", "400x" (width only), or "x300" (height only). */
export function parseTargetSize(value: string): TargetSize {
  const m = /^(\d*)x(\d*)$/.exec(value.trim());
  if (!m || (m[1] === "" && m[2] === "")) {
    throw new Error(
      `Expected a size like "400x300", "400x", or "x300", got "${value}"`,
    );
  }
  const size: TargetSize = {};
  if (m[1]) size.w = Number(m[1]);
  if (m[2]) size.h = Number(m[2]);
  if (size.w === 0 || size.h === 0)
    throw new Error(`Size "${value}" has no area`);
  return size;
}

/**
 * The size to resize a `src`-sized crop to, keeping its aspect ratio. With
 * both sides given, the result fits inside them (the caller pads the rest);
 * with one, the other follows; with neither, `scale` applies (default 1).
 */
export function fitSize(
  src: { w: number; h: number },
  target: TargetSize = {},
  scale = 1,
): { w: number; h: number } {
  const { w, h } = target;
  let k = scale;
  if (w !== undefined && h !== undefined) k = Math.min(w / src.w, h / src.h);
  else if (w !== undefined) k = w / src.w;
  else if (h !== undefined) k = h / src.h;
  return {
    w: Math.max(1, Math.round(src.w * k)),
    h: Math.max(1, Math.round(src.h * k)),
  };
}

// --- Resampling ----------------------------------------------------------------------

function toSharp(img: Image) {
  return sharp(
    Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength),
    { raw: { width: img.width, height: img.height, channels: 4 } },
  );
}

/**
 * Resize with Lanczos-3 through `sharp`, to exactly `width` x `height`.
 * `sharp` premultiplies alpha around the resize, so transparent pixels never
 * tint the edge.
 */
export async function resizeLanczos(
  img: Image,
  width: number,
  height: number,
): Promise<Image> {
  if (width === img.width && height === img.height)
    return { ...img, data: new Uint8ClampedArray(img.data) };
  const { data, info } = await toSharp(img)
    .resize(width, height, { kernel: "lanczos3", fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}

/** Place `img` on a transparent canvas, centred horizontally, on the bottom row. */
export function padBottomCentre(img: Image, width: number, height: number) {
  if (img.width > width || img.height > height)
    throw new Error("padBottomCentre: the image is larger than the canvas");
  const out = createImage(width, height);
  const x0 = Math.floor((width - img.width) / 2);
  const y0 = height - img.height;
  for (let y = 0; y < img.height; y++) {
    const from = y * img.width * 4;
    out.data.set(
      img.data.subarray(from, from + img.width * 4),
      ((y0 + y) * width + x0) * 4,
    );
  }
  return out;
}

// --- Colour ----------------------------------------------------------------------------

/** Input levels: `black` maps to 0, `white` to 255, then a gamma (1 = none). */
export interface Levels {
  black: number;
  white: number;
  gamma: number;
}

/** Parse `--levels`: "black,white" or "black,white,gamma", in 0-255. */
export function parseLevels(value: string): Levels {
  const parts = value.split(",").map((v) => Number(v.trim()));
  if (
    (parts.length !== 2 && parts.length !== 3) ||
    parts.some((v) => !Number.isFinite(v))
  ) {
    throw new Error(`Expected "black,white[,gamma]", got "${value}"`);
  }
  const [black, white, gamma = 1] = parts;
  if (!(black >= 0 && white <= 255 && black < white && gamma > 0))
    throw new Error(
      `Levels "${value}" need 0 <= black < white <= 255, gamma > 0`,
    );
  return { black, white, gamma };
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

/** OKLab back to sRGB (0-255), clamped to the gamut. */
export function oklabToRgb([L, a, b]: Oklab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export interface ColourAdjust {
  levels?: Levels;
  /** OKLab chroma multiplier: 1 keeps it, 0 is greyscale. */
  saturation?: number;
}

/** Apply levels, then saturation, to every visible pixel (a new image). */
export function adjustColour(img: Image, adj: ColourAdjust): Image {
  const out: Image = { ...img, data: new Uint8ClampedArray(img.data) };
  const { levels, saturation } = adj;
  if (!levels && (saturation === undefined || saturation === 1)) return out;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    if (!levels) lut[v] = v;
    else {
      const t = Math.min(
        1,
        Math.max(0, (v - levels.black) / (levels.white - levels.black)),
      );
      lut[v] = Math.round(255 * t ** (1 / levels.gamma));
    }
  }
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    let rgb: Rgb = [lut[d[i]], lut[d[i + 1]], lut[d[i + 2]]];
    if (saturation !== undefined && saturation !== 1) {
      const [L, a, b] = rgbToOklab(rgb);
      rgb = oklabToRgb([L, a * saturation, b * saturation]);
    }
    d[i] = rgb[0];
    d[i + 1] = rgb[1];
    d[i + 2] = rgb[2];
  }
  return out;
}

// --- Soft key ----------------------------------------------------------------------------

/** OKLab distance from the key that is certainly background. */
export const DEFAULT_SOFT_KEY_TOLERANCE = 0.08;
/** OKLab distance from the key above which an edge pixel is fully opaque. */
export const DEFAULT_SOFT_KEY_SOFTNESS = 0.25;
/** How far into the figure (raw px) the soft edge, despill, and unmixing reach. */
export const DEFAULT_SOFT_KEY_BAND = 3;
/** How many raw px the finished edge is choked inwards. */
export const DEFAULT_SOFT_KEY_CHOKE = 1;
/** Alpha below this becomes 0 (dust from the generator or the resize). */
export const DEFAULT_ALPHA_FLOOR = 8;

export interface SoftKeyOptions {
  /**
   * "auto": the existing alpha if the image has any transparency, else the
   * most common border colour. "alpha": the existing alpha only. Or a colour.
   */
  key?: Rgb | "auto" | "alpha";
  tolerance?: number;
  softness?: number;
  band?: number;
  choke?: number;
  /** Remove the spill colour's hue from the edge band. Default: on when there is one. */
  despill?: boolean;
  /** The spill colour: the key by default; give one to despill an existing alpha. */
  spill?: Rgb;
  /** Enclosed background pockets of at least this many raw px are keyed too. */
  minHole?: number;
  alphaFloor?: number;
}

export interface SoftKeyResult {
  image: Image;
  /** The key colour, or null when the existing alpha was used. */
  key: Rgb | null;
  /** Fully transparent and partly transparent pixels in the result. */
  transparent: number;
  partial: number;
}

/** True when enough of the image is transparent to be a real matte. */
function hasMatte(img: Image): boolean {
  let n = 0;
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] < 128) n++;
  return n >= img.width * img.height * 0.001;
}

/** Per-pixel 4-neighbour distance (px) from any transparent pixel, capped at `max + 1`. */
function distanceFromClear(
  alpha: Uint8Array,
  w: number,
  h: number,
  max: number,
) {
  const n = w * h;
  const dist = new Uint8Array(n).fill(max + 1);
  let frontier: number[] = [];
  for (let p = 0; p < n; p++) {
    if (alpha[p] === 0) {
      dist[p] = 0;
      frontier.push(p);
    }
  }
  for (let d = 1; d <= max && frontier.length; d++) {
    const next: number[] = [];
    for (const p of frontier) {
      const x = p % w;
      const visit = (q: number) => {
        if (dist[q] > d) {
          dist[q] = d;
          next.push(q);
        }
      };
      if (x > 0) visit(p - 1);
      if (x < w - 1) visit(p + 1);
      if (p >= w) visit(p - w);
      if (p < n - w) visit(p + w);
    }
    frontier = next;
  }
  return dist;
}

const smoothstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * Key a background out softly. See the module comment for what each stage
 * does; every distance is in raw px, so key before resizing.
 */
export function softKey(img: Image, opts: SoftKeyOptions = {}): SoftKeyResult {
  const { width: w, height: h } = img;
  const n = w * h;
  const band = opts.band ?? DEFAULT_SOFT_KEY_BAND;
  const choke = opts.choke ?? DEFAULT_SOFT_KEY_CHOKE;
  const floor = opts.alphaFloor ?? DEFAULT_ALPHA_FLOOR;
  const requested = opts.key ?? "auto";
  const useAlpha =
    requested === "alpha" || (requested === "auto" && hasMatte(img));
  if (requested === "alpha" && !hasMatte(img))
    throw new Error("--key alpha: the image has no transparency to use");
  const key: Rgb | null = useAlpha
    ? null
    : requested === "auto"
      ? sampleBorderKey(img)
      : (requested as Rgb);

  const out: Image = {
    width: w,
    height: h,
    data: new Uint8ClampedArray(img.data),
  };
  const d = out.data;
  const alpha = new Uint8Array(n);
  for (let p = 0; p < n; p++) alpha[p] = d[p * 4 + 3];

  let keyLab: Oklab | null = null;
  if (key) {
    keyLab = rgbToOklab(key);
    const tolerance = opts.tolerance ?? DEFAULT_SOFT_KEY_TOLERANCE;
    const softness = Math.max(
      tolerance + 1e-6,
      opts.softness ?? DEFAULT_SOFT_KEY_SOFTNESS,
    );
    // Background: flood-filled from the edges (plus big pockets), hard.
    const flooded = floodKey(img, {
      key,
      tolerance,
      fringeTolerance: 0,
      minHole: opts.minHole,
    }).image.data;
    for (let p = 0; p < n; p++) if (flooded[p * 4 + 3] === 0) alpha[p] = 0;
    // Soft edge: near the background, alpha follows the distance from the key,
    // and the key is unmixed from the colour: C = a F + (1 - a) K.
    const near = distanceFromClear(alpha, w, h, band);
    const cache = new Map<number, number>();
    for (let p = 0; p < n; p++) {
      if (alpha[p] === 0 || near[p] > band) continue;
      const i = p * 4;
      const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      let dist = cache.get(c);
      if (dist === undefined) {
        const [L, A, B] = rgbToOklab([d[i], d[i + 1], d[i + 2]]);
        dist = Math.hypot(L - keyLab[0], A - keyLab[1], B - keyLab[2]);
        cache.set(c, dist);
      }
      const a = smoothstep((dist - tolerance) / (softness - tolerance));
      alpha[p] = Math.round(alpha[p] * a);
      if (a > 0 && a < 1) {
        for (let ch = 0; ch < 3; ch++)
          d[i + ch] = Math.round((d[i + ch] - (1 - a) * key[ch]) / a);
      }
    }
  }

  // Despill: remove the spill colour's hue (its OKLab a/b direction) from the
  // edge band, fading out across it, and from any stray pocket of near-key
  // colour inside the figure (anti-aliased gaps too small to key).
  const spill = opts.spill ?? key;
  const despill = opts.despill ?? spill !== null;
  const spillLab = spill ? rgbToOklab(spill) : null;
  if (despill && spillLab) {
    const len = Math.hypot(spillLab[1], spillLab[2]);
    if (len > 0.02) {
      const ua = spillLab[1] / len;
      const ub = spillLab[2] / len;
      const softness = opts.softness ?? DEFAULT_SOFT_KEY_SOFTNESS;
      const near = distanceFromClear(alpha, w, h, band);
      for (let p = 0; p < n; p++) {
        if (alpha[p] === 0) continue;
        const i = p * 4;
        const lab = rgbToOklab([d[i], d[i + 1], d[i + 2]]);
        const [L, A, B] = lab;
        const along = A * ua + B * ub;
        if (along <= 0) continue;
        const strength =
          oklabDistance(lab, spillLab) < softness
            ? 1
            : near[p] <= band
              ? 1 - (near[p] - 1) / band
              : 0;
        if (strength <= 0) continue;
        const k = along * strength;
        const rgb = oklabToRgb([L, A - ua * k, B - ub * k]);
        d[i] = rgb[0];
        d[i + 1] = rgb[1];
        d[i + 2] = rgb[2];
      }
    }
  }

  // Choke: erode the matte by one px per pass (4-neighbour minimum).
  for (let pass = 0; pass < choke; pass++) {
    const prev = alpha.slice();
    for (let p = 0; p < n; p++) {
      if (prev[p] === 0) continue;
      const x = p % w;
      let m = prev[p];
      if (x > 0) m = Math.min(m, prev[p - 1]);
      if (x < w - 1) m = Math.min(m, prev[p + 1]);
      if (p >= w) m = Math.min(m, prev[p - w]);
      if (p < n - w) m = Math.min(m, prev[p + w]);
      alpha[p] = m;
    }
  }

  let transparent = 0;
  let partial = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (alpha[p] < floor) {
      d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
      transparent++;
    } else {
      d[i + 3] = alpha[p];
      if (alpha[p] < 255) partial++;
    }
  }
  return { image: out, key, transparent, partial };
}

/** The CLI's --key family of options, as parseArgs returns them. */
export interface KeyFlags {
  key?: string;
  "key-tolerance"?: string;
  softness?: string;
  band?: string;
  choke?: string;
  "min-hole"?: string;
  despill?: string;
  spill?: string;
  "alpha-floor"?: string;
}

/** parseArgs options for KeyFlags, shared by prepare.ts and review.ts. */
export const KEY_FLAG_OPTIONS = {
  key: { type: "string" },
  "key-tolerance": { type: "string" },
  softness: { type: "string" },
  band: { type: "string" },
  choke: { type: "string" },
  "min-hole": { type: "string" },
  despill: { type: "string" },
  spill: { type: "string" },
  "alpha-floor": { type: "string" },
} as const;

const num = (v: string | undefined) =>
  v === undefined ? undefined : Number(v);

/** Parse the --key flags into SoftKeyOptions, or null for no key. */
export function keyOptions(
  flags: KeyFlags,
  fallback: "none" | "auto",
): SoftKeyOptions | null {
  const key = flags.key ?? fallback;
  if (key === "none") return null;
  if (flags.despill && !["on", "off"].includes(flags.despill))
    throw new Error(`--despill takes on or off, not "${flags.despill}"`);
  return {
    key: key === "auto" || key === "alpha" ? key : parseHex(key),
    tolerance: num(flags["key-tolerance"]),
    softness: num(flags.softness),
    band: num(flags.band),
    choke: num(flags.choke),
    minHole: num(flags["min-hole"]),
    despill: flags.despill === undefined ? undefined : flags.despill === "on",
    spill: flags.spill ? parseHex(flags.spill) : undefined,
    alphaFloor: num(flags["alpha-floor"]),
  };
}

/** Zero every pixel whose alpha is below `floor` (after a resize). */
export function clearDust(img: Image, floor = DEFAULT_ALPHA_FLOOR): Image {
  const out: Image = { ...img, data: new Uint8ClampedArray(img.data) };
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < floor) out.data.fill(0, i, i + 4);
  }
  return out;
}

// --- The whole pipeline ---------------------------------------------------------------

export type PrepareKind = "scene" | "sprite";

export interface PrepareOptions extends ColourAdjust {
  kind: PrepareKind;
  /** Default "auto": the centred 2:1 frame (scenes) or the alpha bounds (sprites). */
  crop?: Rect | "auto";
  /** Scenes default to 1280x640. Sprites keep their aspect (see fitSize). */
  size?: TargetSize;
  /** Sprites only, when no size is given: a factor on the cropped size. */
  scale?: number;
  /** Sprites only: raw px kept around the auto crop. Default 2. */
  pad?: number;
  /** Soft key options, or null/undefined for none. */
  key?: SoftKeyOptions | null;
}

export interface PrepareResult {
  image: Image;
  /** The raw region that was resized. */
  crop: Rect;
  key: SoftKeyResult | null;
  warnings: string[];
}

/** Raw candidate to HD asset: key, crop, resize, adjust (see the module comment). */
export async function prepare(
  raw: Image,
  opts: PrepareOptions,
): Promise<PrepareResult> {
  const warnings: string[] = [];
  const keyed = opts.key ? softKey(raw, opts.key) : null;
  const src = keyed ? keyed.image : raw;
  const floor = opts.key?.alphaFloor ?? DEFAULT_ALPHA_FLOOR;

  let region: Rect;
  if (opts.crop && opts.crop !== "auto") region = opts.crop;
  else if (opts.kind === "scene") {
    const t = opts.size ?? HD_SCENE_SIZE;
    region = centredAspectCrop(
      src.width,
      src.height,
      t.w ?? HD_SCENE_SIZE.w,
      t.h ?? HD_SCENE_SIZE.h,
    );
  } else {
    const b = alphaBounds(src, floor);
    if (!b) throw new Error("Nothing is left after keying: check --key");
    const pad = opts.pad ?? 2;
    const x = Math.max(0, b.x - pad);
    const y = Math.max(0, b.y - pad);
    region = {
      x,
      y,
      w: Math.min(src.width, b.x + b.w + pad) - x,
      h: Math.min(src.height, b.y + b.h + pad) - y,
    };
  }
  const cropped = crop(src, region);

  let image: Image;
  if (opts.kind === "scene") {
    const w = opts.size?.w ?? HD_SCENE_SIZE.w;
    const h = opts.size?.h ?? HD_SCENE_SIZE.h;
    const stretch = region.w / region.h / (w / h);
    if (Math.abs(stretch - 1) > 0.01) {
      warnings.push(
        `crop ${region.w}x${region.h} is stretched ${((stretch - 1) * 100).toFixed(1)}% to fit ${w}x${h}`,
      );
    }
    image = await resizeLanczos(cropped, w, h);
  } else {
    const fit = fitSize({ w: region.w, h: region.h }, opts.size, opts.scale);
    image = await resizeLanczos(cropped, fit.w, fit.h);
    const { w, h } = opts.size ?? {};
    if (w !== undefined && h !== undefined && (fit.w !== w || fit.h !== h))
      image = padBottomCentre(image, w, h);
  }
  if (keyed) image = clearDust(image, floor);
  image = adjustColour(image, opts);
  return { image, crop: region, key: keyed, warnings };
}

// --- Registration ------------------------------------------------------------------------

export interface RegisterOptions {
  /** A guess at the sprite's top-left in the composite. Default: search it all. */
  near?: { x: number; y: number };
  /** How far from `near` to search, in composite px. Default 64. */
  radius?: number;
  /** Sprite pixels with at least this alpha are matched. Default 128. */
  alphaThreshold?: number;
  /** The share of the sprite's matte that must fall inside the composite. Default 0.6. */
  minInside?: number;
}

export interface RegisterResult {
  /** The sprite's best top-left in the composite, in composite px. */
  x: number;
  y: number;
  /** Mean squared difference per channel after removing each side's mean (0 is perfect). */
  score: number;
}

interface Mask {
  xs: Int32Array;
  ys: Int32Array;
  w: Float32Array;
  /** Mean-removed sprite colour, 3 per pixel. */
  c: Float32Array;
}

function maskOf(sprite: Image, threshold: number): Mask {
  const pts: number[] = [];
  for (let p = 0; p < sprite.width * sprite.height; p++)
    if (sprite.data[p * 4 + 3] >= threshold) pts.push(p);
  const xs = new Int32Array(pts.length);
  const ys = new Int32Array(pts.length);
  const w = new Float32Array(pts.length);
  const c = new Float32Array(pts.length * 3);
  const mean = [0, 0, 0];
  let total = 0;
  pts.forEach((p, k) => {
    xs[k] = p % sprite.width;
    ys[k] = Math.floor(p / sprite.width);
    w[k] = sprite.data[p * 4 + 3] / 255;
    total += w[k];
    for (let ch = 0; ch < 3; ch++) {
      c[k * 3 + ch] = sprite.data[p * 4 + ch];
      mean[ch] += w[k] * sprite.data[p * 4 + ch];
    }
  });
  for (let k = 0; k < pts.length; k++)
    for (let ch = 0; ch < 3; ch++) c[k * 3 + ch] -= mean[ch] / total;
  return { xs, ys, w, c };
}

/** The score of the sprite at (ox, oy), or Infinity if too little of it is inside. */
function scoreAt(
  mask: Mask,
  comp: Image,
  ox: number,
  oy: number,
  minInside: number,
): number {
  const { xs, ys, w, c } = mask;
  const cd = comp.data;
  let total = 0;
  let inside = 0;
  let m0 = 0;
  let m1 = 0;
  let m2 = 0;
  for (let k = 0; k < xs.length; k++) {
    total += w[k];
    const x = ox + xs[k];
    const y = oy + ys[k];
    if (x < 0 || y < 0 || x >= comp.width || y >= comp.height) continue;
    const i = (y * comp.width + x) * 4;
    inside += w[k];
    m0 += w[k] * cd[i];
    m1 += w[k] * cd[i + 1];
    m2 += w[k] * cd[i + 2];
  }
  if (inside === 0 || inside < total * minInside) return Infinity;
  m0 /= inside;
  m1 /= inside;
  m2 /= inside;
  let ssd = 0;
  for (let k = 0; k < xs.length; k++) {
    const x = ox + xs[k];
    const y = oy + ys[k];
    if (x < 0 || y < 0 || x >= comp.width || y >= comp.height) continue;
    const i = (y * comp.width + x) * 4;
    const d0 = cd[i] - m0 - c[k * 3];
    const d1 = cd[i + 1] - m1 - c[k * 3 + 1];
    const d2 = cd[i + 2] - m2 - c[k * 3 + 2];
    ssd += w[k] * (d0 * d0 + d1 * d1 + d2 * d2);
  }
  return ssd / (inside * 3);
}

function shrink(img: Image, f: number): Image {
  if (f === 1) return img;
  return areaDownscale(
    img,
    Math.max(1, Math.round(img.width / f)),
    Math.max(1, Math.round(img.height / f)),
  );
}

/**
 * Find where `sprite` best matches `composite`: a coarse-to-fine search
 * (8x, 4x, 2x, then full size) for the offset with the smallest
 * mean-removed colour difference over the sprite's opaque pixels, so a
 * sprite painted a little lighter or darker still lands in place. The
 * sprite may hang partly off the composite's edge (see `minInside`).
 */
export function register(
  sprite: Image,
  composite: Image,
  opts: RegisterOptions = {},
): RegisterResult {
  const threshold = opts.alphaThreshold ?? 128;
  const minInside = opts.minInside ?? 0.6;
  const radius = opts.radius ?? 64;
  const factors = [8, 4, 2].filter(
    (f) => Math.min(sprite.width, sprite.height) / f >= 8,
  );
  factors.push(1);

  // The search area in full-size px: every offset that keeps enough of the
  // sprite inside, narrowed to `radius` around `near` when given.
  const slackX = Math.ceil(sprite.width * (1 - minInside));
  const slackY = Math.ceil(sprite.height * (1 - minInside));
  let area = {
    x0: -slackX,
    y0: -slackY,
    x1: composite.width - sprite.width + slackX,
    y1: composite.height - sprite.height + slackY,
  };
  if (opts.near) {
    area = {
      x0: Math.max(area.x0, opts.near.x - radius),
      y0: Math.max(area.y0, opts.near.y - radius),
      x1: Math.min(area.x1, opts.near.x + radius),
      y1: Math.min(area.y1, opts.near.y + radius),
    };
  }
  if (area.x0 > area.x1 || area.y0 > area.y1)
    throw new Error("register: the search area is empty");

  let best: RegisterResult = { x: area.x0, y: area.y0, score: Infinity };
  factors.forEach((f, level) => {
    const s = shrink(sprite, f);
    const c = shrink(composite, f);
    const mask = maskOf(s, threshold);
    if (mask.xs.length === 0) throw new Error("register: the sprite is empty");
    // The area at this level, then (after the coarsest) just around the
    // previous level's best.
    let x0 = Math.floor(area.x0 / f);
    let x1 = Math.ceil(area.x1 / f);
    let y0 = Math.floor(area.y0 / f);
    let y1 = Math.ceil(area.y1 / f);
    if (level > 0) {
      const prev = factors[level - 1] / f;
      const r = Math.ceil(prev) + 1;
      const bx = Math.round(best.x * prev);
      const by = Math.round(best.y * prev);
      x0 = Math.max(x0, bx - r);
      x1 = Math.min(x1, bx + r);
      y0 = Math.max(y0, by - r);
      y1 = Math.min(y1, by + r);
    }
    if (f === 1) {
      x0 = Math.max(x0, area.x0);
      x1 = Math.min(x1, area.x1);
      y0 = Math.max(y0, area.y0);
      y1 = Math.min(y1, area.y1);
    }
    let found: RegisterResult = { x: x0, y: y0, score: Infinity };
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const score = scoreAt(mask, c, x, y, minInside);
        if (score < found.score) found = { x, y, score };
      }
    }
    // A coarse level can reject everything at the edge; keep the last best.
    if (Number.isFinite(found.score) || level === 0) best = found;
  });
  if (!Number.isFinite(best.score))
    throw new Error("register: the sprite doesn't fit the search area");
  return best;
}

export interface AlignResult extends RegisterResult {
  /** The chosen scale and the sprite resized to it. */
  scale: number;
  sprite: Image;
}

/**
 * Register `sprite` at each of `scales` (default just 1) and keep the best:
 * a separately generated object is rarely drawn at exactly the composite's
 * scale.
 */
export async function alignSprite(
  sprite: Image,
  composite: Image,
  opts: RegisterOptions & { scales?: readonly number[] } = {},
): Promise<AlignResult> {
  let best: AlignResult | null = null;
  for (const scale of opts.scales ?? [1]) {
    const resized =
      scale === 1
        ? sprite
        : clearDust(
            await resizeLanczos(
              sprite,
              Math.max(1, Math.round(sprite.width * scale)),
              Math.max(1, Math.round(sprite.height * scale)),
            ),
          );
    const r = register(resized, composite, opts);
    if (!best || r.score < best.score) best = { ...r, scale, sprite: resized };
  }
  if (!best) throw new Error("alignSprite: no scales to try");
  return best;
}

/** Parse `--scales`: "0.9,1,1.1" or a range "0.8:1.2:0.05". */
export function parseScales(value: string): number[] {
  const range = /^([\d.]+):([\d.]+):([\d.]+)$/.exec(value.trim());
  if (range) {
    const [from, to, step] = range.slice(1).map(Number);
    if (!(from > 0 && to >= from && step > 0))
      throw new Error(`Bad scale range "${value}"`);
    const out: number[] = [];
    for (let s = from; s <= to + 1e-9; s += step)
      out.push(Math.round(s * 1e4) / 1e4);
    return out;
  }
  const list = value.split(",").map((v) => Number(v.trim()));
  if (list.some((v) => !(v > 0))) throw new Error(`Bad scales "${value}"`);
  return list;
}

/**
 * A review image of an alignment: the composite, with the sprite drawn on top
 * at half opacity and its rectangle outlined in red.
 */
export function alignmentOverlay(
  composite: Image,
  sprite: Image,
  x: number,
  y: number,
): Image {
  const out: Image = {
    ...composite,
    data: new Uint8ClampedArray(composite.data),
  };
  const W = out.width;
  for (let sy = 0; sy < sprite.height; sy++) {
    for (let sx = 0; sx < sprite.width; sx++) {
      const cx = x + sx;
      const cy = y + sy;
      if (cx < 0 || cy < 0 || cx >= W || cy >= out.height) continue;
      const si = (sy * sprite.width + sx) * 4;
      const a = (sprite.data[si + 3] / 255) * 0.5;
      const ci = (cy * W + cx) * 4;
      for (let ch = 0; ch < 3; ch++)
        out.data[ci + ch] = Math.round(
          out.data[ci + ch] * (1 - a) + sprite.data[si + ch] * a,
        );
      const edge =
        sx < 2 || sy < 2 || sx >= sprite.width - 2 || sy >= sprite.height - 2;
      if (edge) out.data.set([255, 40, 40, 255], ci);
    }
  }
  return out;
}

// --- Review sheets ----------------------------------------------------------------------

/** Draw `img` over a grey checkerboard (so its alpha shows), fully opaque. */
export function overCheckerboard(img: Image, cell = 16): Image {
  const out = createImage(img.width, img.height);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const bg =
        (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0 ? 150 : 110;
      const a = img.data[i + 3] / 255;
      for (let ch = 0; ch < 3; ch++)
        out.data[i + ch] = Math.round(img.data[i + ch] * a + bg * (1 - a));
      out.data[i + 3] = 255;
    }
  }
  return out;
}

/** Blend `overlay` (the same size) over `base` at `opacity`, respecting its alpha. */
export function blendOver(base: Image, overlay: Image, opacity: number): Image {
  if (base.width !== overlay.width || base.height !== overlay.height)
    throw new Error("blendOver: the images differ in size");
  const out: Image = { ...base, data: new Uint8ClampedArray(base.data) };
  for (let i = 0; i < out.data.length; i += 4) {
    const a = (overlay.data[i + 3] / 255) * opacity;
    for (let ch = 0; ch < 3; ch++)
      out.data[i + ch] = Math.round(
        out.data[i + ch] * (1 - a) + overlay.data[i + ch] * a,
      );
  }
  return out;
}

/** A label in lib's 3x5 pixel font, scaled up by `scale` (nearest). */
function label(text: string, scale: number): Image {
  const small = createImage(textWidth(text) + 2, 9);
  drawText(small, text, 1, 1, [240, 240, 240]);
  return upscale(small, scale);
}

export interface HdSheetOptions {
  /** Tile width in px; each image is resized to it, keeping its aspect. Default 640. */
  tileWidth?: number;
  cols?: number;
  /**
   * Blended over every tile at `overlayOpacity`: resized to the tile's width
   * and aligned to its bottom edge (the floor), keeping its aspect.
   */
  overlay?: Image;
  overlayOpacity?: number;
  /** One label per image; default 01, 02, ... */
  labels?: string[];
  /** Shown first, alone and without the overlay, labelled REF. */
  reference?: Image;
}

/**
 * A numbered review sheet for HD candidates: every image resized (Lanczos)
 * to the tile width over a checkerboard, with an optional overlay (the scale
 * sheet or the current layout) blended over each, and a large label under
 * each tile.
 */
export async function hdContactSheet(
  images: readonly Image[],
  opts: HdSheetOptions = {},
): Promise<Image> {
  if (images.length === 0) throw new Error("hdContactSheet: no images");
  const tileW = opts.tileWidth ?? 640;
  const cols = opts.cols ?? Math.min(2, images.length);
  const gap = 16;
  const labelScale = Math.max(3, Math.round(tileW / 160));
  const labelH = 9 * labelScale;
  const tiles: Image[] = [];
  const labels = images.map(
    (_, i) => opts.labels?.[i] ?? String(i + 1).padStart(2, "0"),
  );
  const all = opts.reference ? [opts.reference, ...images] : [...images];
  if (opts.reference) labels.unshift("REF");
  for (const [i, img] of all.entries()) {
    const h = Math.max(1, Math.round((img.height * tileW) / img.width));
    let tile = overCheckerboard(await resizeLanczos(img, tileW, h));
    if (opts.overlay && !(opts.reference && i === 0)) {
      // Keep the overlay's aspect: full width, sharing the tile's bottom edge.
      const ov = opts.overlay;
      const oh = Math.max(1, Math.round((ov.height * tileW) / ov.width));
      const scaled = await resizeLanczos(ov, tileW, oh);
      const o = createImage(tileW, h);
      for (let y = 0; y < h; y++) {
        const sy = y - (h - oh);
        if (sy < 0 || sy >= oh) continue;
        o.data.set(
          scaled.data.subarray(sy * tileW * 4, (sy + 1) * tileW * 4),
          y * tileW * 4,
        );
      }
      tile = blendOver(tile, o, opts.overlayOpacity ?? 0.35);
    }
    tiles.push(tile);
  }
  const cellH = Math.max(...tiles.map((t) => t.height)) + labelH;
  const rows = Math.ceil(tiles.length / cols);
  const sheet = createImage(
    cols * tileW + (cols + 1) * gap,
    rows * cellH + (rows + 1) * gap,
    [40, 40, 48],
  );
  tiles.forEach((tile, i) => {
    const x = gap + (i % cols) * (tileW + gap);
    const y = gap + Math.floor(i / cols) * (cellH + gap);
    blit(sheet, tile, x, y);
    blit(sheet, label(labels[i], labelScale), x, y + tile.height);
  });
  return sheet;
}
