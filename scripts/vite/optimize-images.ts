/**
 * Re-encodes every PNG, WebP and JPEG under `src/assets/` as WebP at build
 * time, so the game ships a fraction of the bytes while the repository keeps
 * its sources (the asset pipeline and `lint:assets` read those).
 *
 * Painted art goes lossy at a quality the eye can't tell from the source.
 * Pixel art (a small palette) stays lossless, where lossy WebP would blur
 * hard edges. Transparency is always lossless, so the alpha bounding boxes
 * the engine derives hotspots from never move. A file WebP can't shrink
 * keeps its original bytes.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import type { Plugin, ResolvedConfig } from "vite";

const IMAGE = /\.(png|webp|jpe?g)$/;

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

/** What an encode depends on besides the source, for the cache key. */
const ENCODER = JSON.stringify({
  LOSSY,
  LOSSLESS,
  PALETTE_LIMIT,
  libwebp: sharp.versions.webp,
});

/**
 * `encodeWebp`, cached on disk by source and encoder settings, so a build
 * or test run only encodes images that changed since the last one.
 */
async function cachedWebp(
  source: Buffer,
  cacheDir: string,
): Promise<Buffer | null> {
  const key = createHash("sha256").update(ENCODER).update(source).digest("hex");
  const path = join(cacheDir, key);
  try {
    const hit = await readFile(path);
    // An empty entry records that WebP wasn't smaller.
    return hit.length > 0 ? hit : null;
  } catch {
    const webp = await encodeWebp(source);
    await mkdir(cacheDir, { recursive: true });
    await writeFile(path, webp ?? Buffer.alloc(0));
    return webp;
  }
}

/** Vite's default `build.assetsInlineLimit`, in bytes. */
const INLINE_LIMIT = 4096;

/**
 * Import `<image>?shipped-size` for the bytes the build ships for an image
 * (the size budget test, src/engine/__tests__/assetBudget.test.ts). Works
 * in every mode; the WebP itself is only swapped in by `vite build`.
 */
const SHIPPED_SIZE = "shipped-size";

export function optimizeImages(): Plugin {
  // One encode per file, however many ways it's imported.
  const encoded = new Map<string, Promise<Buffer | null>>();
  let inlineLimit = INLINE_LIMIT;
  let building = false;
  let cacheDir = "";
  const shipped = (file: string) => {
    let pending = encoded.get(file);
    if (!pending) {
      // Vite inlines a file this small as it is; there's nothing to save.
      pending = readFile(file).then((source) =>
        source.length < inlineLimit ? null : cachedWebp(source, cacheDir),
      );
      encoded.set(file, pending);
    }
    return pending;
  };
  return {
    name: "optimize-images",
    enforce: "pre",
    configResolved(config: ResolvedConfig) {
      building = config.command === "build";
      cacheDir = join(config.cacheDir, "optimize-images");
      const limit = config.build.assetsInlineLimit;
      if (typeof limit === "number") inlineLimit = limit;
    },
    async load(id) {
      const [file, query = ""] = id.split("?");
      if (!IMAGE.test(file) || !file.includes("/src/assets/")) return null;
      if (query === SHIPPED_SIZE) {
        const webp = await shipped(file);
        const size = webp ? webp.length : (await readFile(file)).length;
        return `export default ${size};`;
      }
      // Only plain and `?url` imports are URLs; leave `?raw` and the rest.
      if (!building || (query !== "" && query !== "url")) return null;
      const webp = await shipped(file);
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
