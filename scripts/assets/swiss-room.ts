/** Export the daytime chalet and inspections. Run: node --import tsx scripts/assets/swiss-room.ts */
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { alphaBounds, writePng, type Image, type Rgb } from "./lib";
import { hardAlpha, quantizeJointly } from "./painted";

const raw = "assets-src/approved/swiss-room";
const original = "src/assets/scenes/zurich";
const remaster = "src/assets/remaster/zurich";
const prompt = "assets-src/prompts/swiss-room.md";
const clear = "#00000000";
async function pixels(input: Buffer): Promise<Image> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return hardAlpha({
    data: new Uint8ClampedArray(data),
    width: info.width,
    height: info.height,
  }).image;
}
async function png(image: Image) {
  return sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: 4 },
  })
    .png()
    .toBuffer();
}
interface Layer {
  name: string;
  source: string;
  image: Image;
}
const layers: Layer[] = [
  {
    name: "bg",
    source: `${raw}/background.png`,
    image: await pixels(
      await sharp(`${raw}/background.png`)
        .resize(640, 320, { fit: "fill" })
        .png()
        .toBuffer(),
    ),
  },
];
/** Measured master rectangles: imagegen did not space furniture into equal cells.
 * Threshold alpha before trimming to discard invisible coloured matte pixels. */
async function crop(
  source: string,
  rect: [number, number, number, number],
  width: number,
  height: number,
) {
  const [left, top, w, h] = rect;
  const image = await pixels(
    await sharp(source)
      .extract({ left, top, width: w, height: h })
      .png()
      .toBuffer(),
  );
  const box = alphaBounds(image, 128);
  if (!box) throw new Error(`Empty sprite in ${source}`);
  return pixels(
    await sharp(await png(image))
      .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
      .resize(width * 2, height * 2, { fit: "fill" })
      .png()
      .toBuffer(),
  );
}
const furniture: [string, [number, number, number, number], number, number][] =
  [
    ["obj-fondue-bar", [0, 85, 665, 400], 83, 48],
    ["obj-table", [670, 180, 560, 300], 90, 40],
    ["obj-stool", [1250, 125, 275, 355], 18, 29],
    ["obj-album", [20, 625, 630, 295], 48, 20],
    ["obj-satchel", [665, 510, 395, 420], 27, 30],
    ["obj-satchel@open", [1110, 510, 405, 420], 27, 30],
  ];
for (const [name, rect, w, h] of furniture)
  layers.push({
    name,
    source: `${raw}/furniture.png`,
    image: await crop(`${raw}/furniture.png`, rect, w, h),
  });
const props: [string, [number, number, number, number], number, number][] = [
  ["obj-door", [120, 0, 230, 650], 20, 87],
  ["obj-fondue", [1050, 140, 480, 460], 29, 27],
  ["anim-boat", [20, 695, 600, 280], 13, 6],
  ["anim-cuckoo", [700, 700, 345, 280], 5, 5],
];
for (const [name, rect, w, h] of props)
  layers.push({
    name,
    source: `${raw}/props.png`,
    image: await crop(`${raw}/props.png`, rect, w, h),
  });
const cowMeta = await sharp(`${raw}/cow.png`).metadata();
const cowCell = cowMeta.width! / 4;
const cowPoses = await Promise.all(
  [0, 1, 2].map((frame) =>
    crop(
      `${raw}/cow.png`,
      [frame * cowCell, 0, cowCell, cowMeta.height!],
      24,
      18,
    ),
  ),
);
const cowOrder = [0, 0, 1, 0, 2, 0];
const cowStrip = await sharp({
  create: {
    width: 48 * cowOrder.length,
    height: 36,
    channels: 4,
    background: clear,
  },
})
  .composite(
    await Promise.all(
      cowOrder.map(async (pose, frame) => ({
        input: await png(cowPoses[pose]),
        left: frame * 48,
        top: 0,
      })),
    ),
  )
  .png()
  .toBuffer();
layers.push({
  name: "anim-garden-cow",
  source: `${raw}/cow.png`,
  image: await pixels(cowStrip),
});
const inspections = await Promise.all(
  ["experience", "resume"].map(async (name) => ({
    name,
    source: `assets-src/approved/location-inspections/${name}.png`,
    image: await pixels(
      await sharp(`assets-src/approved/location-inspections/${name}.png`)
        .resize(640, 320, { fit: "fill" })
        .png()
        .toBuffer(),
    ),
  })),
);
// Reuse the approved joint room/inspection palette so a new sprite cannot
// recolour the background and every other object.
const fixed: Rgb[] = JSON.parse(await readFile(`${raw}/palette.json`, "utf8"));
const prepared = quantizeJointly(
  [...layers, ...inspections].map((layer) => layer.image),
  { colours: 256, fixed },
);
await mkdir(original, { recursive: true });
await mkdir(remaster, { recursive: true });
const manifest: {
  output: string;
  original: string;
  source: string;
  note: string;
}[] = [];
for (const [index, layer] of layers.entries()) {
  const sourceOutput = `${original}/${layer.name}.png`;
  const output = `${remaster}/${layer.name}.png`;
  await writePng(sourceOutput, prepared.images[index]);
  await sharp(sourceOutput)
    .resize(
      prepared.images[index].width * 2,
      prepared.images[index].height * 2,
      { kernel: "nearest" },
    )
    .png()
    .toFile(output);
  const note =
    "Daytime fondue chalet. Joint 256-colour palette, hard alpha at density 2; nearest-neighbour density-4 twin. Reproduce with scripts/assets/swiss-room.ts.";
  manifest.push({ output, original: sourceOutput, source: layer.source, note });
  await writeFile(
    `assets-src/provenance/zurich-${layer.name}.json`,
    JSON.stringify(
      {
        id: `zurich-${layer.name}`,
        output: sourceOutput,
        task: "daytime-swiss-room",
        source: "codex",
        prompt,
        candidate: "01",
        references: [`${raw}/concept.png`],
        approvedRaw: layer.source,
        density: 2,
        style: "painted",
        cleanup: note,
        date: "2026-10-05",
      },
      null,
      2,
    ) + "\n",
  );
}
for (const [index, inspection] of inspections.entries()) {
  const output = `src/assets/remaster/inspections/${inspection.name}.webp`;
  await sharp(await png(prepared.images[layers.length + index]))
    .resize(1280, 640, { kernel: "nearest" })
    .webp({ lossless: true })
    .toFile(output);
  await writeFile(
    `assets-src/provenance/remaster-inspection-${inspection.name}.json`,
    JSON.stringify(
      {
        id: `remaster-inspection-${inspection.name}`,
        output,
        task: "daytime-swiss-room",
        source: "codex",
        prompt,
        candidate: "01",
        references: [`${raw}/concept.png`],
        approvedRaw: inspection.source,
        density: 4,
        date: "2026-10-05",
        cleanup:
          "Built-in imagegen. Same joint palette and density-2 painted pixel grid as chalet; nearest-neighbour 1280x640 export. Flat reading surface for live HTML. Reproduce with scripts/assets/swiss-room.ts.",
      },
      null,
      2,
    ) + "\n",
  );
}
await writeFile(
  "assets-src/remaster/swiss-room-manifest.json",
  JSON.stringify(
    {
      recipe: "scripts/assets/swiss-room.ts",
      palette: prepared.palette,
      assets: manifest,
    },
    null,
    2,
  ) + "\n",
);
const worldPath = "assets-src/remaster/world-manifest.json";
const world: { assets: typeof manifest } = JSON.parse(
  await readFile(worldPath, "utf8"),
);
world.assets = [
  ...world.assets.filter((asset) => !asset.output.includes("/zurich/")),
  ...manifest,
];
await writeFile(worldPath, JSON.stringify(world, null, 2) + "\n");
const uiPath = "assets-src/remaster/ui-manifest.json";
const ui: { assets: { output: string; treatment: string }[] } = JSON.parse(
  await readFile(uiPath, "utf8"),
);
for (const inspection of inspections) {
  const entry = ui.assets.find(
    (asset) =>
      asset.output ===
      `src/assets/remaster/inspections/${inspection.name}.webp`,
  );
  if (entry)
    entry.treatment =
      "Shared chalet 256-colour palette at density 2, nearest-neighbour density-4 export. Recipe: scripts/assets/swiss-room.ts. Text-safe insets live in src/config/inspections.ts.";
}
await writeFile(uiPath, JSON.stringify(ui, null, 2) + "\n");
console.log(
  `Prepared ${layers.length} room layers and 2 close-ups with one shared palette.`,
);
