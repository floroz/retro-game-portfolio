/**
 * Native image to an 8x reference PNG for Codex.
 *
 *   npm run assets:refs -- <native.png> [--name <id>] [--scale 8] [--density 1|2]
 *
 * Writes assets-src/refs/<id>@<scale>x.png, where <id> defaults to the file
 * name (a --name like "remaster/zurich-current" writes into a subfolder). The
 * scale defaults to 8, or 4 for density-2 art, so a reference is the same
 * physical size at either density.
 */
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import {
  REFS_DIR,
  cliPath,
  fail,
  hasTransparency,
  parseDensity,
  previewScale,
  readImage,
  upscale,
  writePng,
} from "./lib";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      name: { type: "string" },
      scale: { type: "string" },
      density: { type: "string" },
    },
  });
  const [input] = positionals;
  if (!input) fail("usage: assets:refs -- <native.png> [--name <id>]");
  const img = await readImage(cliPath(input));
  const scale = values.scale
    ? Number(values.scale)
    : previewScale(8, parseDensity(values.density));
  const out = join(
    REFS_DIR,
    `${values.name ?? basename(input, ".png")}@${scale}x.png`,
  );
  await writePng(out, upscale(img, scale));
  if (hasTransparency(img)) {
    console.warn(
      "warning: the reference has transparent pixels; Codex may read them as white or black",
    );
  }
  console.log(`${out}: ${img.width * scale}x${img.height * scale}`);
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
