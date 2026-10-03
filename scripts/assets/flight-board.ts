/** Reproduce the approved board exports: npx tsx scripts/assets/flight-board.ts. */
import { readdir } from "node:fs/promises";
import sharp from "sharp";
import { readImage, writePng } from "./lib";
import { fixedColoursFrom, hardAlpha, remapToPalette } from "./painted";

const source = "assets-src/approved/hall-flight-board.webp";
const original = "src/assets/scenes/hall";
const remaster = "src/assets/remaster/hall/obj-flight-board.png";
await sharp(source)
  .trim({ background: "#00000000", threshold: 100 })
  .resize(304, 96, { fit: "fill" })
  .png()
  .toFile(remaster);
const pixels = await sharp(remaster)
  .resize(152, 48)
  .ensureAlpha()
  .raw()
  .toBuffer();
const small = hardAlpha({
  width: 152,
  height: 48,
  data: new Uint8ClampedArray(pixels),
}).image;
const files = (await readdir(original)).filter(
  (name) => name.endsWith(".png") && name !== "obj-flight-board.png",
);
const palette = fixedColoursFrom(
  await Promise.all(files.map((name) => readImage(`${original}/${name}`))),
);
await writePng(
  `${original}/obj-flight-board.png`,
  remapToPalette(small, palette),
);
