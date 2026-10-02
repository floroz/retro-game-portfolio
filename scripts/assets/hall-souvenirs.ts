/** Prepare independently replaceable duty-free artwork on the Hall pixel grid. */
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { readImage, writePng } from "./lib";
import { fixedColoursFrom, hardAlpha, remapToPalette } from "./painted";

const hall = "src/assets/scenes/hall";
const raw = "assets-src/approved";
const palette = fixedColoursFrom(
  await Promise.all(
    (await readdir(hall))
      .filter((name) => name.endsWith(".png"))
      .map((name) => readImage(`${hall}/${name}`)),
  ),
);

async function prepare(
  source: string,
  target: string,
  width: number,
  height: number,
  sprite: boolean,
) {
  let pipeline = sharp(source);
  if (sprite)
    pipeline = pipeline.trim({ background: "#00000000", threshold: 100 });
  const result = await pipeline
    .resize(width, height, {
      fit: sprite ? "contain" : "fill",
      position: "bottom",
      background: "#00000000",
      kernel: "lanczos3",
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const image = hardAlpha(
    {
      width: result.info.width,
      height: result.info.height,
      data: new Uint8ClampedArray(result.data),
    },
    { threshold: 200, minNeighbours: 0 },
  ).image;
  await writePng(target, remapToPalette(image, palette));
}

await prepare(
  `${raw}/hall-duty-free-empty.png`,
  `${hall}/obj-duty-free.png`,
  160,
  142,
  true,
);

for (const [name, width, height] of [
  ["limoncello", 14, 28],
  ["knife", 28, 32],
  ["cheese", 32, 24],
  ["telephone", 16, 32],
] as const) {
  await prepare(
    `${raw}/hall-souvenir-${name}-sprite.png`,
    `${hall}/obj-souvenir-${name}.png`,
    width,
    height,
    true,
  );
}
