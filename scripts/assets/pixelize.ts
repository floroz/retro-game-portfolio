/**
 * Raw candidate to native pixel art (docs/art-spec.md, Tooling).
 *
 *   npm run assets:pixelize -- <input.png> --out <native.png>
 *     [--scene <id>|core]      allowed colours: the core plus that scene's ramp (default core)
 *     [--size 320x160]         native size (default 320x160; ignored with --sprites)
 *     [--crop auto|x,y,w,h]    crop before downscaling (default: whole image)
 *     [--key ff00ff]           make the key colour transparent first
 *     [--key-tolerance 90]     RGB distance from the key that counts as background
 *     [--alpha-threshold 128]  alpha at or above this is opaque
 *     [--sprites 32x64]        slice figures into cells, feet on --feet-row, as a strip
 *     [--feet-row 61] [--figure-height 57]
 */
import { parseArgs } from "node:util";
import {
  allowedColours,
  cliPath,
  fail,
  figuresToCells,
  findFigures,
  loadPalette,
  parseKeyOption,
  parseRect,
  parseSceneOption,
  parseSize,
  pixelize,
  chromaKey,
  crop,
  readImage,
  writePng,
} from "./lib";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string" },
      scene: { type: "string" },
      size: { type: "string", default: "320x160" },
      crop: { type: "string" },
      key: { type: "string" },
      "key-tolerance": { type: "string" },
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
  const key = parseKeyOption(values.key);
  const keyTolerance = values["key-tolerance"]
    ? Number(values["key-tolerance"])
    : undefined;
  const alphaThreshold = Number(values["alpha-threshold"]);
  const raw = await readImage(cliPath(input));

  if (values.sprites) {
    const cell = parseSize(values.sprites);
    let sheet = key ? chromaKey(raw, key, keyTolerance) : raw;
    if (values.crop && values.crop !== "auto") {
      sheet = crop(sheet, parseRect(values.crop));
    }
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
  const out = pixelize(raw, {
    width: size.w,
    height: size.h,
    colours,
    crop:
      values.crop === "auto"
        ? "auto"
        : values.crop
          ? parseRect(values.crop)
          : undefined,
    key,
    keyTolerance,
    alphaThreshold,
  });
  await writePng(cliPath(values.out), out);
  console.log(
    `${values.out}: ${size.w}x${size.h}, ${colours.length} allowed colours`,
  );
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
