import { describe, expect, test } from "vitest";
import { outlineSilhouette } from "../rig/outline";
import { RIG_INK } from "../rigTypes";

const W = 12;
const H = 12;
const FILL = [80, 120, 200] as const;

/** A figure of `FILL` pixels on a transparent 12x12 image. */
function figure(rows: string[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const p = (y * W + x) * 4;
      if (ch === "#") data.set([...FILL, 255], p);
      if (ch === "k") data.set([RIG_INK[0], RIG_INK[1], RIG_INK[2], 255], p);
    });
  });
  return data;
}

const at = (d: Uint8ClampedArray, x: number, y: number) => {
  const p = (y * W + x) * 4;
  return [d[p], d[p + 1], d[p + 2], d[p + 3]];
};
const isInk = (d: Uint8ClampedArray, x: number, y: number) =>
  at(d, x, y).join() === [...RIG_INK, 255].join();

describe("the puppet's outline", () => {
  const BLOCK = [
    "",
    "",
    "  ######",
    "  ######",
    "  ######",
    "  ######",
    "  ######",
  ];

  test("inks every pixel on the edge and none inside", () => {
    const d = figure(BLOCK);
    outlineSilhouette(d, W, H);
    for (let x = 2; x <= 7; x++) {
      expect(isInk(d, x, 2)).toBe(true);
      expect(isInk(d, x, 6)).toBe(true);
    }
    expect(isInk(d, 2, 4)).toBe(true);
    expect(isInk(d, 7, 4)).toBe(true);
    expect(at(d, 4, 4)).toEqual([...FILL, 255]);
    expect(at(d, 5, 3)).toEqual([...FILL, 255]);
    // Nothing is drawn outside.
    expect(at(d, 1, 4)[3]).toBe(0);
  });

  test("drops a stray pixel and fills a notch, so the line is continuous", () => {
    const d = figure([
      "",
      "      #",
      "  ######",
      "  ######",
      "  ######",
      "  ######",
      "  ######",
    ]);
    // a notch in the left edge
    d.fill(0, (4 * W + 2) * 4, (4 * W + 2) * 4 + 4);
    outlineSilhouette(d, W, H);
    expect(at(d, 6, 1)[3]).toBe(0);
    expect(at(d, 2, 4)[3]).toBe(255);
    // The left edge is ink from top to bottom.
    for (let y = 2; y <= 6; y++) expect(isInk(d, 2, y)).toBe(true);
  });

  test("an old ring pixel one step inside the edge takes the fill's colour", () => {
    const d = figure(BLOCK);
    // a part's ring landing one pixel in from the edge
    d.set([RIG_INK[0], RIG_INK[1], RIG_INK[2], 255], (4 * W + 3) * 4);
    outlineSilhouette(d, W, H);
    expect(isInk(d, 2, 4)).toBe(true);
    expect(at(d, 3, 4)).toEqual([...FILL, 255]);
  });

  test("a drawn line further inside the figure stays", () => {
    const d = figure(BLOCK);
    d.set([RIG_INK[0], RIG_INK[1], RIG_INK[2], 255], (4 * W + 5) * 4);
    outlineSilhouette(d, W, H);
    expect(isInk(d, 5, 4)).toBe(true);
  });

  test("drawn detail the smoothing greyed is snapped back to solid ink", () => {
    const d = figure(BLOCK);
    // a pupil that resampling turned grey
    d.set([120, 118, 116, 255], (4 * W + 5) * 4);
    const snapped = new Uint8Array(W * H);
    snapped[4 * W + 5] = 1;
    // a snap outside the figure changes nothing
    snapped[9 * W + 9] = 1;
    outlineSilhouette(d, W, H, snapped);
    expect(isInk(d, 5, 4)).toBe(true);
    expect(at(d, 9, 9)[3]).toBe(0);
    expect(at(d, 4, 4)).toEqual([...FILL, 255]);
  });
});
