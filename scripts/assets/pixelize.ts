/**
 * Raw candidate to native pixel art (docs/art-spec.md, Tooling).
 *
 *   npm run assets:pixelize -- <input.png> --out <native.png>
 *     [--scene <id>|core]        allowed colours: the core plus that scene's ramp (default core)
 *     [--size 320x160]           native size (default 320x160; ignored with --sprites)
 *     [--crop auto|x,y,w,h]      crop before downscaling (default auto)
 *     [--key auto|ff00ff]        key out the background first (default: auto with --sprites, none otherwise)
 *     [--key-tolerance 0.08]     OKLab distance from the key that counts as background
 *     [--fringe-tolerance 0.22]  OKLab distance for the blended fringe next to the background (0 disables)
 *     [--min-hole 64]            enclosed background pockets of at least this many raw px are keyed too
 *     [--alpha-threshold 128]    alpha at or above this is opaque
 *     [--sprites 32x64]          slice figures into cells, feet on --feet-row, as a strip
 *     [--feet-row 61] [--figure-height 57]
 *
 * Real Codex sizes (G1): composites come out at 1774x887, already 2:1, so the
 * default `--crop auto` keeps the whole frame. Sheets come out at 1536x1024 on
 * a near-magenta background (mostly #FA03FA, never exact #FF00FF), so the key
 * is sampled from the border and flood-filled in OKLab (see key.ts).
 */
import { parseArgs } from "node:util";
import { aspectWarning, codexSizeWarning } from "./codex";
import { floodKey, parseKeyArg } from "./key";
import {
  alphaBounds,
  allowedColours,
  centredAspectCrop,
  cliPath,
  crop,
  fail,
  figuresToCells,
  findFigures,
  hasTransparency,
  loadPalette,
  parseRect,
  parseSceneOption,
  parseSize,
  pixelize,
  readImage,
  toHex,
  writePng,
  type Rect,
} from "./lib";

function numberOption(value: string | undefined): number | undefined {
  return value === undefined ? undefined : Number(value);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string" },
      scene: { type: "string" },
      size: { type: "string", default: "320x160" },
      crop: { type: "string", default: "auto" },
      key: { type: "string" },
      "key-tolerance": { type: "string" },
      "fringe-tolerance": { type: "string" },
      "min-hole": { type: "string" },
      "alpha-threshold": { type: "string", default: "128" },
      sprites: { type: "string" },
      "feet-row": { type: "string", default: "61" },
      "figure-height": { type: "string", default: "57" },
    },
  });
  const [input] = positionals;
  if (!input || !values.out)
    fail("usage: assets:pixelize -- <input> --out <output.png> [options]");

  const palette = loadPalette();
  const colours = allowedColours(palette, parseSceneOption(values.scene));
  const key = parseKeyArg(values.key) ?? (values.sprites ? "auto" : undefined);
  const alphaThreshold = Number(values["alpha-threshold"]);
  const raw = await readImage(cliPath(input));

  const sizeWarning = codexSizeWarning(
    values.sprites ? "sheet" : "composite",
    raw.width,
    raw.height,
  );
  if (sizeWarning) console.warn(`warning: ${sizeWarning}`);

  let src = raw;
  if (key) {
    const keyed = floodKey(raw, {
      key,
      tolerance: numberOption(values["key-tolerance"]),
      fringeTolerance: numberOption(values["fringe-tolerance"]),
      minHole: numberOption(values["min-hole"]),
    });
    src = keyed.image;
    console.log(
      `key ${toHex(keyed.key)}: ${keyed.flooded} flooded, ${keyed.holes} in pockets, ${keyed.fringe} fringe px removed`,
    );
  }

  if (values.sprites) {
    const cell = parseSize(values.sprites);
    const sheet =
      values.crop && values.crop !== "auto"
        ? crop(src, parseRect(values.crop))
        : src;
    const figures = findFigures(sheet, { alphaThreshold });
    const strip = figuresToCells(sheet, figures, {
      cellW: cell.w,
      cellH: cell.h,
      feetRow: Number(values["feet-row"]),
      figureHeight: Number(values["figure-height"]),
      colours,
      alphaThreshold,
    });
    await writePng(cliPath(values.out), strip);
    console.log(
      `${values.out}: ${figures.length} frames of ${cell.w}x${cell.h}, from figures at ${figures
        .map((f) => `${f.x},${f.y},${f.w},${f.h}`)
        .join("  ")}`,
    );
    return;
  }

  const size = parseSize(values.size);
  const explicit = values.crop !== "auto" ? parseRect(values.crop) : undefined;
  // The region lib.pixelize will use, so a stretched crop is reported.
  const region: Rect =
    explicit ??
    (hasTransparency(src) ? alphaBounds(src, alphaThreshold) : null) ??
    centredAspectCrop(src.width, src.height, size.w, size.h);
  const stretch = aspectWarning(region, size.w, size.h);
  if (stretch) console.warn(`warning: ${stretch}`);

  const out = pixelize(src, {
    width: size.w,
    height: size.h,
    colours,
    crop: explicit ?? "auto",
    alphaThreshold,
  });
  await writePng(cliPath(values.out), out);
  console.log(
    `${values.out}: ${size.w}x${size.h} from ${region.w}x${region.h} at ${region.x},${region.y}, ${colours.length} allowed colours`,
  );
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
