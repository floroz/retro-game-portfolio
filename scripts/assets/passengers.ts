/** Prepare the generated Hall passengers: `npx tsx scripts/assets/passengers.ts`. */
import sharp from "sharp";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readImage, writePng } from "./lib";
import { fixedColoursFrom, hardAlpha, quantizeJointly } from "./painted";
import { animateMotherStride } from "./stride";

const outDir = "src/assets/scenes/hall";
const specs = [
  { name: "businessman", frames: 4, width: 72, height: 108 },
  { name: "family", frames: 4, width: 124, height: 112 },
  { name: "reader", frames: 1, width: 30, height: 76 },
  { name: "window-man", frames: 1, width: 38, height: 60 },
  { name: "window-woman", frames: 1, width: 36, height: 60 },
];

// Preserve the shipped scenery exactly; map the newcomers to its palette.
const palette = fixedColoursFrom(
  await Promise.all(
    readdirSync(outDir)
      .filter((name) => name.endsWith(".png"))
      .map((name) => readImage(join(outDir, name))),
  ),
  256,
);

for (const spec of specs) {
  const raw = `assets-src/approved/passengers/${spec.name}.webp`;
  const source = hardAlpha(await readImage(raw), { minNeighbours: 0 }).image;
  const input = await sharp(source.data, {
    raw: { width: source.width, height: source.height, channels: 4 },
  })
    .png()
    .toBuffer();
  const cellWidth = source.width / spec.frames;
  const frames = [];
  for (let i = 0; i < spec.frames; i++) {
    // Trim each generated cell before fitting it into a fixed, foot-aligned cell.
    const cell = await sharp(input)
      .extract({
        left: i * cellWidth,
        top: 0,
        width: cellWidth,
        height: source.height,
      })
      .png()
      .toBuffer();
    const crop = await sharp(cell)
      .trim({ background: "#00000000", threshold: 1 })
      .resize({ width: spec.width - 4, height: spec.height - 4, fit: "inside" })
      .png()
      .toBuffer({ resolveWithObject: true });
    frames.push({
      input: crop.data,
      left: i * spec.width + Math.floor((spec.width - crop.info.width) / 2),
      top: spec.height - crop.info.height - 2,
    });
  }
  const { data, info } = await sharp({
    create: {
      width: spec.width * spec.frames,
      height: spec.height,
      channels: 4,
      background: "#00000000",
    },
  })
    .composite(frames)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const image = hardAlpha(
    {
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height,
    },
    { minNeighbours: 0 },
  ).image;
  const prepared = quantizeJointly([image], { colours: 256, fixed: palette })
    .images[0];
  const id = `hall-anim-passenger-${spec.name}`;
  const output = `${outDir}/anim-passenger-${spec.name}.png`;
  await writePng(
    output,
    spec.name === "family"
      ? animateMotherStride(prepared, spec.width)
      : prepared,
  );
  writeFileSync(
    `assets-src/provenance/${id}.json`,
    JSON.stringify(
      {
        id,
        output,
        task: "airport-passengers",
        source: "codex",
        prompt: "assets-src/prompts/hd/hall-passengers.md",
        candidate: "01",
        references: [],
        approvedRaw: raw,
        density: 2,
        style: "painted",
        cleanup: `Built-in image generation; prepared with scripts/assets/passengers.ts. ${spec.frames} foot-aligned cells, ${spec.width}x${spec.height} art px each; hard alpha and the existing Hall palette.${spec.name === "family" ? " Mother's legs rebuilt as passing poses in frames 1 and 3 by scripts/assets/stride.ts." : ""}`,
        approvedBy: "codex",
        date: "2026-09-30",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(output);
}
