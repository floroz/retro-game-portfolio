/** Export the approved classic-adventure inspection originals.
 * The title ticket already has its original resolution; encode the same pixels
 * losslessly to reduce its download. Portfolio cards use the
 * approved location artwork. Nearest-neighbour resizing
 * retains their deliberately stepped ink contours without adding soft fringes.
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const root = "src/assets/remaster";
const inspections = [
  ...["about", "contact", "experience", "resume", "skills"].map((name) => [
    name,
    `location-inspections/${name}.png`,
  ]),
];

const entries: {
  output: string;
  source: string;
  width: number;
  height: number;
  treatment: string;
}[] = [];
await mkdir(`${root}/inspections`, { recursive: true });
await mkdir(`${root}/title`, { recursive: true });
for (const [name, raw] of inspections) {
  const source = `assets-src/approved/${raw}`;
  const output = `${root}/inspections/${name}.webp`;
  await sharp(source)
    .resize(1280, 640, { fit: "fill", kernel: "nearest" })
    .webp({ lossless: true, effort: 6 })
    .toFile(output);
  entries.push({
    output,
    source,
    width: 1280,
    height: 640,
    treatment:
      "Classic adventure location artwork at 2:1; nearest-neighbour resize, full colours, lossless source export. Text-safe insets live in src/config/inspections.ts.",
  });
}
const source = "assets-src/approved/boarding-pass.png";
const output = `${root}/title/boarding-pass.webp`;
const info = await sharp(source)
  .webp({ lossless: true, effort: 6 })
  .toFile(output);
entries.push({
  output,
  source,
  width: info.width,
  height: info.height,
  treatment:
    "Original resolution and pixels preserved; lossless encoding only.",
});
await mkdir("assets-src/remaster", { recursive: true });
await writeFile(
  "assets-src/remaster/ui-manifest.json",
  `${JSON.stringify({ recipe: "scripts/assets/remaster-ui.ts", assets: entries }, null, 2)}\n`,
);
console.log(`Prepared ${entries.length} UI images from approved source art.`);

// Preserve the shared chalet palette for the two Swiss reading surfaces.
await import("./swiss-room");
