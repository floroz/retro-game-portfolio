/**
 * Cut an object sprite out of a composite along a polygon.
 *
 *   npm run assets:cutout -- <composite.png> --poly "x,y x,y x,y ..." --out <obj.png>
 *     [--hole <composite-with-hole.png>]   the composite with the object removed,
 *                                          as a starting point for the clean plate
 *     [--density 1|2]                      the composite's density (default 1)
 *
 * Polygon coordinates are native px with a top-left origin, so a density-2
 * polygon can follow the art's 2x edges. Prints the sprite's position and its
 * alpha bounding box, so scene data can copy them. At density 2 the sprite's
 * rectangle is grown to even native px, and "logical" gives the position and
 * bounds in the scene data's 320x160 logical px.
 */
import { parseArgs } from "node:util";
import {
  cliPath,
  cutPolygon,
  fail,
  parseDensity,
  parsePolygon,
  readImage,
  sceneSize,
  writePng,
  type Rect,
} from "./lib";

/** A native rect in logical px. Bounds may be fractional at density 2. */
function toLogical(r: Rect, density: number): Rect {
  return {
    x: r.x / density,
    y: r.y / density,
    w: r.w / density,
    h: r.h / density,
  };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      poly: { type: "string" },
      out: { type: "string" },
      hole: { type: "string" },
      density: { type: "string" },
    },
  });
  const [input] = positionals;
  if (!input || !values.poly || !values.out) {
    fail(
      'usage: assets:cutout -- <composite.png> --poly "x,y x,y x,y" --out <obj.png>',
    );
  }
  const density = parseDensity(values.density);
  const composite = await readImage(cliPath(input));
  const expected = sceneSize(density);
  if (composite.width !== expected.w || composite.height !== expected.h) {
    console.warn(
      `warning: the composite is ${composite.width}x${composite.height}, not the ${expected.w}x${expected.h} scene at density ${density}`,
    );
  }
  const cut = cutPolygon(composite, parsePolygon(values.poly), {
    align: density,
  });
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
        ...(density === 1
          ? {}
          : {
              density,
              logical: {
                ...toLogical(cut.position, density),
                bounds: cut.bounds && toLogical(cut.bounds, density),
              },
            }),
      },
      null,
      2,
    ),
  );
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
