/** Export the generated cow and the small cleaned clock-wall patch.
 * Run after remaster-world.ts: node --import tsx scripts/assets/swiss-room.ts
 */
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { readImage, writePng } from "./lib";
import { fixedColoursFrom, hardAlpha, remapToPalette } from "./painted";

const original = "src/assets/scenes/zurich";
const remaster = "src/assets/remaster/zurich";
const palette = fixedColoursFrom(
  await Promise.all(
    (await readdir(original))
      .filter((file) => file.endsWith(".png"))
      .map((file) => readImage(`${original}/${file}`)),
  ),
);

const cow = await sharp("assets-src/approved/zurich-sleeping-cow.webp")
  .trim({ background: "#00000000", threshold: 10 })
  .resize(320, 160, {
    fit: "contain",
    position: "bottom",
    background: "#00000000",
  })
  .png()
  .toBuffer();
await sharp(cow).toFile(`${remaster}/anim-sleeping-cow.png`);
await sharp(cow)
  .resize(160, 80)
  .png()
  .toFile(`${original}/anim-sleeping-cow.png`);
await writePng(
  `${original}/anim-sleeping-cow.png`,
  remapToPalette(
    hardAlpha(await readImage(`${original}/anim-sleeping-cow.png`)).image,
    palette,
  ),
);

// Composite only the 24x40 edited wall patch: every other background pixel
// remains the original. Keep the clock case and both pinecone weights intact.
for (const [folder, density] of [
  [remaster, 4],
  [original, 2],
] as const) {
  const patch = await sharp("assets-src/approved/zurich-clock-wall.webp")
    .resize((24 * density) / 4, (40 * density) / 4)
    .png()
    .toBuffer();
  const result = await sharp(`${folder}/bg.png`)
    .composite([
      { input: patch, left: (882 * density) / 4, top: (146 * density) / 4 },
    ])
    .png()
    .toBuffer();
  await sharp(result).toFile(`${folder}/bg.png`);
  if (density === 2) {
    await writePng(
      `${folder}/bg.png`,
      remapToPalette(await readImage(`${folder}/bg.png`), palette),
    );
  }
}
