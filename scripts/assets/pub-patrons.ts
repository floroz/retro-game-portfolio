/** Prepare the generated London pub patrons: `npx tsx scripts/assets/pub-patrons.ts`. */
import sharp from "sharp";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readImage, writePng } from "./lib";
import { fixedColoursFrom, hardAlpha, quantizeJointly } from "./painted";

const outDir = "src/assets/scenes/london";
const specs = [
  { name: "table-woman", frames: 4, width: 52, height: 96, split: 62 },
  { name: "table-man", frames: 4, width: 52, height: 96, split: 62 },
  { name: "bar-man", frames: 4, width: 48, height: 112, split: 54 },
  { name: "bar-woman", frames: 4, width: 48, height: 112, split: 56 },
];

// Preserve the shipped scenery exactly; map the newcomers to its palette.
const palette = fixedColoursFrom(
  await Promise.all(
    readdirSync(outDir)
      .filter(
        (name) => name.endsWith(".png") && !name.startsWith("anim-patron-"),
      )
      .map((name) => readImage(join(outDir, name))),
  ),
  256,
);

for (const spec of specs) {
  const raw = `assets-src/approved/pub-patrons/${spec.name}.webp`;
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
        left: Math.round(i * cellWidth),
        top: 0,
        width: Math.round((i + 1) * cellWidth) - Math.round(i * cellWidth),
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
  // Keep the planted lower body from frame zero. Generated poses must never
  // move a stool or slide the feet when only the drinking arm is moving.
  for (let frame = 1; frame < spec.frames; frame++) {
    for (let y = spec.split; y < spec.height; y++) {
      for (let x = 0; x < spec.width; x++) {
        const from = (y * image.width + x) * 4;
        const to = (y * image.width + frame * spec.width + x) * 4;
        image.data.set(image.data.subarray(from, from + 4), to);
      }
    }
  }
  const prepared = quantizeJointly([image], { colours: 256, fixed: palette })
    .images[0];
  const id = `london-anim-patron-${spec.name}`;
  const output = `${outDir}/anim-patron-${spec.name}.png`;
  await writePng(output, prepared);
  writeFileSync(
    `assets-src/provenance/${id}.json`,
    JSON.stringify(
      {
        id,
        output,
        task: "pub-patrons",
        source: "codex",
        prompt: "assets-src/prompts/hd/london-patrons.md",
        candidate: "01",
        references: [],
        approvedRaw: raw,
        density: 2,
        style: "painted",
        cleanup: `Built-in image generation; prepared with scripts/assets/pub-patrons.ts. ${spec.frames} foot-aligned cells, ${spec.width}x${spec.height} art px each; hard alpha and the existing London palette.`,
        approvedBy: "codex",
        date: "2026-09-30",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(output);
}
