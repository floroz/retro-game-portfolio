/**
 * Cut an object sprite out of a composite along a polygon
 * (docs/art-spec.md, B1–B5 step 3).
 *
 *   npm run assets:cutout -- <composite.png> --poly "x,y x,y x,y ..." --out <obj.png>
 *     [--hole <composite-with-hole.png>]   the composite with the object removed,
 *                                          as a starting point for the clean plate
 *
 * Coordinates are native px with a top-left origin. Prints the sprite's
 * position and its alpha bounding box, so scene data can copy them.
 */
import { parseArgs } from "node:util";
import {
  cliPath,
  cutPolygon,
  fail,
  parsePolygon,
  readImage,
  writePng,
} from "./lib";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      poly: { type: "string" },
      out: { type: "string" },
      hole: { type: "string" },
    },
  });
  const [input] = positionals;
  if (!input || !values.poly || !values.out) {
    fail(
      'usage: assets:cutout -- <composite.png> --poly "x,y x,y x,y" --out <obj.png>',
    );
  }
  const cut = cutPolygon(
    await readImage(cliPath(input)),
    parsePolygon(values.poly),
  );
  await writePng(cliPath(values.out), cut.sprite);
  if (values.hole) await writePng(cliPath(values.hole), cut.hole);
  console.log(
    JSON.stringify(
      {
        sprite: values.out,
        x: cut.position.x,
        y: cut.position.y,
        w: cut.position.w,
        h: cut.position.h,
        bounds: cut.bounds,
      },
      null,
      2,
    ),
  );
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
