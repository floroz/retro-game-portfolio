/**
 * The cut-out rig packer behind `npm run assets:rig` (docs/art-spec.md,
 * Phase H, "Character"; task HB7 uses it). Pure functions, so they can be
 * unit tested; rig.ts is the CLI.
 *
 * Input: a folder of part PNGs and a source JSON (`RigSource`) that places
 * every part in its facing's drawing: its joint (pivot), its parent, and its
 * z-order, plus alternative images (head blink and mouth shapes). Every
 * source coordinate is in the facing drawing's px, so pivots can be read
 * straight off the painting.
 *
 * Output: one atlas image and a `RigJson` (src/engine/rigTypes.ts, the
 * contract with the engine's rig renderer). Each part's image is trimmed to
 * its alpha bounds, and its pivot and attach point are made relative, so
 * drawing every part on its joint reproduces the drawing exactly.
 *
 * At density 2 (painted art at MI3 pixel density, on the same 640x320 grid
 * as the scenes) every part gets hard alpha before it's trimmed, and the
 * finished atlas is quantized to at most 256 colours with no dither if it
 * has more (painted.ts), so it passes lint:assets as painted art.
 */
import {
  RIG_FACINGS,
  RIG_PART_IDS,
  type RigFacing,
  type RigFacingData,
  type RigFrame,
  type RigDensity,
  type RigJson,
  type RigPart,
  type RigPartId,
  type RigPoint,
} from "../../src/engine/rigTypes";
import { alphaBounds, blit, createImage, crop, type Image } from "./lib";
import {
  MAX_PAINTED_COLOURS,
  hardAlpha,
  quantizeJointly,
  visibleColours,
} from "./painted";

// --- Source format ---------------------------------------------------------------------

/** An image file in the parts folder, placed in the facing's drawing. */
export interface RigSourceImage {
  /** Path relative to the parts folder. */
  file: string;
  /**
   * Where the PNG's top-left sits in the drawing. Default (0, 0): a PNG the
   * size of the whole drawing, transparent around the part.
   */
  offset?: RigPoint;
}

export interface RigSourceVariant extends RigSourceImage {
  /** The joint in drawing px; defaults to the part's own pivot. */
  pivot?: RigPoint;
}

export interface RigSourcePart extends RigSourceImage {
  /** The joint this part rotates around, in drawing px. */
  pivot: RigPoint;
  /** Absent only for the root, the torso. */
  parent?: RigPartId;
  z: number;
  /** Alternative images: a file name, or a file with its own placement. */
  variants?: Record<string, string | RigSourceVariant>;
}

export interface RigSourceFacing {
  /** The ground point between the feet, in drawing px. */
  feet: RigPoint;
  parts: Record<RigPartId, RigSourcePart>;
}

export interface RigSource {
  facings: Record<RigFacing, RigSourceFacing>;
}

// --- Validation ---------------------------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isPoint = (v: unknown): v is RigPoint =>
  isRecord(v) && isNum(v.x) && isNum(v.y);
const isPartId = (v: unknown): v is RigPartId =>
  (RIG_PART_IDS as readonly unknown[]).includes(v);
const VARIANT_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Errors in a part hierarchy: exactly one root (the torso), known parents,
 * and no cycles. `parents` maps each part to its parent (null for a root).
 */
function hierarchyErrors(
  where: string,
  parents: ReadonlyMap<RigPartId, RigPartId | null>,
): string[] {
  const errors: string[] = [];
  const roots = [...parents].filter(([, p]) => p === null).map(([id]) => id);
  if (roots.length !== 1 || roots[0] !== "torso") {
    errors.push(
      `${where}: the torso must be the only part without a parent (roots: ${roots.join(", ") || "none"})`,
    );
  }
  for (const [id, parent] of parents) {
    if (parent !== null && !parents.has(parent)) {
      errors.push(`${where}: ${id}'s parent "${parent}" isn't a part`);
      continue;
    }
    const seen = new Set<RigPartId>([id]);
    for (let p = parent; p !== null; p = parents.get(p) ?? null) {
      if (seen.has(p)) {
        errors.push(`${where}: ${id} is its own ancestor`);
        break;
      }
      seen.add(p);
    }
  }
  return errors;
}

/** Check a parsed source JSON; returns error strings (empty when valid). */
export function checkRigSource(value: unknown): string[] {
  if (!isRecord(value) || !isRecord(value.facings))
    return ['rig source: needs a "facings" object'];
  const errors: string[] = [];
  const facings = value.facings;
  for (const name of Object.keys(facings)) {
    if (!(RIG_FACINGS as readonly string[]).includes(name))
      errors.push(`rig source: unknown facing "${name}"`);
  }
  for (const facing of RIG_FACINGS) {
    const where = `rig source: ${facing}`;
    const f = facings[facing];
    if (!isRecord(f)) {
      errors.push(`${where}: missing`);
      continue;
    }
    if (!isPoint(f.feet)) errors.push(`${where}: "feet" must be {x, y}`);
    if (!isRecord(f.parts)) {
      errors.push(`${where}: needs "parts"`);
      continue;
    }
    const parents = new Map<RigPartId, RigPartId | null>();
    for (const [id, part] of Object.entries(f.parts)) {
      if (!isPartId(id)) {
        errors.push(
          `${where}: unknown part "${id}" (parts are ${RIG_PART_IDS.join(", ")})`,
        );
        continue;
      }
      if (!isRecord(part)) {
        errors.push(`${where}.${id}: not an object`);
        continue;
      }
      if (typeof part.file !== "string" || part.file === "")
        errors.push(`${where}.${id}: "file" is required`);
      if (part.offset !== undefined && !isPoint(part.offset))
        errors.push(`${where}.${id}: "offset" must be {x, y}`);
      if (!isPoint(part.pivot))
        errors.push(`${where}.${id}: "pivot" must be {x, y}`);
      if (!isNum(part.z)) errors.push(`${where}.${id}: "z" must be a number`);
      if (part.parent !== undefined && !isPartId(part.parent))
        errors.push(`${where}.${id}: unknown parent "${String(part.parent)}"`);
      parents.set(id, isPartId(part.parent) ? part.parent : null);
      if (part.variants !== undefined) {
        if (!isRecord(part.variants)) {
          errors.push(`${where}.${id}: "variants" must be an object`);
          continue;
        }
        for (const [name, v] of Object.entries(part.variants)) {
          if (!VARIANT_NAME.test(name))
            errors.push(`${where}.${id}: variant "${name}" isn't kebab-case`);
          const ok =
            (typeof v === "string" && v !== "") ||
            (isRecord(v) &&
              typeof v.file === "string" &&
              v.file !== "" &&
              (v.offset === undefined || isPoint(v.offset)) &&
              (v.pivot === undefined || isPoint(v.pivot)));
          if (!ok)
            errors.push(
              `${where}.${id}: variant "${name}" must be a file name or {file, offset?, pivot?}`,
            );
        }
      }
    }
    for (const id of RIG_PART_IDS) {
      if (!(id in f.parts)) errors.push(`${where}: missing part "${id}"`);
    }
    errors.push(...hierarchyErrors(where, parents));
  }
  return errors;
}

/** Every image file a (valid) source refers to, once each. */
export function rigSourceFiles(source: RigSource): string[] {
  const files = new Set<string>();
  for (const facing of RIG_FACINGS) {
    for (const part of Object.values(source.facings[facing].parts)) {
      files.add(part.file);
      for (const v of Object.values(part.variants ?? {}))
        files.add(typeof v === "string" ? v : v.file);
    }
  }
  return [...files];
}

// --- Packing -------------------------------------------------------------------------------

/** Transparent px between atlas frames, so smooth scaling never bleeds. */
export const DEFAULT_RIG_PADDING = 2;

interface Piece {
  image: Image;
  /** Top-left of the trimmed image in the drawing. */
  at: RigPoint;
  /** Joint in drawing px. */
  pivot: RigPoint;
  frame?: RigFrame;
}

/** Trim an image to its alpha bounds; throws if it's empty. */
function trimmed(
  img: Image,
  offset: RigPoint,
  label: string,
): { image: Image; at: RigPoint } {
  const b = alphaBounds(img, 1);
  if (!b) throw new Error(`${label}: the image is fully transparent`);
  return { image: crop(img, b), at: { x: offset.x + b.x, y: offset.y + b.y } };
}

/**
 * Shelf-pack images, tallest first, into an atlas about as wide as it is
 * tall. Returns each image's top-left, in input order, and the atlas size.
 */
export function shelfPack(
  sizes: readonly { w: number; h: number }[],
  padding = DEFAULT_RIG_PADDING,
): { positions: RigPoint[]; w: number; h: number } {
  const area = sizes.reduce((s, r) => s + (r.w + padding) * (r.h + padding), 0);
  const widest = Math.max(0, ...sizes.map((r) => r.w));
  const width = Math.max(
    widest + 2 * padding,
    Math.ceil(Math.sqrt(area * 1.15) / 16) * 16,
  );
  const order = sizes
    .map((r, i) => ({ ...r, i }))
    .sort((a, b) => b.h - a.h || b.w - a.w || a.i - b.i);
  const positions: RigPoint[] = new Array<RigPoint>(sizes.length);
  let x = padding;
  let y = padding;
  let shelf = 0;
  for (const r of order) {
    if (x + r.w + padding > width) {
      x = padding;
      y += shelf + padding;
      shelf = 0;
    }
    positions[r.i] = { x, y };
    x += r.w + padding;
    shelf = Math.max(shelf, r.h);
  }
  return { positions, w: width, h: y + shelf + padding };
}

const sub = (a: RigPoint, b: RigPoint): RigPoint => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

export interface PackRigOptions {
  /** The atlas file name written into the JSON. Default "daniele-rig.png". */
  image?: string;
  padding?: number;
  /** 4 (smooth HD, the default) or 2 (painted, hard alpha, ≤256 colours). */
  density?: RigDensity;
  /** Density 2: soft alpha at or above this becomes opaque. Default 128. */
  alphaThreshold?: number;
}

/**
 * Pack a rig. `images` maps each source `file` to its decoded image; the
 * source must pass `checkRigSource`. Source coordinates are in the parts'
 * own px, which are atlas px at `density`.
 */
export function packRig(
  source: RigSource,
  images: ReadonlyMap<string, Image>,
  opts: PackRigOptions = {},
): { atlas: Image; json: RigJson } {
  const problems = checkRigSource(source);
  if (problems.length) throw new Error(problems.join("\n"));
  const density: RigDensity = opts.density ?? 4;
  const hard = new Map<string, Image>();
  const load = (file: string): Image => {
    const img = images.get(file);
    if (!img) throw new Error(`rig source: no image for "${file}"`);
    if (density !== 2) return img;
    let h = hard.get(file);
    if (!h) {
      // No speck removal: a part is drawn pixel by pixel, and an ink overlay
      // (a lone pupil pixel) is single pixels by design.
      h = hardAlpha(img, {
        threshold: opts.alphaThreshold,
        minNeighbours: 0,
      }).image;
      hard.set(file, h);
    }
    return h;
  };

  const pieces: Piece[] = [];
  const place = (
    img: RigSourceImage,
    pivot: RigPoint,
    label: string,
  ): Piece => {
    const t = trimmed(load(img.file), img.offset ?? { x: 0, y: 0 }, label);
    const piece: Piece = { ...t, pivot };
    pieces.push(piece);
    return piece;
  };

  const layout = RIG_FACINGS.map((facing) => {
    const f = source.facings[facing];
    const parts = RIG_PART_IDS.map((id) => {
      const p = f.parts[id];
      const label = `${facing}.${id}`;
      const rest = place(p, p.pivot, label);
      const variants = Object.entries(p.variants ?? {}).map(([name, v]) => {
        const spec: RigSourceVariant = typeof v === "string" ? { file: v } : v;
        return {
          name,
          piece: place(spec, spec.pivot ?? p.pivot, `${label}@${name}`),
        };
      });
      return { id, source: p, rest, variants };
    });
    return { facing, feet: f.feet, parts };
  });

  const padding = opts.padding ?? DEFAULT_RIG_PADDING;
  const packed = shelfPack(
    pieces.map((p) => ({ w: p.image.width, h: p.image.height })),
    padding,
  );
  let atlas = createImage(packed.w, packed.h);
  pieces.forEach((piece, i) => {
    const at = packed.positions[i];
    blit(atlas, piece.image, at.x, at.y);
    piece.frame = {
      x: at.x,
      y: at.y,
      w: piece.image.width,
      h: piece.image.height,
      pivot: sub(piece.pivot, piece.at),
    };
  });
  const frameOf = (p: Piece): RigFrame => p.frame as RigFrame;
  if (density === 2 && visibleColours([atlas]).size > MAX_PAINTED_COLOURS)
    atlas = quantizeJointly([atlas]).images[0];

  const facings = {} as Record<RigFacing, RigFacingData>;
  for (const { facing, feet, parts } of layout) {
    const out: RigPart[] = parts.map(({ id, source: p, rest, variants }) => ({
      id,
      parent: p.parent ?? null,
      z: p.z,
      attach: sub(
        p.pivot,
        p.parent ? source.facings[facing].parts[p.parent].pivot : feet,
      ),
      frame: frameOf(rest),
      variants: Object.fromEntries(
        variants.map(({ name, piece }) => [name, frameOf(piece)]),
      ),
    }));
    // Stable: equal z keeps RIG_PART_IDS order.
    out.sort((a, b) => a.z - b.z);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const { rest } of parts) {
      minX = Math.min(minX, rest.at.x);
      minY = Math.min(minY, rest.at.y);
      maxX = Math.max(maxX, rest.at.x + rest.image.width);
      maxY = Math.max(maxY, rest.at.y + rest.image.height);
    }
    facings[facing] = {
      parts: out,
      bounds: {
        x: minX - feet.x,
        y: minY - feet.y,
        w: maxX - minX,
        h: maxY - minY,
      },
    };
  }

  return {
    atlas,
    json: {
      version: 1,
      image: opts.image ?? "daniele-rig.png",
      density,
      size: { w: atlas.width, h: atlas.height },
      facings,
    },
  };
}

// --- Checking the shipped JSON ----------------------------------------------------------------

const isFrame = (v: unknown): v is RigFrame =>
  isRecord(v) &&
  isNum(v.x) &&
  isNum(v.y) &&
  isNum(v.w) &&
  isNum(v.h) &&
  isPoint(v.pivot);

/**
 * Check daniele-rig.json against its atlas (lint:assets): the version and
 * density (the atlas's provenance density, 4 by default), every facing and
 * part, the hierarchy, and every frame inside the atlas.
 */
export function checkRigJson(
  value: unknown,
  atlas: { width: number; height: number },
  density: RigDensity = 4,
): string[] {
  const where = "src/assets/character/daniele-rig.json";
  if (!isRecord(value)) return [`${where}: not a JSON object`];
  const errors: string[] = [];
  if (value.version !== 1) errors.push(`${where}: version must be 1`);
  if (value.density !== density)
    errors.push(
      `${where}: density must be ${density}, as daniele-rig.png's provenance record says`,
    );
  if (value.image !== "daniele-rig.png")
    errors.push(`${where}: image must be "daniele-rig.png"`);
  const size = value.size;
  if (!isRecord(size) || size.w !== atlas.width || size.h !== atlas.height)
    errors.push(
      `${where}: size doesn't match daniele-rig.png (${atlas.width}x${atlas.height})`,
    );
  const inside = (fr: RigFrame) =>
    fr.x >= 0 &&
    fr.y >= 0 &&
    fr.w > 0 &&
    fr.h > 0 &&
    fr.x + fr.w <= atlas.width &&
    fr.y + fr.h <= atlas.height;
  const facings = isRecord(value.facings) ? value.facings : {};
  for (const facing of RIG_FACINGS) {
    const f = facings[facing];
    if (!isRecord(f) || !Array.isArray(f.parts)) {
      errors.push(`${where}: facing "${facing}" is missing`);
      continue;
    }
    const parents = new Map<RigPartId, RigPartId | null>();
    let lastZ = -Infinity;
    for (const part of f.parts as unknown[]) {
      if (!isRecord(part) || !isPartId(part.id)) {
        errors.push(`${where}: ${facing} has an unknown part`);
        continue;
      }
      const label = `${where}: ${facing}.${part.id}`;
      if (parents.has(part.id)) errors.push(`${label} appears twice`);
      parents.set(
        part.id,
        part.parent === null ? null : (part.parent as RigPartId),
      );
      if (!isNum(part.z) || part.z < lastZ)
        errors.push(`${label}: parts must be sorted by z`);
      else lastZ = part.z;
      if (!isPoint(part.attach)) errors.push(`${label}: attach must be {x, y}`);
      const frames: [string, unknown][] = [
        ["frame", part.frame],
        ...Object.entries(isRecord(part.variants) ? part.variants : {}),
      ];
      if (!isRecord(part.variants))
        errors.push(`${label}: variants must be an object`);
      for (const [name, fr] of frames) {
        if (!isFrame(fr) || !inside(fr))
          errors.push(`${label}: ${name} falls outside the atlas`);
      }
    }
    for (const id of RIG_PART_IDS) {
      if (!parents.has(id)) errors.push(`${where}: ${facing} lacks ${id}`);
    }
    errors.push(...hierarchyErrors(`${where}: ${facing}`, parents));
  }
  return errors;
}
