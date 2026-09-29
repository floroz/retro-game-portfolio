/**
 * Dev-only stand-in art for checking the HD engine (docs/art-spec.md,
 * "Phase H: HD hand-painted") before the real HD art exists. It upscales a
 * scene's current art to density 4 (a 1280x640 background) with Lanczos
 * resampling, into the git-ignored `dev-hd/<scene>/`. Open the game with
 * `?hd=<scene>` under `npm run dev` to swap it in (src/engine/dev/hdPreview.ts).
 *
 *   npm run dev:hd-placeholder -- zurich
 */
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const scene = process.argv[2] ?? "zurich";
const src = path.join("src/assets/scenes", scene);
const out = path.join("dev-hd", scene);

const bg = await sharp(path.join(src, "bg.png")).metadata();
if (!bg.width) throw new Error(`No bg.png in ${src}`);
const factor = 1280 / bg.width;

await mkdir(out, { recursive: true });
for (const file of await readdir(src)) {
  if (!file.endsWith(".png")) continue;
  const image = sharp(path.join(src, file));
  const { width = 0, height = 0 } = await image.metadata();
  await image
    .resize(Math.round(width * factor), Math.round(height * factor), {
      kernel: "lanczos3",
    })
    .png()
    .toFile(path.join(out, file));
  console.log(`${out}/${file}`);
}
