/**
 * Shared asset tooling.
 *
 * Everything that touches pixels lives here: image I/O through `sharp`, an
 * exact area-average downscale for any ratio, the OKLab nearest-colour remap
 * restricted to a scene's allowed colours, chroma keying, the alpha threshold,
 * sprite slicing, palette loading, and the palette-index text grid.
 *
 * The resampling and palette code is written by hand on purpose: `sharp` has
 * no area-average kernel, and its palette mode quantizes on its own.
 *
 * Read-only after F1 (Rules for Opus tasks). Propose changes through the
 * orchestrator instead of editing this file from a later task.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// --- Paths ------------------------------------------------------------------

export const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const PALETTE_PATH = resolve(REPO_ROOT, "assets-src/palette/master.hex");
export const REVIEW_DIR = resolve(REPO_ROOT, "assets-src/review");
export const REFS_DIR = resolve(REPO_ROOT, "assets-src/refs");
export const PROVENANCE_DIR = resolve(REPO_ROOT, "assets-src/provenance");

// --- Scenes and palette groups ---------------------------------------------

export const SCENE_IDS = [
  "hall",
  "london",
  "zurich",
  "sorrento",
  "travel-map",
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

/** Palette groups: the shared core plus one ramp per scene that has one. */
export const PALETTE_GROUPS = [
  "core",
  "hall",
  "london",
  "zurich",
  "sorrento",
] as const;
export type PaletteGroup = (typeof PALETTE_GROUPS)[number];

/** Which ramp a scene may use on top of the core. The travel map is core only. */
export const SCENE_RAMP: Record<SceneId, PaletteGroup | null> = {
  hall: "hall",
  london: "london",
  zurich: "zurich",
  sorrento: "sorrento",
  "travel-map": null,
};

export function isSceneId(value: string): value is SceneId {
  return (SCENE_IDS as readonly string[]).includes(value);
}

function isPaletteGroup(value: string): value is PaletteGroup {
  return (PALETTE_GROUPS as readonly string[]).includes(value);
}

/**
 * The scene an asset id belongs to, or null for shared assets (character,
 * slot sprites, anything else), which are core only.
 */
export function sceneForAssetId(assetId: string): SceneId | null {
  // Longest first, so "travel-map-bg" never matches a shorter id.
  const byLength = [...SCENE_IDS].sort((a, b) => b.length - a.length);
  return (
    byLength.find((s) => assetId === s || assetId.startsWith(`${s}-`)) ?? null
  );
}

// --- Density -------------------------------------------------------------------

/**
 * Pixel density (Phase R). Scene data stays in logical 320x160 px; density 1
 * art is drawn at that size and density 2 art (the remaster) at twice it, so a
 * native size is the logical size times the density. The transition runs one
 * scene at a time, so both are valid.
 */
export const DENSITIES = [1, 2] as const;
export type Density = (typeof DENSITIES)[number];

export function isDensity(value: unknown): value is Density {
  return (DENSITIES as readonly unknown[]).includes(value);
}

/** Parse a --density value; undefined means 1. */
export function parseDensity(value: string | undefined): Density {
  if (value === undefined) return 1;
  const n = Number(value);
  if (!isDensity(n)) {
    throw new Error(
      `Unknown density "${value}". Use one of ${DENSITIES.join(", ")}`,
    );
  }
  return n;
}

/** The logical scene size every coordinate in the scene data uses. */
export const LOGICAL_SCENE_SIZE = { w: 320, h: 160 } as const;

/** Native scene size at a density: 320x160 at 1, 640x320 at 2. */
export function sceneSize(density: Density = 1): { w: number; h: number } {
  return {
    w: LOGICAL_SCENE_SIZE.w * density,
    h: LOGICAL_SCENE_SIZE.h * density,
  };
}

/**
 * A preview scale that shows density-`density` art at the same physical size
 * as density-1 art at `base`: an 8x preview of density-2 art is 4x.
 */
export function previewScale(base: number, density: Density = 1): number {
  return Math.max(1, Math.round(base / density));
}

// --- Colour ------------------------------------------------------------------

export type Rgb = readonly [number, number, number];

export function parseHex(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Not a #rrggbb colour: "${hex}"`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export type Oklab = readonly [number, number, number];

function srgbToLinear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** sRGB (0–255) to OKLab (Björn Ottosson, 2020). */
export function rgbToOklab([r8, g8, b8]: Rgb): Oklab {
  const r = srgbToLinear(r8);
  const g = srgbToLinear(g8);
  const b = srgbToLinear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabDistance(a: Oklab, b: Oklab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// --- Palette -----------------------------------------------------------------

/** Pure magenta is the chroma key and must never enter the palette. */
export const CHROMA_KEY: Rgb = [255, 0, 255];
export const TRANSPARENT_INDEX = ".";

export interface PaletteColour {
  index: string;
  hex: string;
  rgb: Rgb;
  lab: Oklab;
  group: PaletteGroup;
}

export interface Palette {
  version: string;
  colours: PaletteColour[];
  byIndex: Map<string, PaletteColour>;
}

/**
 * Parse `master.hex`: one `idx hex group` per line. Lines starting with `#`
 * are comments; `# palette: v0` sets the version.
 */
export function parsePalette(text: string): Palette {
  let version = "v0";
  const colours: PaletteColour[] = [];
  const byIndex = new Map<string, PaletteColour>();
  const byHex = new Map<string, string>();

  text.split(/\r?\n/).forEach((raw, lineNo) => {
    const line = raw.trim();
    if (!line) return;
    if (line.startsWith("#")) {
      const v = /^#\s*palette:\s*(\S+)/i.exec(line);
      if (v) version = v[1];
      return;
    }
    const where = `master.hex line ${lineNo + 1}`;
    const parts = line.split(/\s+/);
    if (parts.length !== 3) {
      throw new Error(`${where}: expected "idx hex group", got "${line}"`);
    }
    const [index, hex, group] = parts;
    if (
      [...index].length !== 1 ||
      index === TRANSPARENT_INDEX ||
      !/^[!-~]$/.test(index)
    ) {
      throw new Error(
        `${where}: index must be one printable ASCII character other than "."`,
      );
    }
    if (!isPaletteGroup(group)) {
      throw new Error(`${where}: unknown group "${group}"`);
    }
    if (byIndex.has(index))
      throw new Error(`${where}: duplicate index "${index}"`);
    const rgb = parseHex(hex);
    const norm = toHex(rgb);
    if (norm === toHex(CHROMA_KEY)) {
      throw new Error(
        `${where}: #ff00ff is the chroma key and can't be a colour`,
      );
    }
    const dup = byHex.get(norm);
    if (dup !== undefined) {
      throw new Error(`${where}: ${norm} duplicates index "${dup}"`);
    }
    byHex.set(norm, index);
    const colour: PaletteColour = {
      index,
      hex: norm,
      rgb,
      lab: rgbToOklab(rgb),
      group,
    };
    colours.push(colour);
    byIndex.set(index, colour);
  });

  return { version, colours, byIndex };
}

export function loadPalette(path = PALETTE_PATH): Palette {
  return parsePalette(readFileSync(path, "utf8"));
}

/**
 * The colours a scene may use: the core plus its own ramp. `null` (shared
 * assets, the character) means the core only.
 */
export function allowedColours(
  palette: Palette,
  scene: SceneId | null,
): PaletteColour[] {
  const ramp = scene ? SCENE_RAMP[scene] : null;
  return palette.colours.filter((c) => c.group === "core" || c.group === ramp);
}

/** The palette as a GIMP/Aseprite `.gpl` file. */
export function toGpl(palette: Palette, name = "retro-game-portfolio"): string {
  const lines = [
    "GIMP Palette",
    `Name: ${name} ${palette.version}`,
    "Columns: 9",
    "#",
    ...palette.colours.map(
      (c) =>
        `${c.rgb.map((v) => String(v).padStart(3)).join(" ")}\t${c.index} ${c.group}`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

// --- Images ------------------------------------------------------------------

/** 8-bit RGBA, row-major. */
export interface Image {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export function createImage(width: number, height: number, fill?: Rgb): Image {
  const data = new Uint8ClampedArray(width * height * 4);
  if (fill) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

export function getPixel(
  img: Image,
  x: number,
  y: number,
): [number, number, number, number] {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}

export function setPixel(
  img: Image,
  x: number,
  y: number,
  rgb: Rgb,
  alpha = 255,
): void {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = rgb[0];
  img.data[i + 1] = rgb[1];
  img.data[i + 2] = rgb[2];
  img.data[i + 3] = alpha;
}

export function fillRect(
  img: Image,
  x: number,
  y: number,
  w: number,
  h: number,
  rgb: Rgb,
): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(img, xx, yy, rgb);
  }
}

export async function readImage(path: string): Promise<Image> {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`${path}: expected RGBA`);
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}

function toSharp(img: Image) {
  return sharp(
    Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength),
    {
      raw: { width: img.width, height: img.height, channels: 4 },
    },
  );
}

export async function writePng(path: string, img: Image): Promise<void> {
  mkdirSync(dirname(path), { recursive: true });
  await toSharp(img).png({ compressionLevel: 9, palette: false }).toFile(path);
}

/** Lossless WebP, for approved raw candidates. */
export async function writeWebp(path: string, img: Image): Promise<void> {
  mkdirSync(dirname(path), { recursive: true });
  await toSharp(img).webp({ lossless: true }).toFile(path);
}

// --- Geometry ----------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function parseRect(value: string): Rect {
  const parts = value.split(",").map((v) => Number(v.trim()));
  if (parts.length !== 4 || parts.some((v) => !Number.isInteger(v))) {
    throw new Error(`Expected "x,y,w,h" in integers, got "${value}"`);
  }
  const [x, y, w, h] = parts;
  if (w <= 0 || h <= 0) throw new Error(`Rect "${value}" has no area`);
  return { x, y, w, h };
}

export function parseSize(value: string): { w: number; h: number } {
  const m = /^(\d+)x(\d+)$/.exec(value.trim());
  if (!m) throw new Error(`Expected a size like "320x160", got "${value}"`);
  return { w: Number(m[1]), h: Number(m[2]) };
}

export function parsePoint(value: string): { x: number; y: number } {
  const parts = value.split(",").map((v) => Number(v.trim()));
  if (parts.length !== 2 || parts.some((v) => !Number.isFinite(v))) {
    throw new Error(`Expected "x,y", got "${value}"`);
  }
  return { x: parts[0], y: parts[1] };
}

export function crop(img: Image, r: Rect): Image {
  if (r.x < 0 || r.y < 0 || r.x + r.w > img.width || r.y + r.h > img.height) {
    throw new Error(
      `Crop ${r.x},${r.y},${r.w},${r.h} falls outside the ${img.width}x${img.height} image`,
    );
  }
  const out = createImage(r.w, r.h);
  for (let y = 0; y < r.h; y++) {
    const from = ((r.y + y) * img.width + r.x) * 4;
    out.data.set(img.data.subarray(from, from + r.w * 4), y * r.w * 4);
  }
  return out;
}

/** Copy `src` onto `dst` at (x, y). Transparent source pixels are skipped. */
export function blit(dst: Image, src: Image, x: number, y: number): void {
  for (let yy = 0; yy < src.height; yy++) {
    for (let xx = 0; xx < src.width; xx++) {
      const [r, g, b, a] = getPixel(src, xx, yy);
      if (a > 0) setPixel(dst, x + xx, y + yy, [r, g, b], a);
    }
  }
}

/** Bounding box of pixels with alpha >= threshold, or null if there are none. */
export function alphaBounds(img: Image, threshold = 128): Rect | null {
  let minX = img.width;
  let minY = img.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] >= threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** The largest rectangle with the target aspect ratio, centred in the image. */
export function centredAspectCrop(
  width: number,
  height: number,
  aspectW: number,
  aspectH: number,
): Rect {
  const target = aspectW / aspectH;
  if (width / height > target) {
    const w = Math.round(height * target);
    return { x: Math.floor((width - w) / 2), y: 0, w, h: height };
  }
  const h = Math.round(width / target);
  return { x: 0, y: Math.floor((height - h) / 2), w: width, h };
}

// --- Resampling --------------------------------------------------------------

/** For each output cell along one axis, the source indices it covers and their weights. */
function areaWeights(
  src: number,
  dst: number,
): { index: number; weight: number }[][] {
  const scale = src / dst;
  const cells: { index: number; weight: number }[][] = [];
  for (let o = 0; o < dst; o++) {
    const start = o * scale;
    const end = start + scale;
    const taps: { index: number; weight: number }[] = [];
    for (let i = Math.floor(start); i < Math.min(src, Math.ceil(end)); i++) {
      const overlap = Math.min(end, i + 1) - Math.max(start, i);
      if (overlap > 1e-9) taps.push({ index: i, weight: overlap / scale });
    }
    cells.push(taps);
  }
  return cells;
}

/**
 * Downscale by area-averaging (a box filter with exact fractional coverage),
 * for any ratio. Colour is averaged with premultiplied alpha, so transparent
 * pixels (a keyed-out background) never bleed into the result.
 */
export function areaDownscale(
  img: Image,
  width: number,
  height: number,
): Image {
  if (width > img.width || height > img.height) {
    throw new Error(
      `areaDownscale only shrinks: ${img.width}x${img.height} -> ${width}x${height}`,
    );
  }
  const xs = areaWeights(img.width, width);
  const ys = areaWeights(img.height, height);

  // Horizontal pass into premultiplied floats: width x img.height.
  const mid = new Float64Array(width * img.height * 4);
  for (let y = 0; y < img.height; y++) {
    for (let ox = 0; ox < width; ox++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (const { index, weight } of xs[ox]) {
        const i = (y * img.width + index) * 4;
        const alpha = (img.data[i + 3] / 255) * weight;
        r += img.data[i] * alpha;
        g += img.data[i + 1] * alpha;
        b += img.data[i + 2] * alpha;
        a += alpha;
      }
      const o = (y * width + ox) * 4;
      mid[o] = r;
      mid[o + 1] = g;
      mid[o + 2] = b;
      mid[o + 3] = a;
    }
  }

  const out = createImage(width, height);
  for (let oy = 0; oy < height; oy++) {
    for (let ox = 0; ox < width; ox++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (const { index, weight } of ys[oy]) {
        const i = (index * width + ox) * 4;
        r += mid[i] * weight;
        g += mid[i + 1] * weight;
        b += mid[i + 2] * weight;
        a += mid[i + 3] * weight;
      }
      const o = (oy * width + ox) * 4;
      if (a > 1e-9) {
        out.data[o] = Math.round(r / a);
        out.data[o + 1] = Math.round(g / a);
        out.data[o + 2] = Math.round(b / a);
      }
      out.data[o + 3] = Math.round(a * 255);
    }
  }
  return out;
}

/** Nearest-neighbour upscale by an integer factor. */
export function upscale(img: Image, factor: number): Image {
  if (!Number.isInteger(factor) || factor < 1) {
    throw new Error(`Upscale factor must be a positive integer, got ${factor}`);
  }
  const out = createImage(img.width * factor, img.height * factor);
  for (let y = 0; y < out.height; y++) {
    const sy = Math.floor(y / factor);
    for (let x = 0; x < out.width; x++) {
      const si = (sy * img.width + Math.floor(x / factor)) * 4;
      const o = (y * out.width + x) * 4;
      out.data[o] = img.data[si];
      out.data[o + 1] = img.data[si + 1];
      out.data[o + 2] = img.data[si + 2];
      out.data[o + 3] = img.data[si + 3];
    }
  }
  return out;
}

// --- Alpha and chroma key ------------------------------------------------------

/** Default RGB distance from the key colour that counts as background. */
export const DEFAULT_KEY_TOLERANCE = 90;

/**
 * Make every pixel within `tolerance` (Euclidean RGB distance) of `key`
 * fully transparent. Run it on the raw image, before downscaling.
 */
export function chromaKey(
  img: Image,
  key: Rgb = CHROMA_KEY,
  tolerance = DEFAULT_KEY_TOLERANCE,
): Image {
  const out: Image = { ...img, data: new Uint8ClampedArray(img.data) };
  for (let i = 0; i < out.data.length; i += 4) {
    const d = Math.hypot(
      out.data[i] - key[0],
      out.data[i + 1] - key[1],
      out.data[i + 2] - key[2],
    );
    if (d <= tolerance) {
      out.data[i] = 0;
      out.data[i + 1] = 0;
      out.data[i + 2] = 0;
      out.data[i + 3] = 0;
    }
  }
  return out;
}

/** Snap alpha to 0 or 255: at or above `threshold` is opaque. */
export function thresholdAlpha(img: Image, threshold = 128): Image {
  const out: Image = { ...img, data: new Uint8ClampedArray(img.data) };
  for (let i = 3; i < out.data.length; i += 4) {
    out.data[i] = out.data[i] >= threshold ? 255 : 0;
    if (out.data[i] === 0) {
      out.data[i - 3] = 0;
      out.data[i - 2] = 0;
      out.data[i - 1] = 0;
    }
  }
  return out;
}

// --- Palette remap -------------------------------------------------------------

export function nearestColour(
  rgb: Rgb,
  colours: readonly PaletteColour[],
): PaletteColour {
  if (colours.length === 0) throw new Error("No colours to map to");
  const lab = rgbToOklab(rgb);
  let best = colours[0];
  let bestD = Infinity;
  for (const c of colours) {
    const d = oklabDistance(lab, c.lab);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * Map every pixel to its nearest allowed colour in OKLab, with no dithering,
 * and snap alpha to 0 or 255.
 */
export function remapToPalette(
  img: Image,
  colours: readonly PaletteColour[],
  alphaThreshold = 128,
): Image {
  const out = thresholdAlpha(img, alphaThreshold);
  const cache = new Map<number, PaletteColour>();
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] === 0) continue;
    const key = (out.data[i] << 16) | (out.data[i + 1] << 8) | out.data[i + 2];
    let c = cache.get(key);
    if (!c) {
      c = nearestColour(
        [out.data[i], out.data[i + 1], out.data[i + 2]],
        colours,
      );
      cache.set(key, c);
    }
    out.data[i] = c.rgb[0];
    out.data[i + 1] = c.rgb[1];
    out.data[i + 2] = c.rgb[2];
  }
  return out;
}

// --- Pixelize --------------------------------------------------------------------

export interface PixelizeOptions {
  /** Target native size. */
  width: number;
  height: number;
  colours: readonly PaletteColour[];
  /** "auto", an explicit rect, or undefined for the whole image. */
  crop?: "auto" | Rect;
  /** Key colour to make transparent before resampling. */
  key?: Rgb;
  keyTolerance?: number;
  alphaThreshold?: number;
}

/**
 * Raw candidate to native pixel art: key, crop, area-average, remap.
 *
 * `crop: "auto"` uses the opaque bounding box when the image has transparency
 * (after keying), and otherwise the largest centred crop at the target aspect
 * ratio. The result is then resized to exactly width x height.
 */
export function pixelize(img: Image, opts: PixelizeOptions): Image {
  let src = opts.key ? chromaKey(img, opts.key, opts.keyTolerance) : img;
  if (opts.crop === "auto") {
    const bounds = hasTransparency(src)
      ? alphaBounds(src, opts.alphaThreshold)
      : null;
    src = crop(
      src,
      bounds ??
        centredAspectCrop(src.width, src.height, opts.width, opts.height),
    );
  } else if (opts.crop) {
    src = crop(src, opts.crop);
  }
  const small = areaDownscale(src, opts.width, opts.height);
  return remapToPalette(small, opts.colours, opts.alphaThreshold);
}

export function hasTransparency(img: Image): boolean {
  for (let i = 3; i < img.data.length; i += 4)
    if (img.data[i] < 255) return true;
  return false;
}

// --- Sprite slicing ----------------------------------------------------------------

export interface SliceOptions {
  alphaThreshold?: number;
  /** A row or column with this many opaque pixels or fewer counts as empty. */
  noise?: number;
  /** Empty runs shorter than this don't split figures (gaps inside a figure). */
  minGap?: number;
  /**
   * Figures shorter than this fraction of the tallest are dropped as specks
   * (stray marks, sparkles, a detached shadow). Default 0.25.
   */
  minHeightRatio?: number;
}

function runs(
  profile: number[],
  noise: number,
  minGap: number,
): [number, number][] {
  const spans: [number, number][] = [];
  let start = -1;
  let gap = 0;
  for (let i = 0; i <= profile.length; i++) {
    const filled = i < profile.length && profile[i] > noise;
    if (filled) {
      if (start < 0) start = i;
      gap = 0;
    } else if (start >= 0) {
      gap++;
      if (gap >= minGap || i === profile.length) {
        spans.push([start, i - gap + 1]);
        start = -1;
        gap = 0;
      }
    }
  }
  return spans.map(([a, b]) => [a, b] as [number, number]);
}

/**
 * Find the figures on a keyed sprite sheet: split into rows by empty
 * horizontal bands, then each row into figures by empty vertical bands.
 * Returns tight bounding boxes, left to right, top to bottom.
 */
export function findFigures(img: Image, opts: SliceOptions = {}): Rect[] {
  const threshold = opts.alphaThreshold ?? 128;
  const noise = opts.noise ?? 0;
  const minGap = opts.minGap ?? Math.max(2, Math.round(img.width / 200));
  const opaque = (x: number, y: number) =>
    img.data[(y * img.width + x) * 4 + 3] >= threshold;

  const rowProfile = Array.from({ length: img.height }, (_, y) => {
    let n = 0;
    for (let x = 0; x < img.width; x++) if (opaque(x, y)) n++;
    return n;
  });
  const figures: Rect[] = [];
  for (const [y0, y1] of runs(rowProfile, noise, minGap)) {
    const colProfile = Array.from({ length: img.width }, (_, x) => {
      let n = 0;
      for (let y = y0; y < y1; y++) if (opaque(x, y)) n++;
      return n;
    });
    for (const [x0, x1] of runs(colProfile, noise, minGap)) {
      const band = crop(img, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      const b = alphaBounds(band, threshold);
      if (b) figures.push({ x: x0 + b.x, y: y0 + b.y, w: b.w, h: b.h });
    }
  }
  const tallest = Math.max(0, ...figures.map((f) => f.h));
  const minH = tallest * (opts.minHeightRatio ?? 0.25);
  return figures.filter((f) => f.h >= minH);
}

export interface CellOptions {
  cellW: number;
  cellH: number;
  /** Row the feet rest on (0-indexed). */
  feetRow: number;
  /** Height of the tallest figure after scaling. The same scale applies to every figure. */
  figureHeight: number;
  colours: readonly PaletteColour[];
  alphaThreshold?: number;
}

/**
 * Scale every figure by one shared factor (so the tallest is `figureHeight`),
 * and place each in its own cell, feet on `feetRow`, horizontally centred.
 * Returns a horizontal strip of cells.
 */
export function figuresToCells(
  img: Image,
  figures: Rect[],
  opts: CellOptions,
): Image {
  if (figures.length === 0) throw new Error("No figures found on the sheet");
  const tallest = Math.max(...figures.map((f) => f.h));
  const scale = opts.figureHeight / tallest;
  const strip = createImage(opts.cellW * figures.length, opts.cellH);
  figures.forEach((f, i) => {
    const w = Math.max(1, Math.min(f.w, Math.round(f.w * scale)));
    const h = Math.max(1, Math.min(f.h, Math.round(f.h * scale)));
    if (w > opts.cellW || h > opts.feetRow + 1) {
      throw new Error(
        `Figure ${i + 1} scales to ${w}x${h}, which doesn't fit a ${opts.cellW}x${opts.cellH} cell with feet on row ${opts.feetRow}`,
      );
    }
    const small = remapToPalette(
      areaDownscale(crop(img, f), w, h),
      opts.colours,
      opts.alphaThreshold,
    );
    const x = i * opts.cellW + Math.floor((opts.cellW - w) / 2);
    const y = opts.feetRow + 1 - h;
    blit(strip, small, x, y);
  });
  return strip;
}

/** Split a horizontal strip into equal frames. */
export function splitStrip(
  strip: Image,
  frameW: number,
  frameH = strip.height,
): Image[] {
  if (strip.width % frameW !== 0 || strip.height !== frameH) {
    throw new Error(
      `A ${strip.width}x${strip.height} strip doesn't split into ${frameW}x${frameH} frames`,
    );
  }
  return Array.from({ length: strip.width / frameW }, (_, i) =>
    crop(strip, { x: i * frameW, y: 0, w: frameW, h: frameH }),
  );
}

// --- Cutouts -----------------------------------------------------------------------

export type Point = readonly [number, number];

/** Even-odd point-in-polygon test. */
export function pointInPolygon(
  x: number,
  y: number,
  poly: readonly Point[],
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

export function parsePolygon(value: string): Point[] {
  const points = value
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const { x, y } = parsePoint(pair);
      return [x, y] as const;
    });
  if (points.length < 3) throw new Error("A polygon needs at least 3 points");
  return points;
}

export interface Cutout {
  /** The object sprite, cropped to the pixels inside the polygon. */
  sprite: Image;
  /** Where the sprite sits in the composite (native px, top-left origin). */
  position: Rect;
  /** The sprite's opaque bounding box, in composite coordinates: the default hotspot. */
  bounds: Rect | null;
  /** The composite with the cut pixels made transparent: the hole a clean plate fills. */
  hole: Image;
}

/**
 * Cut the pixels whose centres fall inside `poly` out of a composite. The
 * sprite keeps the composite's colours and transparency.
 *
 * `align` (default 1) grows the sprite's rectangle outwards, with transparent
 * padding, until its position and size are multiples of `align`. Pass the
 * density, so a 2x sprite sits on a whole logical pixel.
 */
export function cutPolygon(
  img: Image,
  poly: readonly Point[],
  opts: { align?: number } = {},
): Cutout {
  const align = opts.align ?? 1;
  if (!Number.isInteger(align) || align < 1) {
    throw new Error(`Alignment must be a positive integer, got ${align}`);
  }
  const inside = (x: number, y: number) =>
    pointInPolygon(x + 0.5, y + 0.5, poly);
  let minX = img.width;
  let minY = img.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (!inside(x, y)) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) throw new Error("The polygon covers no pixels");
  minX = Math.floor(minX / align) * align;
  minY = Math.floor(minY / align) * align;
  maxX = Math.min(img.width, Math.ceil((maxX + 1) / align) * align) - 1;
  maxY = Math.min(img.height, Math.ceil((maxY + 1) / align) * align) - 1;
  const position = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  const sprite = createImage(position.w, position.h);
  const hole: Image = { ...img, data: new Uint8ClampedArray(img.data) };
  for (let y = position.y; y <= maxY; y++) {
    for (let x = position.x; x <= maxX; x++) {
      if (!inside(x, y)) continue;
      const [r, g, b, a] = getPixel(img, x, y);
      setPixel(sprite, x - position.x, y - position.y, [r, g, b], a);
      setPixel(hole, x, y, [0, 0, 0], 0);
    }
  }
  const local = alphaBounds(sprite, 1);
  const bounds = local
    ? { ...local, x: local.x + position.x, y: local.y + position.y }
    : null;
  return { sprite, position, bounds, hole };
}

// --- Palette-index grids --------------------------------------------------------------

export interface Grid {
  /** Header fields, e.g. asset, frame, palette, size, region. */
  header: Record<string, string>;
  width: number;
  height: number;
  rows: string[];
}

/** Image to palette-index text. Every opaque pixel must be an exact palette colour. */
export function imageToGrid(
  img: Image,
  palette: Palette,
  header: Record<string, string> = {},
): string {
  const byRgb = new Map(palette.colours.map((c) => [c.hex, c.index]));
  const rows: string[] = [];
  for (let y = 0; y < img.height; y++) {
    let row = "";
    for (let x = 0; x < img.width; x++) {
      const [r, g, b, a] = getPixel(img, x, y);
      if (a === 0) {
        row += TRANSPARENT_INDEX;
        continue;
      }
      if (a !== 255) throw new Error(`Pixel ${x},${y} has partial alpha ${a}`);
      const idx = byRgb.get(toHex([r, g, b]));
      if (idx === undefined) {
        throw new Error(
          `Pixel ${x},${y} is ${toHex([r, g, b])}, which isn't in the palette`,
        );
      }
      row += idx;
    }
    rows.push(row);
  }
  const fields = {
    ...header,
    palette: palette.version,
    size: `${img.width}x${img.height}`,
  };
  const head = `# ${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("  ")}`;
  return `${head}\n${rows.join("\n")}\n`;
}

/** Parse grid text. Rejects ragged rows, a size mismatch, and unknown indices. */
export function parseGrid(text: string, palette?: Palette): Grid {
  const header: Record<string, string> = {};
  const rows: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("#")) {
      for (const field of line
        .slice(1)
        .trim()
        .split(/\s{2,}/)) {
        const m = /^([\w-]+):\s*(.*)$/.exec(field.trim());
        if (m) header[m[1]] = m[2];
      }
      continue;
    }
    if (line.trim() === "") continue;
    rows.push(line.replace(/\s+$/, ""));
  }
  if (rows.length === 0) throw new Error("Grid has no rows");
  const width = [...rows[0]].length;
  rows.forEach((row, y) => {
    const len = [...row].length;
    if (len !== width) {
      throw new Error(
        `Ragged grid: row ${y} has ${len} pixels, row 0 has ${width}`,
      );
    }
  });
  if (header.size) {
    const { w, h } = parseSize(header.size);
    if (w !== width || h !== rows.length) {
      throw new Error(
        `Grid is ${width}x${rows.length} but its header says ${header.size}`,
      );
    }
  }
  if (palette) {
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch !== TRANSPARENT_INDEX && !palette.byIndex.has(ch)) {
          throw new Error(`Unknown palette index "${ch}" at ${x},${y}`);
        }
      });
    });
  }
  return { header, width, height: rows.length, rows };
}

export function gridToImage(grid: Grid, palette: Palette): Image {
  const img = createImage(grid.width, grid.height);
  grid.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === TRANSPARENT_INDEX) return;
      const c = palette.byIndex.get(ch);
      if (!c) throw new Error(`Unknown palette index "${ch}" at ${x},${y}`);
      setPixel(img, x, y, c.rgb);
    });
  });
  return img;
}

/** Replace a region of `img` with `patch`, transparent pixels included. */
export function patchRegion(
  img: Image,
  patch: Image,
  x: number,
  y: number,
): Image {
  if (
    x < 0 ||
    y < 0 ||
    x + patch.width > img.width ||
    y + patch.height > img.height
  ) {
    throw new Error(
      `A ${patch.width}x${patch.height} patch at ${x},${y} falls outside the ${img.width}x${img.height} image`,
    );
  }
  const out: Image = { ...img, data: new Uint8ClampedArray(img.data) };
  for (let yy = 0; yy < patch.height; yy++) {
    const from = yy * patch.width * 4;
    out.data.set(
      patch.data.subarray(from, from + patch.width * 4),
      ((y + yy) * img.width + x) * 4,
    );
  }
  return out;
}

// --- Checks -------------------------------------------------------------------------

export interface PaletteReport {
  /** Opaque colours not in the palette at all. */
  offPalette: string[];
  /** Palette colours from a ramp this asset isn't allowed to use. */
  wrongRamp: string[];
  partialAlpha: number;
}

export function checkImagePalette(
  img: Image,
  palette: Palette,
  scene: SceneId | null,
): PaletteReport {
  const allowed = new Set(allowedColours(palette, scene).map((c) => c.hex));
  const all = new Map(palette.colours.map((c) => [c.hex, c]));
  const offPalette = new Set<string>();
  const wrongRamp = new Set<string>();
  let partialAlpha = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    const a = img.data[i + 3];
    if (a === 0) continue;
    if (a !== 255) {
      partialAlpha++;
      continue;
    }
    const hex = toHex([img.data[i], img.data[i + 1], img.data[i + 2]]);
    if (allowed.has(hex)) continue;
    const c = all.get(hex);
    if (c) wrongRamp.add(`${hex} (${c.index}, ${c.group})`);
    else offPalette.add(hex);
  }
  return {
    offPalette: [...offPalette],
    wrongRamp: [...wrongRamp],
    partialAlpha,
  };
}

// --- A tiny pixel font for review sheets (never for shipped art) ----------------------

const GLYPHS: Record<string, string> = {
  "0": "111101101101111",
  "1": "010110010010111",
  "2": "111001111100111",
  "3": "111001111001111",
  "4": "101101111001001",
  "5": "111100111001111",
  "6": "111100111101111",
  "7": "111001010010010",
  "8": "111101111101111",
  "9": "111101111001111",
  A: "010101111101101",
  B: "110101110101110",
  C: "011100100100011",
  D: "110101101101110",
  E: "111100110100111",
  F: "111100110100100",
  G: "011100101101011",
  H: "101101111101101",
  I: "111010010010111",
  J: "001001001101010",
  K: "101101110101101",
  L: "100100100100111",
  M: "101111111101101",
  N: "110101101101101",
  O: "010101101101010",
  P: "110101110100100",
  Q: "010101101110011",
  R: "110101110101101",
  S: "011100010001110",
  T: "111010010010010",
  U: "101101101101111",
  V: "101101101101010",
  W: "101101111111101",
  X: "101101010101101",
  Y: "101101010010010",
  Z: "111001010100111",
  "-": "000000111000000",
  ".": "000000000000010",
  ":": "000010000010000",
  " ": "000000000000000",
  // Punctuation, for the palette v2 indices on review swatches.
  "!": "010010010000010",
  "%": "101001010100101",
  "&": "010101010101011",
  "(": "001010010010001",
  ")": "100010010010100",
  "*": "000101010101000",
  "+": "000010111010000",
  ",": "000000000010100",
  "/": "001001010100100",
  ";": "000010000010100",
  "<": "001010100010001",
  "=": "000111000111000",
  ">": "100010001010100",
  "?": "111001010000010",
  "@": "010101111100011",
  "[": "110100100100110",
  "]": "011001001001011",
  "^": "010101000000000",
  _: "000000000000111",
  "{": "011010110010011",
  "}": "110010011010110",
  "~": "000011110000000",
};

/**
 * Draw text in a 3x5 pixel font. Lowercase letters draw as their capital with
 * an underline, so case-sensitive palette indices stay distinguishable.
 */
export function drawText(
  img: Image,
  text: string,
  x: number,
  y: number,
  rgb: Rgb,
): void {
  let cx = x;
  for (const ch of text) {
    const upper = ch.toUpperCase();
    const glyph = GLYPHS[upper] ?? GLYPHS[" "];
    for (let i = 0; i < 15; i++) {
      if (glyph[i] === "1")
        setPixel(img, cx + (i % 3), y + Math.floor(i / 3), rgb);
    }
    if (ch !== upper) fillRect(img, cx, y + 6, 3, 1, rgb);
    cx += 4;
  }
}

export function textWidth(text: string): number {
  return Math.max(0, [...text].length * 4 - 1);
}

/** Lay images out in a grid with a numbered caption under each (01, 02, ...). */
export function contactSheet(
  images: Image[],
  opts: {
    cols?: number;
    gap?: number;
    background?: Rgb;
    labels?: string[];
    ink?: Rgb;
  } = {},
): Image {
  const cols = opts.cols ?? Math.ceil(Math.sqrt(images.length));
  const gap = opts.gap ?? 4;
  const labelH = 9;
  const cellW = Math.max(...images.map((i) => i.width));
  const cellH = Math.max(...images.map((i) => i.height)) + labelH;
  const rows = Math.ceil(images.length / cols);
  const sheet = createImage(
    cols * cellW + (cols + 1) * gap,
    rows * cellH + (rows + 1) * gap,
    opts.background ?? [40, 40, 48],
  );
  images.forEach((img, i) => {
    const x = gap + (i % cols) * (cellW + gap);
    const y = gap + Math.floor(i / cols) * (cellH + gap);
    blit(sheet, img, x, y);
    const label = opts.labels?.[i] ?? String(i + 1).padStart(2, "0");
    drawText(sheet, label, x, y + img.height + 2, opts.ink ?? [240, 240, 240]);
  });
  return sheet;
}

// --- CLI helpers ------------------------------------------------------------------------

/** Print an error and exit non-zero; used by every CLI entry point. */
export function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

/** Resolve a path given on the command line against the current directory. */
export function cliPath(p: string): string {
  return resolve(process.cwd(), p);
}

/** Parse a --scene value: a scene id, or "core" for shared assets. */
export function parseSceneOption(value: string | undefined): SceneId | null {
  if (value === undefined || value === "core") return null;
  if (!isSceneId(value)) {
    throw new Error(
      `Unknown scene "${value}". Use one of ${SCENE_IDS.join(", ")}, or core`,
    );
  }
  return value;
}

/** Parse a --key value like "ff00ff" or "#ff00ff". */
export function parseKeyOption(value: string | undefined): Rgb | undefined {
  return value === undefined ? undefined : parseHex(value);
}

// --- Character sheet (daniele.png + daniele.json) -----------------------------------------

export const BODY_CELL = { w: 32, h: 64 } as const;
export const HEAD_CELL = { w: 16, h: 16 } as const;
/** Feet rest on row 61; the origin is bottom centre. */
export const CHARACTER_ORIGIN = { x: 16, y: 61 } as const;

/** Cell sizes, feet row, and default pack settings for the character at one density. */
export interface CharacterMetrics {
  body: { w: number; h: number };
  head: { w: number; h: number };
  /** Bottom centre of the body cell, on the feet row. */
  origin: { x: number; y: number };
  /** Row the feet rest on (0-indexed). */
  feetRow: number;
  /** Default height of the tallest figure when slicing a sheet. */
  figureHeight: number;
  /** Default top-left of the talk head cell, relative to the body cell. */
  talkHeadOffset: { x: number; y: number };
}

/**
 * The character at each density (Phase R): 32x64 cells with feet on row 61 at
 * density 1, and 64x128 cells with feet on row 123 (the bottom row of logical
 * row 61) and a 114–116 px figure at 2.
 */
const CHARACTER_METRICS: Record<Density, CharacterMetrics> = {
  1: {
    body: { ...BODY_CELL },
    head: { ...HEAD_CELL },
    origin: { ...CHARACTER_ORIGIN },
    feetRow: 61,
    figureHeight: 57,
    talkHeadOffset: { x: 8, y: 4 },
  },
  2: {
    body: { w: 64, h: 128 },
    head: { w: 32, h: 32 },
    origin: { x: 32, y: 123 },
    feetRow: 123,
    figureHeight: 115,
    talkHeadOffset: { x: 16, y: 8 },
  },
};

export function characterMetrics(density: Density = 1): CharacterMetrics {
  const m = CHARACTER_METRICS[density];
  return {
    body: { ...m.body },
    head: { ...m.head },
    origin: { ...m.origin },
    feetRow: m.feetRow,
    figureHeight: m.figureHeight,
    talkHeadOffset: { ...m.talkHeadOffset },
  };
}

export type CharacterTiming =
  /** Advance one frame every stride / frames native px moved. */
  | { mode: "distance" }
  /** Hold the first frame 2–4 s, play the rest, blink for blinkMs. */
  | { mode: "idle"; holdMs: [number, number]; blinkMs: number }
  | { mode: "static" }
  /** Reach out over reachMs, hold while the action runs, then return. */
  | { mode: "use"; reachMs: number }
  /** A random frame every 100–140 ms, only while idle. */
  | { mode: "random"; frameMs: [number, number] };

export interface CharacterTagSpec {
  frames: number;
  cell: { w: number; h: number };
  timing: CharacterTiming;
}

/** The art spec's Character table: 31 body frames and 6 talk heads, 37 in all. */
export const CHARACTER_TAGS: Record<string, CharacterTagSpec> = {
  "walk-e": { frames: 8, cell: BODY_CELL, timing: { mode: "distance" } },
  "walk-s": { frames: 6, cell: BODY_CELL, timing: { mode: "distance" } },
  "walk-n": { frames: 6, cell: BODY_CELL, timing: { mode: "distance" } },
  "idle-e": {
    frames: 3,
    cell: BODY_CELL,
    timing: { mode: "idle", holdMs: [2000, 4000], blinkMs: 120 },
  },
  "idle-s": {
    frames: 3,
    cell: BODY_CELL,
    timing: { mode: "idle", holdMs: [2000, 4000], blinkMs: 120 },
  },
  "idle-n": { frames: 1, cell: BODY_CELL, timing: { mode: "static" } },
  "use-e": {
    frames: 2,
    cell: BODY_CELL,
    timing: { mode: "use", reachMs: 150 },
  },
  "use-n": {
    frames: 2,
    cell: BODY_CELL,
    timing: { mode: "use", reachMs: 150 },
  },
  "talk-e": {
    frames: 3,
    cell: HEAD_CELL,
    timing: { mode: "random", frameMs: [100, 140] },
  },
  "talk-s": {
    frames: 3,
    cell: HEAD_CELL,
    timing: { mode: "random", frameMs: [100, 140] },
  },
};

/**
 * CHARACTER_TAGS at a density: the same tags, frame counts, and timing, with
 * the cells scaled. Timing is unchanged; the stride doubles in native px.
 */
export function characterTags(
  density: Density = 1,
): Record<string, CharacterTagSpec> {
  return Object.fromEntries(
    Object.entries(CHARACTER_TAGS).map(([tag, spec]) => [
      tag,
      {
        ...spec,
        cell: { w: spec.cell.w * density, h: spec.cell.h * density },
      },
    ]),
  );
}

/**
 * `daniele.json`, the contract between the character assets and the engine.
 * West is east mirrored at runtime. Talk heads are drawn over the body at
 * `talkHeadOffset` (top-left of the head cell, relative to the body cell).
 */
export interface CharacterSheetJson {
  image: string;
  /** Present only at density 2 and above; absent means density 1. */
  density?: Density;
  size: { w: number; h: number };
  origin: { x: number; y: number };
  /** Native px one foot travels during one walk-e cycle. */
  stride: number;
  talkHeadOffset: { x: number; y: number };
  frames: Rect[];
  tags: Record<string, { from: number; to: number; timing: CharacterTiming }>;
}

/**
 * Pack one strip per tag into a sheet: one row per tag, in CHARACTER_TAGS
 * order. Every tag must be present with its exact frame count and cell size
 * at `density` (default 1).
 */
export function packCharacter(
  strips: Record<string, Image>,
  opts: {
    stride: number;
    talkHeadOffset: { x: number; y: number };
    image?: string;
    density?: Density;
  },
): { sheet: Image; json: CharacterSheetJson } {
  const density = opts.density ?? 1;
  const specs = characterTags(density);
  const tags = Object.entries(specs);
  for (const [tag, spec] of tags) {
    const strip = strips[tag];
    if (!strip) throw new Error(`Missing tag ${tag}`);
    const expectedW = spec.frames * spec.cell.w;
    if (strip.width !== expectedW || strip.height !== spec.cell.h) {
      throw new Error(
        `${tag} is ${strip.width}x${strip.height}; expected ${spec.frames} frames of ${spec.cell.w}x${spec.cell.h} (${expectedW}x${spec.cell.h})`,
      );
    }
  }
  const extra = Object.keys(strips).filter((t) => !(t in specs));
  if (extra.length) throw new Error(`Unknown tags: ${extra.join(", ")}`);

  const width = Math.max(...tags.map(([, s]) => s.frames * s.cell.w));
  const height = tags.reduce((h, [, s]) => h + s.cell.h, 0);
  const sheet = createImage(width, height);
  const frames: Rect[] = [];
  const json: CharacterSheetJson = {
    image: opts.image ?? "daniele.png",
    ...(density === 1 ? {} : { density }),
    size: { w: width, h: height },
    origin: characterMetrics(density).origin,
    stride: opts.stride,
    talkHeadOffset: opts.talkHeadOffset,
    frames,
    tags: {},
  };
  let y = 0;
  for (const [tag, spec] of tags) {
    blit(sheet, strips[tag], 0, y);
    const from = frames.length;
    for (let i = 0; i < spec.frames; i++) {
      frames.push({ x: i * spec.cell.w, y, w: spec.cell.w, h: spec.cell.h });
    }
    json.tags[tag] = { from, to: frames.length - 1, timing: spec.timing };
    y += spec.cell.h;
  }
  return { sheet, json };
}
