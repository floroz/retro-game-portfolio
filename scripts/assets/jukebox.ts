/** Prepare the generated jukebox with the shipped London palette. */
import sharp from "sharp";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readImage, writePng } from "./lib";
import { fixedColoursFrom, hardAlpha, quantizeJointly } from "./painted";

const dir = "src/assets/scenes/london";
const raw = "assets-src/approved/london-jukebox.webp";
const output = `${dir}/obj-jukebox.png`;
const palette = fixedColoursFrom(
  await Promise.all(
    readdirSync(dir)
      .filter((name) => name.endsWith(".png") && name !== "obj-jukebox.png")
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
  .resize({ width: 62, height: 98, fit: "contain", background: "#00000000" })
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
  "assets-src/provenance/london-obj-jukebox.json",
  JSON.stringify(
    {
      id: "london-obj-jukebox",
      output,
      task: "pub-depth-jukebox",
      source: "codex",
      prompt: "assets-src/prompts/hd/london-jukebox.md",
      candidate: "01",
      references: [],
      approvedRaw: raw,
      density: 2,
      style: "painted",
      approvedBy: "codex",
      date: "2026-09-30",
      cleanup:
        "Built-in image generation; scripts/assets/jukebox.ts trims, fits to a 66x102 art-pixel cell and maps to the existing London palette with hard alpha.",
    },
    null,
    2,
  ) + "\n",
);
