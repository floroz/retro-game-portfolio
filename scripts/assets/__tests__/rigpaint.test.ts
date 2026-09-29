// @vitest-environment node
import { describe, expect, test } from "vitest";
import { RIG_INK } from "../../../src/engine/rigTypes";
import { createImage, type Image } from "../lib";
import {
  analyseSpans,
  createBuf,
  finish,
  inPolygon,
  inTube,
  paintElement,
  ramp,
  tidySilhouette,
  tone,
  toImage,
  tubeHalf,
  tubeMap,
  type TubeShape,
} from "../rigpaint";

/** A sheet with a navy rectangle with an ink outline and a black stripe. */
function sleeve(): Image {
  const img = createImage(60, 100);
  for (let y = 10; y < 90; y++) {
    for (let x = 10; x < 50; x++) {
      const edge = x < 14 || x >= 46 || y < 14 || y >= 86;
      const stripe = y >= 40 && y < 46 && !edge;
      const p = (y * 60 + x) * 4;
      const c = edge || stripe ? [0, 0, 0] : [30, 44, 90];
      img.data.set([...c, 255], p);
    }
  }
  return img;
}

const TUBE: TubeShape = {
  cx: 0,
  yTop: 0,
  yBot: 20,
  widths: [
    [0, 8],
    [20, 6],
  ],
  capTop: 4,
  capBot: 0,
};

describe("shapes", () => {
  test("ramp holds beyond its ends and interpolates between", () => {
    const stops = [
      [0, 10],
      [10, 20],
    ] as const;
    expect(ramp(stops, -5)).toBe(10);
    expect(ramp(stops, 5)).toBe(15);
    expect(ramp(stops, 50)).toBe(20);
  });

  test("a tube tapers, rounds its capped end and stays flat at the other", () => {
    expect(tubeHalf(TUBE, 10)).toBeCloseTo((8 + (6 - 8) * 0.5) / 2);
    expect(tubeHalf(TUBE, 0.1)).toBeLessThan(tubeHalf(TUBE, 4));
    expect(tubeHalf(TUBE, 19.9)).toBeCloseTo(3.0, 1);
    expect(tubeHalf(TUBE, -1)).toBe(0);
    expect(inTube(TUBE, 3.5, 10)).toBe(true);
    expect(inTube(TUBE, 4.5, 10)).toBe(false);
  });

  test("point in polygon", () => {
    const tri: [number, number][] = [
      [0, 0],
      [10, 0],
      [0, 10],
    ];
    expect(inPolygon(tri, 2, 2)).toBe(true);
    expect(inPolygon(tri, 8, 8)).toBe(false);
  });
});

describe("painting an element", () => {
  const raw = sleeve();
  const spans = analyseSpans(raw, 3);

  test("finds the sheet's outline thickness", () => {
    expect(spans.band).toBe(4);
  });

  test("samples fill without the sheet's ink, and keeps drawn detail as ink", () => {
    const buf = createBuf(-6, -1, 12, 24);
    paintElement(buf, {
      id: 1,
      raw,
      map: tubeMap(TUBE, spans, [20, 80]),
      inside: (x, y) => inTube(TUBE, x, y),
    });
    finish(buf);
    const img = toImage(buf);
    const px = (x: number, y: number) => {
      const p = ((y - buf.y0) * buf.w + (x - buf.x0)) * 4;
      return [...img.data.subarray(p, p + 4)];
    };
    // Fill: the sheet's navy, not darkened by its outline.
    expect(px(0, 9)).toEqual([30, 44, 90, 255]);
    // The stripe crosses the tube's middle as ink.
    const inkRows = [];
    for (let y = 0; y < 20; y++)
      if (px(0, y)[0] === RIG_INK[0] && px(-1, y)[0] === RIG_INK[0])
        inkRows.push(y);
    expect(inkRows.length).toBeGreaterThan(0);
    // The sides carry the 1 px ring.
    expect(px(-3, 10).slice(0, 3)).toEqual([...RIG_INK]);
    expect(px(-2, 10)).toEqual([30, 44, 90, 255]);
  });

  test("rings the silhouette except in the open zone", () => {
    const buf = createBuf(-6, -1, 12, 24);
    paintElement(buf, {
      id: 1,
      raw,
      map: tubeMap(TUBE, spans, [20, 80]),
      inside: (x, y) => inTube(TUBE, x, y),
      fillOnly: true,
    });
    finish(buf, { open: (_x, y) => y < 4 });
    const ringed = (x: number, y: number) =>
      buf.ring[(y - buf.y0) * buf.w + (x - buf.x0)] === 1;
    expect(ringed(-3, 10)).toBe(true);
    // The rounded top end is left open: it blends into its neighbour.
    for (let x = -3; x < 3; x++) expect(ringed(x, 0)).toBe(false);
    // The bottom end is a flat edge with a ring.
    expect(ringed(0, 19)).toBe(true);
  });

  test("tone shades fill and leaves ink alone", () => {
    const buf = createBuf(-6, -1, 12, 24);
    paintElement(buf, {
      id: 1,
      raw,
      map: tubeMap(TUBE, spans, [20, 80]),
      inside: (x, y) => inTube(TUBE, x, y),
      fillOnly: true,
    });
    const before = buf.r[(10 - buf.y0) * buf.w + (0 - buf.x0)];
    tone(buf, () => true, 0.5);
    expect(buf.r[(10 - buf.y0) * buf.w + (0 - buf.x0)]).toBeCloseTo(before / 2);
  });

  test("tidying drops spurs and fills notches", () => {
    const buf = createBuf(0, 0, 8, 8);
    for (let y = 1; y < 7; y++)
      for (let x = 1; x < 7; x++) {
        buf.inside[y * 8 + x] = 1;
        buf.owner[y * 8 + x] = 1;
      }
    buf.inside[0 * 8 + 3] = 1; // a spur on the top edge
    buf.inside[3 * 8 + 1] = 0; // a notch in the left edge
    tidySilhouette(buf);
    expect(buf.inside[0 * 8 + 3]).toBe(0);
    expect(buf.inside[3 * 8 + 1]).toBe(1);
  });
});
