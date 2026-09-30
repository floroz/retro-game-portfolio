/** Recover the approved inspection originals without the V2 palette reduction.
 * The title ticket already has its original resolution; encode the same pixels
 * losslessly to reduce its download. No artwork or reading layout is changed.
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const root = "src/assets/remaster";
const inspections = [
  ["about", "sorrento-inspection-about.png"],
  ["contact", "sorrento-inspection-contact.png"],
  ["experience", "chalet/experience.png"],
  ["resume", "chalet/resume.png"],
  ["skills", "inspection-skills.png"],
  ...["cheese", "knife", "limoncello", "telephone"].map((name) => [
    `souvenir-${name}`,
    `hall-souvenir-${name}-inspection.png`,
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
    .resize(1280, 640, { fit: "fill", kernel: "lanczos3" })
    .webp({ lossless: true, effort: 6 })
    .toFile(output);
  entries.push({
    output,
    source,
    width: 1280,
    height: 640,
    treatment:
      "Same composition at density 4; full source colours and soft edges.",
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
