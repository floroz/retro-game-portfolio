import { describe, expect, test } from "vitest";
import { placeShadow } from "../shadows";

describe("ground shadow registration", () => {
  const footprint = { x: 8, y: 40, width: 12, depth: 4 };

  test("scales its foot contact and footprint with a moving sprite", () => {
    expect(placeShadow(footprint, 100, 60, 0.5)).toEqual({
      x: 104,
      y: 80,
      width: 6,
      depth: 2,
    });
  });

  test("mirrors an off-centre contact around the sprite's own width", () => {
    expect(placeShadow(footprint, 100, 60, 0.5, 30)).toEqual({
      x: 111,
      y: 80,
      width: 6,
      depth: 2,
    });
  });
});
