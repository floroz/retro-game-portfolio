// @vitest-environment node
import { describe, expect, test } from "vitest";
import { readImage } from "../lib";

describe("shipped family walk artwork", () => {
  test("the mother's feet come together between contact poses", async () => {
    const image = await readImage(
      "src/assets/scenes/hall/anim-passenger-family.png",
    );
    expect([image.width, image.height]).toEqual([496, 112]);

    // Sample her brown trousers immediately above the shoes. Exclude the
    // child's blue jeans and the trolley to catch the original static, wide
    // stride even though the child's poses already changed between frames.
    const spans = Array.from({ length: 4 }, (_, frame) => {
      const columns: number[] = [];
      for (let y = 94; y <= 97; y++) {
        for (let x = 30; x < 76; x++) {
          const i = (y * image.width + frame * 124 + x) * 4;
          if (image.data[i + 3] && image.data[i] - image.data[i + 2] > 25) {
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
  });
});
