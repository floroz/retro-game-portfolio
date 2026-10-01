/**
 * Cut-out rig parts to daniele-rig.png + daniele-rig.json.
 *
 *   npm run assets:rig -- --parts <dir> [--source <dir>/rig.json]
 *     [--out-dir src/assets/character] [--padding 2]
 *     [--density 4|2] [--alpha-threshold 128]
 *
 * --density 2 packs painted parts at MI3 pixel density, on the scenes' 640x320
 * grid: parts are drawn at 2 px per logical px, every part gets hard alpha
 * (--alpha-threshold), and the atlas is kept to at most 256 colours with no
 * dither. Record it as "density": 2, "style": "painted". The default, 4, is
 * the smooth HD path.
 *
 * <dir> holds the part PNGs and rig.json, a `RigSource` (rigpack.ts): for
 * each facing (side, front, back), the feet point and every part's file,
 * pivot, parent, z, and variants, all in that facing's drawing px. For
 * example:
 *
 *   { "facings": { "side": {
 *       "feet": { "x": 400, "y": 1130 },
 *       "parts": {
 *         "torso": { "file": "side/torso.png", "pivot": { "x": 402, "y": 700 }, "z": 5 },
 *         "head": { "file": "side/head.png", "pivot": { "x": 410, "y": 420 },
 *                   "parent": "torso", "z": 6,
 *                   "variants": { "blink": "side/head-blink.png",
 *                                 "talk-1": { "file": "heads/side-a.png", "offset": { "x": 300, "y": 180 } } } },
 *         ... } }, "front": { ... }, "back": { ... } } }
 *
 * A part PNG is either the size of the whole drawing (transparent around the
 * part) or cropped, with "offset" giving its top-left in the drawing. The
 * output format is `RigJson` in src/engine/rigTypes.ts, the contract with
 * the engine.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  REPO_ROOT,
  cliPath,
  fail,
  readImage,
  writePng,
  type Image,
} from "./lib";
import {
  checkRigSource,
  packRig,
  rigSourceFiles,
  type RigSource,
} from "./rigpack";

async function main() {
  const { values } = parseArgs({
    options: {
      parts: { type: "string" },
      source: { type: "string" },
      "out-dir": { type: "string" },
      padding: { type: "string" },
      density: { type: "string" },
      "alpha-threshold": { type: "string" },
    },
  });
  const density = values.density === undefined ? 4 : Number(values.density);
  if (density !== 2 && density !== 4) fail("--density is 2 or 4");
  if (values["alpha-threshold"] !== undefined && density !== 2)
    fail("--alpha-threshold needs --density 2");
  if (!values.parts)
    fail("usage: assets:rig -- --parts <dir> [--source <rig.json>]");
  const dir = cliPath(values.parts);
  const sourcePath = values.source
    ? cliPath(values.source)
    : join(dir, "rig.json");
  const value: unknown = JSON.parse(readFileSync(sourcePath, "utf8"));
  const problems = checkRigSource(value);
  if (problems.length) fail(problems.join("\n"));
  const source = value as RigSource;

  const images = new Map<string, Image>();
  for (const file of rigSourceFiles(source))
    images.set(file, await readImage(join(dir, file)));

  const { atlas, json } = packRig(source, images, {
    padding: values.padding === undefined ? undefined : Number(values.padding),
    density,
    alphaThreshold:
      values["alpha-threshold"] === undefined
        ? undefined
        : Number(values["alpha-threshold"]),
  });
  const outDir = values["out-dir"]
    ? cliPath(values["out-dir"])
    : resolve(REPO_ROOT, "src/assets/character");
  await writePng(join(outDir, json.image), atlas);
  writeFileSync(
    join(outDir, "daniele-rig.json"),
    `${JSON.stringify(json, null, 2)}\n`,
  );
  const frames = Object.values(json.facings).reduce(
    (n, f) =>
      n + f.parts.reduce((m, p) => m + 1 + Object.keys(p.variants).length, 0),
    0,
  );
  console.log(
    `${outDir}: ${frames} frames on a ${atlas.width}x${atlas.height} atlas`,
  );
  for (const [facing, f] of Object.entries(json.facings)) {
    console.log(
      `  ${facing}: ${f.bounds.w}x${f.bounds.h} px, ${(f.bounds.h / json.density).toFixed(1)} logical px tall`,
    );
  }
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
