/**
 * Character frames to daniele.png + daniele.json (docs/art-spec.md, B7).
 *
 *   npm run assets:pack -- --frames <dir> --stride <px> [--head-offset 8,4]
 *     [--density 1|2] [--out-dir src/assets/character]
 *
 * <dir> holds one strip per tag, named <tag>.png (walk-e.png, talk-s.png, ...),
 * with frames of 32x64 (body) or 16x16 (talk heads). At --density 2 the frames
 * are 64x128 and 32x32, the origin is (32, 123), the head offset defaults to
 * 16,8, and the stride is in density-2 native px (twice the logical stride).
 * See CharacterSheetJson in lib.ts for the JSON format the engine reads.
 */
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  CHARACTER_TAGS,
  REPO_ROOT,
  characterMetrics,
  cliPath,
  fail,
  packCharacter,
  parseDensity,
  parsePoint,
  readImage,
  writePng,
  type Image,
} from "./lib";

async function main() {
  const { values } = parseArgs({
    options: {
      frames: { type: "string" },
      stride: { type: "string" },
      "head-offset": { type: "string" },
      density: { type: "string" },
      "out-dir": { type: "string" },
    },
  });
  if (!values.frames || !values.stride) {
    fail(
      "usage: assets:pack -- --frames <dir> --stride <px> [--head-offset x,y]",
    );
  }
  const density = parseDensity(values.density);
  const dir = cliPath(values.frames);
  const strips: Record<string, Image> = {};
  for (const tag of Object.keys(CHARACTER_TAGS)) {
    strips[tag] = await readImage(join(dir, `${tag}.png`));
  }
  const { sheet, json } = packCharacter(strips, {
    stride: Number(values.stride),
    talkHeadOffset: values["head-offset"]
      ? parsePoint(values["head-offset"])
      : characterMetrics(density).talkHeadOffset,
    density,
  });
  const outDir = values["out-dir"]
    ? cliPath(values["out-dir"])
    : resolve(REPO_ROOT, "src/assets/character");
  await writePng(join(outDir, "daniele.png"), sheet);
  writeFileSync(
    join(outDir, "daniele.json"),
    `${JSON.stringify(json, null, 2)}\n`,
  );
  console.log(
    `${outDir}: ${json.frames.length} frames on a ${sheet.width}x${sheet.height} sheet (density ${density})`,
  );
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
