/** Prepare the generated boarding-desk with the shipped Hall palette. */
import sharp from "sharp";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readImage, writePng } from "./lib";
import { fixedColoursFrom, hardAlpha, quantizeJointly } from "./painted";

const dir = "src/assets/scenes/hall";
const raw = "assets-src/approved/hall-boarding-desk.png";
const output = `${dir}/obj-boarding-desk.png`;
const palette = fixedColoursFrom(
  await Promise.all(
    readdirSync(dir)
      .filter(
        (name) => name.endsWith(".png") && name !== "obj-boarding-desk.png",
      )
      .map((name) => readImage(join(dir, name))),
  ),
  256,
);
const source = hardAlpha(await readImage(raw), { minNeighbours: 0 }).image;
const png = await sharp(source.data, {
  raw: { width: source.width, height: source.height, channels: 4 },
})
  .png()
  .toBuffer();
const { data, info } = await sharp(png)
  .trim({ background: "#00000000", threshold: 1 })
  .resize({ width: 52, height: 76, fit: "contain", background: "#00000000" })
  .extend({ top: 2, bottom: 2, left: 2, right: 2, background: "#00000000" })
  .raw()
  .toBuffer({ resolveWithObject: true });
const image = hardAlpha(
  { data: new Uint8ClampedArray(data), width: info.width, height: info.height },
  { minNeighbours: 0 },
).image;
await writePng(
  output,
  quantizeJointly([image], { colours: 256, fixed: palette }).images[0],
);
writeFileSync(
  "assets-src/provenance/hall-obj-boarding-desk.json",
  JSON.stringify(
    {
      id: "hall-obj-boarding-desk",
      output,
      task: "airport-boarding-desk",
      source: "codex",
      prompt: "assets-src/prompts/hd/hall-boarding-desk.md",
      candidate: "01",
      references: [],
      approvedRaw: raw,
      density: 2,
      style: "painted",
      approvedBy: "codex",
      date: "2026-09-30",
      cleanup:
        "Built-in image generation; scripts/assets/boarding-desk.ts trims, fits to a 56x80 art-pixel cell and maps to the existing Hall palette with hard alpha.",
    },
    null,
    2,
  ) + "\n",
);
