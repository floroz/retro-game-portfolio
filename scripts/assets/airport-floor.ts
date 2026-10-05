/** Prepare the stone-floor plate and apply the current Lost & Found assets. */
import sharp from "sharp";
import { prepareLostAndFound } from "./lost-and-found";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readImage, writePng } from "./lib";
import { fixedColoursFrom, hardAlpha, quantizeJointly } from "./painted";

const dir = "src/assets/scenes/hall";
const original = "assets-src/refs/hd/hall-before-stone.png";
const palette = fixedColoursFrom(
  await Promise.all([
    readImage(original),
    ...readdirSync(dir)
      .filter((name) => name.endsWith(".png") && name !== "bg.png")
      .map((name) => readImage(join(dir, name))),
  ]),
  256,
);

// Keep the original sign frames, gates, windows and other hotspot landmarks
// pixel-identical. Only the floor and the wall behind the shop are repainted.
const header = await sharp(original)
  .extract({ left: 0, top: 0, width: 640, height: 54 })
  .toBuffer();
const architecture = await sharp(original)
  .extract({ left: 160, top: 0, width: 480, height: 174 })
  .toBuffer();
const background = await sharp("assets-src/approved/hall-stone-floor.png")
  .resize(640, 320, { fit: "fill" })
  .composite([
    { input: header, left: 0, top: 0 },
    { input: architecture, left: 160, top: 0 },
  ])
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const image = hardAlpha(
  {
    data: new Uint8ClampedArray(background.data),
    width: background.info.width,
    height: background.info.height,
  },
  { minNeighbours: 0 },
).image;
await writePng(
  join(dir, "bg.png"),
  quantizeJointly([image], { colours: 256, fixed: palette }).images[0],
);

await prepareLostAndFound();
