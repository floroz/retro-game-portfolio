/**
 * Size budgets for the art the build ships. Sizes come from the build's own
 * encoder (`?shipped-size`, scripts/vite/optimize-images.ts), so they match
 * `dist/` without a build. A new or replaced image that breaks a budget
 * fails here, before a visitor waits on it.
 */
import { describe, expect, test } from "vitest";
import { preloadTiers } from "../preload";

// Lazy, so only the images the game preloads are encoded.
const SHIPPED = import.meta.glob<number>(
  "../../assets/**/*.{png,webp,jpg,jpeg}",
  { query: "?shipped-size", import: "default" },
);

/**
 * The launch dialog waits for the title card and the first scene. About
 * 1.5 s on a 5 Mbps connection, the dialog's shortest launch.
 */
const LAUNCH_BUDGET = 1024 * 1024;

/** Any one image. The boarding pass, the largest, is about 400 KB. */
const IMAGE_BUDGET = 512 * 1024;

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

/** Shipped bytes for each preloaded image, by its dev URL (`/src/assets/…`). */
async function shippedSizes(urls: string[]): Promise<Map<string, number>> {
  const sizes = await Promise.all(
    urls.map((url) => {
      const load = SHIPPED[url.replace("/src/assets/", "../../assets/")];
      if (!load) throw new Error(`No shipped size for ${url}`);
      return load();
    }),
  );
  return new Map(urls.map((url, i) => [url, sizes[i]]));
}

// The first run encodes every image (later runs hit the encoder's cache).
describe("asset budgets", { timeout: 120_000 }, () => {
  const tiers = preloadTiers();
  const launch = tiers.slice(0, 2).flatMap((tier) => tier.urls);
  const all = tiers.flatMap((tier) => tier.urls);

  test("the title card and first scene fit the launch dialog", async () => {
    const sizes = await shippedSizes(launch);
    const total = [...sizes.values()].reduce((sum, size) => sum + size, 0);
    expect(
      total,
      `launch art is ${kb(total)}, over ${kb(LAUNCH_BUDGET)}`,
    ).toBeLessThanOrEqual(LAUNCH_BUDGET);
  });

  test("no single image is too heavy", async () => {
    const sizes = await shippedSizes(all);
    const heavy = [...sizes]
      .filter(([, size]) => size > IMAGE_BUDGET)
      .map(([url, size]) => `${url} (${kb(size)})`);
    expect(heavy, `over ${kb(IMAGE_BUDGET)}`).toEqual([]);
  });
});
