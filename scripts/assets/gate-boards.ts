/** Reproduce the gate housings: npx tsx scripts/assets/gate-boards.ts. */
import { readdir } from "node:fs/promises";
import sharp from "sharp";
import { readImage, writePng } from "./lib";
import { fixedColoursFrom, hardAlpha, remapToPalette } from "./painted";

const original = "src/assets/scenes/hall";
const source = "assets-src/approved/hall-gate-board.webp";
const widths = { sorrento: 39, london: 51, zurich: 48 };
const files = (await readdir(original)).filter(
  (name) => name.endsWith(".png") && !name.startsWith("obj-gate-"),
);
const palette = fixedColoursFrom(
  await Promise.all(files.map((name) => readImage(`${original}/${name}`))),
);
for (const [country, width] of Object.entries(widths)) {
  const remaster = `src/assets/remaster/hall/obj-gate-${country}.png`;
  await sharp(source)
    .trim({ background: "#00000000", threshold: 100 })
    .resize(width * 4, 96, { fit: "fill" })
    .png()
    .toFile(remaster);
  const pixels = await sharp(remaster)
    .resize(width * 2, 48)
    .ensureAlpha()
    .raw()
    .toBuffer();
  const small = hardAlpha({
    width: width * 2,
    height: 48,
    data: new Uint8ClampedArray(pixels),
  }).image;
  await writePng(
    `${original}/obj-gate-${country}.png`,
    remapToPalette(small, palette),
  );
}
