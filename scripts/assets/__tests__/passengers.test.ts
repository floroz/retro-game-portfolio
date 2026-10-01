// @vitest-environment node
import { describe, expect, test } from "vitest";
import { readImage } from "../lib";

// The study keeps the 640x320 sheet; the game ships the remaster at twice its
// size. Both must walk.
const sheets = [
  { path: "src/assets/scenes/hall/anim-passenger-family.png", scale: 1 },
  { path: "src/assets/remaster/hall/anim-passenger-family.png", scale: 2 },
];

describe("shipped family walk artwork", () => {
  test.each(sheets)(
    "passing poses have solid trouser legs without transparent slits ($path)",
    async ({ path, scale }) => {
      const image = await readImage(path);
      for (const frame of [1, 3]) {
        for (let y = 90 * scale; y < 97 * scale; y++) {
          // Below the child's hand, each trouser leg is a continuous run.
          // Stop before the trolley wheel. A third run is a tear inside a
          // leg, not the gap between the legs.
          let runs = 0;
          let opaque = false;
          for (let x = 39 * scale; x < 70 * scale; x++) {
            const i = (y * image.width + frame * 124 * scale + x) * 4;
            const next = image.data[i + 3] > 128;
            if (next && !opaque) runs++;
            opaque = next;
          }
          expect(runs, `frame ${frame}, row ${y}`).toBe(2);
        }
      }
    },
  );

  test.each(sheets)(
    "the mother's feet come together between contact poses ($path)",
    async ({ path, scale }) => {
      const image = await readImage(path);
      expect([image.width, image.height]).toEqual([496 * scale, 112 * scale]);

      // Sample her brown trousers immediately above the shoes. Exclude the
      // child's blue jeans and the trolley to catch the original static, wide
      // stride even though the child's poses already changed between frames.
      const spans = Array.from({ length: 4 }, (_, frame) => {
        const columns: number[] = [];
        for (let y = 94 * scale; y <= 97 * scale; y++) {
          for (let x = 30 * scale; x < 76 * scale; x++) {
            const i = (y * image.width + frame * 124 * scale + x) * 4;
            if (
              image.data[i + 3] > 128 &&
              image.data[i] - image.data[i + 2] > 25
            ) {
              columns.push(x);
            }
          }
        }
        expect(columns.length).toBeGreaterThan(0);
        return Math.max(...columns) - Math.min(...columns) + 1;
      });

      for (const frame of [1, 3]) {
        expect(spans[frame]).toBeLessThan(spans[frame - 1] * 0.85);
      }
    },
  );
});
