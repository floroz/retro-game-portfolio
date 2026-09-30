/** Prepare the chalet layers, preserving the original moonlit window. */
import sharp, { type Sharp } from "sharp";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readImage, writePng } from "./lib";
import { fixedColoursFrom, hardAlpha, quantizeJointly } from "./painted";

const sceneDir = "src/assets/scenes/zurich";
const rawDir = "assets-src/approved/chalet";
const refs = "assets-src/refs/chalet";
const original = join(refs, "original-bg.png");
const frame = await sharp(original)
  .extract({ left: 220, top: 25, width: 176, height: 124 })
  .toBuffer();
const sill = await sharp(original)
  .extract({ left: 212, top: 148, width: 192, height: 10 })
  .toBuffer();

async function pixels(pipeline: Sharp) {
  const { data, info } = await pipeline
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return hardAlpha(
    {
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height,
    },
    { minNeighbours: 0 },
  ).image;
}

const names = readdirSync(sceneDir).filter((name) => name.endsWith(".png"));
const layers = await Promise.all(
  names.map(async (name) => {
    if (name === "bg.png") {
      return pixels(
        sharp(join(rawDir, "background.png"))
          .resize(640, 320, { fit: "fill" })
          .composite([
            { input: frame, left: 220, top: 25 },
            { input: sill, left: 212, top: 148 },
          ]),
      );
    }
    if (name === "obj-desk.png") {
      return pixels(
        sharp(join(rawDir, "desk.png"))
          .trim({ background: "#00000000", threshold: 1 })
          .resize(136, 96, { fit: "fill" }),
      );
    }
    if (name === "obj-chair.png") {
      return pixels(
        sharp(join(rawDir, "chair.png"))
          .trim({ background: "#00000000", threshold: 1 })
          .resize(54, 62, { fit: "contain", background: "#00000000" }),
      );
    }
    return readImage(join(refs, name));
  }),
);

// Reserve the original exterior colours so the approved view is pixel-identical.
const windowPixels = await pixels(sharp(frame));
const fixed = fixedColoursFrom([windowPixels], 256);
const prepared = quantizeJointly(layers, { colours: 256, fixed });
for (const [index, name] of names.entries()) {
  await writePng(join(sceneDir, name), prepared.images[index]);
}

for (const name of ["experience", "resume"]) {
  const art = await pixels(
    sharp(join(rawDir, `${name}.png`)).resize(640, 320, { fit: "fill" }),
  );
  const result = quantizeJointly([art], { colours: 256 });
  await writePng(`src/assets/inspections/${name}.png`, result.images[0]);
}
console.log(
  `Prepared ${names.length} chalet layers and two inspection backdrops.`,
);
