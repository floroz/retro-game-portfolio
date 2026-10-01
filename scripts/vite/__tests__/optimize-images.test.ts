import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { encodeWebp, fewColours } from "../optimize-images";

/** A painted-looking image: a gradient with soft, partly transparent edges. */
async function painted(): Promise<Buffer> {
  const w = 96;
  const h = 64;
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = (x * 255) / w;
      data[i + 1] = (y * 255) / h;
      data[i + 2] = ((x + y) * 3) % 256;
      data[i + 3] = x < 8 || x > 87 ? 0 : x < 16 ? x * 16 : 255;
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

async function alpha(image: Buffer): Promise<Buffer> {
  return sharp(image).ensureAlpha().extractChannel(3).raw().toBuffer();
}

describe("build-time WebP", () => {
  test("tells pixel art from painted art by its palette", async () => {
    const flat = await sharp({
      create: { width: 8, height: 8, channels: 4, background: "#123456" },
    })
      .png()
      .toBuffer();
    expect(await fewColours(flat)).toBe(true);
    expect(await fewColours(await painted())).toBe(false);
  });

  test("keeps transparency exact, so hotspots don't move", async () => {
    const source = await painted();
    const webp = await encodeWebp(source);
    expect(webp).not.toBeNull();
    expect((await sharp(webp!).metadata()).format).toBe("webp");
    expect((await alpha(webp!)).equals(await alpha(source))).toBe(true);
  });

  test("keeps the original when WebP isn't smaller", async () => {
    const tiny = await sharp({
      create: { width: 1, height: 1, channels: 4, background: "#000000" },
    })
      .png()
      .toBuffer();
    const webp = await encodeWebp(tiny);
    expect(webp === null || webp.length < tiny.length).toBe(true);
  });
});
