/**
 * Re-encodes every image under `src/assets/` as WebP at build time, so the
 * game ships a fraction of the bytes while the repository keeps its PNG
 * sources (the asset pipeline and `lint:assets` read those).
 *
 * Painted art goes lossy at a quality the eye can't tell from the source.
 * Pixel art (a small palette) stays lossless, where lossy WebP would blur
 * hard edges. Transparency is always lossless, so the alpha bounding boxes
 * the engine derives hotspots from never move. A file WebP can't shrink
 * keeps its original bytes.
 */
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import sharp from "sharp";
import type { Plugin, ResolvedConfig } from "vite";

const IMAGE = /\.(png|webp)$/;

/** Up to this many colours, an image is pixel art and stays lossless. */
const PALETTE_LIMIT = 256;

const LOSSY = { quality: 90, alphaQuality: 100, effort: 6 } as const;
const LOSSLESS = { lossless: true, effort: 6 } as const;

/** True if the image uses no more than `limit` distinct RGBA colours. */
export async function fewColours(
  source: Buffer,
  limit = PALETTE_LIMIT,
): Promise<boolean> {
  const data = await sharp(source).ensureAlpha().raw().toBuffer();
  const pixels = new Uint32Array(
    data.buffer,
    data.byteOffset,
    data.byteLength / 4,
  );
  const seen = new Set<number>();
  for (const pixel of pixels) {
    seen.add(pixel);
    if (seen.size > limit) return false;
  }
  return true;
}

/** The WebP for `source`, or null when it wouldn't be smaller. */
export async function encodeWebp(source: Buffer): Promise<Buffer | null> {
  const options = (await fewColours(source)) ? LOSSLESS : LOSSY;
  const webp = await sharp(source).webp(options).toBuffer();
  return webp.length < source.length ? webp : null;
}

/** Vite's default `build.assetsInlineLimit`, in bytes. */
const INLINE_LIMIT = 4096;

export function optimizeImages(): Plugin {
  // One encode per file, however many ways it's imported.
  const encoded = new Map<string, Promise<Buffer | null>>();
  let inlineLimit = INLINE_LIMIT;
  return {
    name: "optimize-images",
    apply: "build",
    enforce: "pre",
    configResolved(config: ResolvedConfig) {
      const limit = config.build.assetsInlineLimit;
      if (typeof limit === "number") inlineLimit = limit;
    },
    async load(id) {
      const [file, query = ""] = id.split("?");
      if (!IMAGE.test(file) || !file.includes("/src/assets/")) return null;
      // Only plain and `?url` imports are URLs; leave `?raw` and the rest.
      if (query !== "" && query !== "url") return null;
      let pending = encoded.get(file);
      if (!pending) {
        // Vite inlines a file this small as it is; there's nothing to save.
        pending = readFile(file).then((source) =>
          source.length < inlineLimit ? null : encodeWebp(source),
        );
        encoded.set(file, pending);
      }
      const webp = await pending;
      if (!webp) return null;
      // A WebP this small inlines as a data URL, as Vite would inline it.
      if (webp.length < inlineLimit) {
        const url = `data:image/webp;base64,${webp.toString("base64")}`;
        return `export default ${JSON.stringify(url)};`;
      }
      const ref = this.emitFile({
        type: "asset",
        name: `${basename(file, extname(file))}.webp`,
        source: webp,
      });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    },
  };
}
