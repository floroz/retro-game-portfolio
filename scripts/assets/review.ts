/**
 * Pixelize every candidate for one asset and build a numbered review sheet
 * (docs/art-spec.md, How an asset gets made, step 4).
 *
 *   npm run assets:review -- <asset-id>
 *     [--exchange <dir>]       defaults to ../rgp-codex/assets-src/exchange if it
 *                              exists, else assets-src/exchange in this worktree
 *     [--scene <id>|core]      defaults to the scene named by the asset id
 *     [--size 320x160] [--crop auto|x,y,w,h] [--key ff00ff] [--key-tolerance 90]
 *     [--sprites 32x64]        for character sheets (implies --key ff00ff)
 *     [--scale 4]              review sheet scale
 *
 * Writes assets-src/review/<asset-id>/NN.png (native) and sheet@4x.png.
 * Judge at native size: a beautiful raw image can pixelize into mush.
 */
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  REPO_ROOT,
  REVIEW_DIR,
  allowedColours,
  chromaKey,
  cliPath,
  contactSheet,
  fail,
  figuresToCells,
  findFigures,
  loadPalette,
  parseKeyOption,
  parseRect,
  parseSceneOption,
  parseSize,
  pixelize,
  readImage,
  sceneForAssetId,
  upscale,
  writePng,
  CHROMA_KEY,
} from "./lib";

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
      size: { type: "string", default: "320x160" },
      crop: { type: "string", default: "auto" },
      key: { type: "string" },
      "key-tolerance": { type: "string" },
      sprites: { type: "string" },
      scale: { type: "string", default: "4" },
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

  const scene = values.scene
    ? parseSceneOption(values.scene)
    : sceneForAssetId(assetId);
  const colours = allowedColours(loadPalette(), scene);
  const key =
    parseKeyOption(values.key) ?? (values.sprites ? CHROMA_KEY : undefined);
  const keyTolerance = values["key-tolerance"]
    ? Number(values["key-tolerance"])
    : undefined;
  const outDir = join(REVIEW_DIR, assetId);

  const natives = [];
  for (const file of files) {
    const raw = await readImage(join(rawDir, file));
    let native;
    if (values.sprites) {
      const cell = parseSize(values.sprites);
      const sheet = key ? chromaKey(raw, key, keyTolerance) : raw;
      native = figuresToCells(sheet, findFigures(sheet), {
        cellW: cell.w,
        cellH: cell.h,
        feetRow: 61,
        figureHeight: 57,
        colours,
      });
    } else {
      const size = parseSize(values.size);
      native = pixelize(raw, {
        width: size.w,
        height: size.h,
        colours,
        crop: values.crop === "auto" ? "auto" : parseRect(values.crop),
        key,
        keyTolerance,
      });
    }
    await writePng(join(outDir, file), native);
    natives.push(native);
    console.log(
      `${file}: ${raw.width}x${raw.height} -> ${native.width}x${native.height}`,
    );
  }

  const scale = Number(values.scale);
  const sheet = upscale(
    contactSheet(natives, { cols: Math.min(2, natives.length) }),
    scale,
  );
  const sheetPath = join(outDir, `sheet@${scale}x.png`);
  await writePng(sheetPath, sheet);
  console.log(`Review sheet: ${sheetPath} (scene: ${scene ?? "core"})`);
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
