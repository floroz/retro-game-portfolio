/**
 * Native image to an 8x reference PNG for Codex (docs/art-spec.md, Tooling).
 *
 *   npm run assets:refs -- <native.png> [--name <id>] [--scale 8]
 *
 * Writes assets-src/refs/<id>@8x.png, where <id> defaults to the file name.
 */
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import {
  REFS_DIR,
  cliPath,
  fail,
  hasTransparency,
  readImage,
  upscale,
  writePng,
} from "./lib";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      name: { type: "string" },
      scale: { type: "string", default: "8" },
    },
  });
  const [input] = positionals;
  if (!input) fail("usage: assets:refs -- <native.png> [--name <id>]");
  const img = await readImage(cliPath(input));
  const scale = Number(values.scale);
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
