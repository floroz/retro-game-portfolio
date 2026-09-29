/**
 * Quantize a painted scene's layers to one shared palette (docs/art-spec.md,
 * Phase H; see painted.ts). Every file in a scene folder counts toward the
 * scene's 256 colours, so bg, fg, objects, and props are best quantized
 * together:
 *
 *   npm run assets:quantize -- <a.png> <b.png> ... (--out-dir <dir> | --in-place)
 *     [--colours 256]            the budget for all the files together
 *     [--palette-from x.png[,y.png]]
 *                                keep every colour of these files as it is (a scene
 *                                that already shipped) and add new ones up to --colours
 *
 * Prepare each layer first with `assets:prepare --painted --no-quantize`
 * (full colour, hard alpha, 640x320 grid). Each input is written under its
 * own file name to --out-dir, or over itself with --in-place. Alpha is
 * thresholded at 128 on the way in, so the output always has hard alpha.
 */
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { cliPath, fail, readImage, writePng } from "./lib";
import {
  MAX_PAINTED_COLOURS,
  fixedColoursFrom,
  hardAlpha,
  quantizeJointly,
  visibleColours,
} from "./painted";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "out-dir": { type: "string" },
      "in-place": { type: "boolean" },
      colours: { type: "string" },
      "palette-from": { type: "string" },
    },
  });
  if (positionals.length === 0)
    fail(
      "usage: assets:quantize -- <a.png> ... (--out-dir <dir> | --in-place)",
    );
  if (!values["out-dir"] === !values["in-place"])
    fail("give exactly one of --out-dir <dir> or --in-place");
  const budget =
    values.colours === undefined ? MAX_PAINTED_COLOURS : Number(values.colours);

  const paths = positionals.map(cliPath);
  const names = paths.map((p) => basename(p));
  if (values["out-dir"] && new Set(names).size !== names.length)
    fail("two inputs share a file name; --out-dir would overwrite one");
  const inputs = await Promise.all(
    paths.map(
      async (p) => hardAlpha(await readImage(p), { minNeighbours: 0 }).image,
    ),
  );
  const fixed = values["palette-from"]
    ? fixedColoursFrom(
        await Promise.all(
          values["palette-from"]
            .split(",")
            .map((p) => readImage(cliPath(p.trim()))),
        ),
        budget,
      )
    : undefined;
  const before = visibleColours(inputs).size;
  const { images, palette } = quantizeJointly(inputs, {
    colours: budget,
    fixed,
  });

  for (const [i, img] of images.entries()) {
    const out = values["in-place"]
      ? paths[i]
      : join(cliPath(values["out-dir"] as string), names[i]);
    await writePng(out, img);
    console.log(`${out}: ${visibleColours([img]).size} colours`);
  }
  console.log(
    `${images.length} files: ${before} colours -> one palette of ${palette.length} (budget ${budget}${fixed ? `, ${fixed.length} fixed` : ""}), no dither`,
  );
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
