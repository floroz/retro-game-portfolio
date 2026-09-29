/**
 * Pixelize every candidate for one asset and build a numbered review sheet
 * (docs/art-spec.md, How an asset gets made, step 4).
 *
 *   npm run assets:review -- <asset-id>
 *     [--exchange <dir>]       defaults to ../rgp-codex/assets-src/exchange if it
 *                              exists, else assets-src/exchange in this worktree
 *     [--scene <id>|core]      defaults to the scene named by the asset id
 *     [--density 1|2]          defaults to 2 for an "<id>@2x" folder (the remaster),
 *                              else 1; sets the size, cell, and scale defaults
 *     [--size 320x160]         default: the scene at --density (640x320 at 2)
 *     [--crop auto|x,y,w,h]
 *     [--key auto|ff00ff] [--key-tolerance 0.08] [--fringe-tolerance 0.22] [--min-hole 64]
 *                              OKLab flood-fill keying (see key.ts and pixelize.ts)
 *     [--sprites 32x64]        for character sheets (implies --key auto); cells of
 *                              64x128 at --density 2, feet on row 61 (123 at 2)
 *     [--scale 4]              review sheet scale (default 4, or 2 at --density 2)
 *
 * Writes assets-src/review/<asset-id>/NN.png (native) and sheet@<scale>x.png.
 * Judge at native size: a beautiful raw image can pixelize into mush.
 *
 * HD candidates (Phase H), with no palette remap:
 *
 *   npm run assets:review -- <asset-id> --hd
 *     --hd                     on by default for an "<id>@hd" folder: each candidate
 *                              goes through assets:prepare (hd.ts) instead of pixelize
 *     [--kind scene|sprite]    default scene for a -bg, -fg, or -plate id, else sprite
 *     [--crop auto|x,y,w,h] [--size WxH|Wx|xH] [--pad 2]
 *     [--key none|auto|alpha|ff00ff] [--key-tolerance] [--softness] [--band]
 *     [--choke] [--min-hole] [--despill on|off] [--spill] [--alpha-floor]
 *                              the soft key; default auto for sprites, none for scenes
 *     [--levels b,w[,g]] [--saturation 1.1]
 *     [--overlay scale|layout|<png>]   blend a reference over every tile: the scale
 *                              sheet (assets-src/refs/hd/scale-sheet.png), the scene's
 *                              current layout (assets-src/refs/hd/<scene>-current.png),
 *                              or any image; it is also shown alone as tile REF
 *     [--overlay-opacity 0.35] [--tile 640] (tile width in px) [--cols 2]
 *
 *   Writes assets-src/review/<asset-id>/NN.png (full HD) and sheet-hd.png.
 */
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { codexSizeWarning } from "./codex";
import {
  KEY_FLAG_OPTIONS,
  hdContactSheet,
  keyOptions,
  parseLevels,
  parseTargetSize,
  prepare,
  type PrepareKind,
} from "./hd";
import { floodKey, parseKeyArg } from "./key";
import {
  REFS_DIR,
  REPO_ROOT,
  REVIEW_DIR,
  allowedColours,
  characterMetrics,
  cliPath,
  contactSheet,
  fail,
  figuresToCells,
  findFigures,
  loadPalette,
  parseDensity,
  parseRect,
  parseSceneOption,
  parseSize,
  pixelize,
  previewScale,
  readImage,
  sceneForAssetId,
  sceneSize,
  upscale,
  writePng,
  type Image,
} from "./lib";

function numberOption(value: string | undefined): number | undefined {
  return value === undefined ? undefined : Number(value);
}

function defaultExchange(): string {
  const codex = resolve(REPO_ROOT, "../rgp-codex/assets-src/exchange");
  return existsSync(codex) ? codex : resolve(REPO_ROOT, "assets-src/exchange");
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      exchange: { type: "string" },
      scene: { type: "string" },
      density: { type: "string" },
      size: { type: "string" },
      crop: { type: "string", default: "auto" },
      "fringe-tolerance": { type: "string" },
      sprites: { type: "string" },
      scale: { type: "string" },
      ...KEY_FLAG_OPTIONS,
      hd: { type: "boolean" },
      kind: { type: "string" },
      pad: { type: "string" },
      levels: { type: "string" },
      saturation: { type: "string" },
      overlay: { type: "string" },
      "overlay-opacity": { type: "string" },
      tile: { type: "string" },
      cols: { type: "string" },
    },
  });
  const [assetId] = positionals;
  if (!assetId) fail("usage: assets:review -- <asset-id> [options]");

  const rawDir = join(
    values.exchange ? cliPath(values.exchange) : defaultExchange(),
    "raw",
    assetId,
  );
  if (!existsSync(rawDir)) fail(`No candidates at ${rawDir}`);
  if (!existsSync(join(rawDir, "DONE"))) {
    console.warn(
      `warning: ${rawDir} has no DONE file yet; the batch may be incomplete`,
    );
  }
  const files = readdirSync(rawDir)
    .filter((f) => /^\d+\.png$/i.test(f))
    .sort();
  if (files.length === 0) fail(`No NN.png candidates in ${rawDir}`);

  if (values.hd ?? assetId.endsWith("@hd")) {
    await reviewHd(assetId, rawDir, files, values);
    return;
  }

  const density = parseDensity(
    values.density ?? (assetId.endsWith("@2x") ? "2" : undefined),
  );
  const metrics = characterMetrics(density);
  const scene = values.scene
    ? parseSceneOption(values.scene)
    : sceneForAssetId(assetId);
  const colours = allowedColours(loadPalette(), scene);
  const key = parseKeyArg(values.key) ?? (values.sprites ? "auto" : undefined);
  const outDir = join(REVIEW_DIR, assetId);

  const natives = [];
  for (const file of files) {
    const raw = await readImage(join(rawDir, file));
    const sizeWarning = codexSizeWarning(
      values.sprites ? "sheet" : "composite",
      raw.width,
      raw.height,
    );
    if (sizeWarning) console.warn(`warning: ${file}: ${sizeWarning}`);
    const src = key
      ? floodKey(raw, {
          key,
          tolerance: numberOption(values["key-tolerance"]),
          fringeTolerance: numberOption(values["fringe-tolerance"]),
          minHole: numberOption(values["min-hole"]),
        }).image
      : raw;
    let native;
    if (values.sprites) {
      const cell = parseSize(values.sprites);
      const sheet = src;
      native = figuresToCells(sheet, findFigures(sheet), {
        cellW: cell.w,
        cellH: cell.h,
        feetRow: metrics.feetRow,
        figureHeight: metrics.figureHeight,
        colours,
      });
    } else {
      const size = values.size ? parseSize(values.size) : sceneSize(density);
      native = pixelize(src, {
        width: size.w,
        height: size.h,
        colours,
        crop: values.crop === "auto" ? "auto" : parseRect(values.crop),
      });
    }
    await writePng(join(outDir, file), native);
    natives.push(native);
    console.log(
      `${file}: ${raw.width}x${raw.height} -> ${native.width}x${native.height}`,
    );
  }

  const scale = values.scale ? Number(values.scale) : previewScale(4, density);
  const sheet = upscale(
    contactSheet(natives, { cols: Math.min(2, natives.length) }),
    scale,
  );
  const sheetPath = join(outDir, `sheet@${scale}x.png`);
  await writePng(sheetPath, sheet);
  console.log(
    `Review sheet: ${sheetPath} (scene: ${scene ?? "core"}, density ${density})`,
  );
}

/** Resolve --overlay: "scale", "layout", or a path. */
function overlayPath(value: string, assetId: string): string {
  if (value === "scale") return join(REFS_DIR, "hd/scale-sheet.png");
  if (value === "layout") {
    const scene = sceneForAssetId(assetId);
    if (!scene) fail(`--overlay layout: "${assetId}" names no scene`);
    return join(REFS_DIR, `hd/${scene}-current.png`);
  }
  return cliPath(value);
}

async function reviewHd(
  assetId: string,
  rawDir: string,
  files: string[],
  values: Record<string, string | boolean | undefined>,
) {
  const str = (k: string) =>
    typeof values[k] === "string" ? (values[k] as string) : undefined;
  const num = (k: string) =>
    str(k) === undefined ? undefined : Number(str(k));
  const kindFlag = str("kind");
  if (kindFlag !== undefined && kindFlag !== "scene" && kindFlag !== "sprite")
    fail(`--kind is scene or sprite, not "${kindFlag}"`);
  const kind: PrepareKind =
    kindFlag ?? (/-(bg|fg|plate)(@|$)/.test(assetId) ? "scene" : "sprite");
  const crop = str("crop") ?? "auto";
  const key = keyOptions(
    Object.fromEntries(Object.keys(KEY_FLAG_OPTIONS).map((k) => [k, str(k)])),
    kind === "sprite" ? "auto" : "none",
  );
  const outDir = join(REVIEW_DIR, assetId);

  const prepared: Image[] = [];
  for (const file of files) {
    const raw = await readImage(join(rawDir, file));
    const result = await prepare(raw, {
      kind,
      crop: crop === "auto" ? "auto" : parseRect(crop),
      size: str("size") ? parseTargetSize(str("size") as string) : undefined,
      pad: num("pad"),
      key,
      levels: str("levels") ? parseLevels(str("levels") as string) : undefined,
      saturation: num("saturation"),
    });
    for (const w of result.warnings) console.warn(`warning: ${file}: ${w}`);
    await writePng(join(outDir, file), result.image);
    prepared.push(result.image);
    console.log(
      `${file}: ${raw.width}x${raw.height} -> ${result.image.width}x${result.image.height}`,
    );
  }

  const overlayFlag = str("overlay");
  const overlay = overlayFlag
    ? await readImage(overlayPath(overlayFlag, assetId))
    : undefined;
  const sheetPath = join(outDir, "sheet-hd.png");
  await writePng(
    sheetPath,
    await hdContactSheet(prepared, {
      tileWidth: num("tile"),
      cols: num("cols"),
      labels: files.map((f) => f.replace(/\.png$/i, "")),
      overlay,
      overlayOpacity: num("overlay-opacity"),
      reference: overlay,
    }),
  );
  console.log(`HD review sheet: ${sheetPath} (${kind}, no palette remap)`);
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
