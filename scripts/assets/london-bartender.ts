/** Prepare the London background, bartender and wall decorations from their full-quality sources. */
import sharp from "sharp";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readImage, writePng } from "./lib";
import { fixedColoursFrom, hardAlpha, quantizeJointly } from "./painted";

const sourceDir = "assets-src/approved/london-pub";
const originalDir = "src/assets/scenes/london";
const remasterDir = "src/assets/remaster/london";
const names = [
  "anim-bartender-pour",
  "anim-bartender-wipe",
  "obj-guest-board",
  "bg",
];
const palette = fixedColoursFrom(
  await Promise.all(
    readdirSync(originalDir)
      .filter(
        (file) => file.endsWith(".png") && !names.includes(file.slice(0, -4)),
      )
      .map((file) => readImage(join(originalDir, file))),
  ),
  256,
);

// Two eight-cell strips stay within the scene-width limit. Transparent cells
// let the scene alternate the strips without a new animation mechanism.
const strips = [
  { name: "pour", sequence: [0, 1, 2, 3, 4, 5, 6, -1] },
  { name: "wipe", sequence: [-1, 7, 8, 9, 10, 11, 10, 9] },
];
const sheet = join(sourceDir, "bartender.png");
const metadata = await sharp(sheet).metadata();
if (!metadata.width || !metadata.height)
  throw new Error("Missing sheet dimensions");
const cell = metadata.width / 4;
if (!Number.isInteger(cell) || metadata.height !== cell * 3)
  throw new Error(
    "Bartender source must be a four-column, three-row square-cell sheet",
  );
for (const { name, sequence } of strips) {
  const frames = await Promise.all(
    sequence.map(async (frame, index) => ({
      input:
        frame < 0
          ? await sharp({
              create: {
                width: 128,
                height: 128,
                channels: 4,
                background: "#00000000",
              },
            })
              .png()
              .toBuffer()
          : await sharp(sheet)
              .extract({
                left: (frame % 4) * cell,
                top: Math.floor(frame / 4) * cell,
                width: cell,
                height: cell,
              })
              .resize(128, 128)
              .png()
              .toBuffer(),
      left: index * 128,
      top: 0,
    })),
  );
  await sharp({
    create: {
      width: sequence.length * 128,
      height: 128,
      channels: 4,
      background: "#00000000",
    },
  })
    .composite(frames)
    .png()
    .toFile(join(remasterDir, `anim-bartender-${name}.png`));
}
await sharp(join(sourceDir, "guest-board.png"))
  .trim({ background: "#00000000", threshold: 10 })
  .resize(244, 184, { fit: "contain", background: "#00000000" })
  .png()
  .toFile(join(remasterDir, "obj-guest-board.png"));
await sharp(join(sourceDir, "background.png"))
  .resize(1280, 640)
  .png()
  .toFile(join(remasterDir, "bg.png"));

for (const name of names) {
  const input = join(remasterDir, `${name}.png`);
  const meta = await sharp(input).metadata();
  const { data, info } = await sharp(input)
    .resize((meta.width ?? 0) / 2, (meta.height ?? 0) / 2)
    .ensureAlpha()
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
  await writePng(
    join(originalDir, `${name}.png`),
    quantizeJointly([image], { colours: palette.length, fixed: palette })
      .images[0],
  );
  const raw = name.startsWith("anim-bartender-")
    ? "bartender"
    : name === "obj-guest-board"
      ? "guest-board"
      : "background";
  writeFileSync(
    `assets-src/provenance/london-${name}.json`,
    JSON.stringify(
      {
        id: `london-${name}`,
        output: join(originalDir, `${name}.png`),
        task: "london-bartender",
        source: "codex",
        candidate: "01",
        prompt: "assets-src/prompts/hd/london-bartender.md",
        approvedRaw: join(sourceDir, `${raw}.png`),
        references: [],
        density: 2,
        style: "painted",
        approvedBy: "codex",
        date: "2026-10-06",
        cleanup:
          "Built-in image generation from the user-reviewed London concepts. Prepared with scripts/assets/london-bartender.ts: density-4 remaster, density-2 twin with hard alpha and the existing London palette. The bartender uses two eight-cell strips with 32x32 logical-pixel cells, twelve generated poses, repeated wipes and complementary transparent holds. The background replaces the chalkboard and repeated bottle rows with the user-approved wood-backed shelving. Other scene layers remain separate. Preview references and the superseded background remain in chat and Git history, not the production tree.",
      },
      null,
      2,
    ) + "\n",
  );
}
