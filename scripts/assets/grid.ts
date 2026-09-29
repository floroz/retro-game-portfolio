/**
 * PNG <-> palette-index text grid (docs/art-spec.md, Grid format).
 *
 *   npm run assets:grid -- export <image.png> [--region x,y,w,h | --frame N --cell 32x64]
 *                          [--asset <id>] [--out <grid.txt>]
 *   npm run assets:grid -- import <grid.txt> --out <image.png>
 *   npm run assets:grid -- patch <image.png> <grid.txt> [--at x,y]
 *
 * `export` prints the grid (or writes it with --out). `patch` writes the grid
 * back into the image at --at, or at the region recorded in the grid header,
 * replacing whole rows. Grids are rejected if any row is ragged.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { parseArgs } from "node:util";
import {
  cliPath,
  crop,
  fail,
  gridToImage,
  imageToGrid,
  loadPalette,
  parseGrid,
  parsePoint,
  parseRect,
  parseSize,
  patchRegion,
  readImage,
  writePng,
  type Rect,
} from "./lib";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      region: { type: "string" },
      frame: { type: "string" },
      cell: { type: "string", default: "32x64" },
      asset: { type: "string" },
      out: { type: "string" },
      at: { type: "string" },
    },
  });
  const [command, ...args] = positionals;
  const palette = loadPalette();

  if (command === "export") {
    const [input] = args;
    if (!input) fail("usage: assets:grid -- export <image.png> [options]");
    const img = await readImage(cliPath(input));
    let region: Rect | undefined;
    const header: Record<string, string> = {
      asset: values.asset ?? basename(input, ".png"),
    };
    if (values.frame !== undefined) {
      const cell = parseSize(values.cell);
      const n = Number(values.frame);
      region = { x: n * cell.w, y: 0, w: cell.w, h: cell.h };
      header.frame = String(n).padStart(2, "0");
    } else if (values.region) {
      region = parseRect(values.region);
    }
    if (region)
      header.region = `${region.x},${region.y},${region.w},${region.h}`;
    const text = imageToGrid(region ? crop(img, region) : img, palette, header);
    if (values.out) writeFileSync(cliPath(values.out), text);
    else process.stdout.write(text);
    return;
  }

  if (command === "import") {
    const [input] = args;
    if (!input || !values.out)
      fail("usage: assets:grid -- import <grid.txt> --out <image.png>");
    const grid = parseGrid(readFileSync(cliPath(input), "utf8"), palette);
    await writePng(cliPath(values.out), gridToImage(grid, palette));
    console.log(`${values.out}: ${grid.width}x${grid.height}`);
    return;
  }

  if (command === "patch") {
    const [target, input] = args;
    if (!target || !input)
      fail("usage: assets:grid -- patch <image.png> <grid.txt> [--at x,y]");
    const grid = parseGrid(readFileSync(cliPath(input), "utf8"), palette);
    const at = values.at
      ? parsePoint(values.at)
      : grid.header.region
        ? parseRect(grid.header.region)
        : { x: 0, y: 0 };
    const img = await readImage(cliPath(target));
    await writePng(
      cliPath(target),
      patchRegion(img, gridToImage(grid, palette), at.x, at.y),
    );
    console.log(
      `Patched ${grid.width}x${grid.height} into ${target} at ${at.x},${at.y}`,
    );
    return;
  }

  fail("usage: assets:grid -- export|import|patch ...");
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
