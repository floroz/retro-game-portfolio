import { describe, expect, test } from "vitest";
import { backingSize } from "../backing";
import { hdPreviewScene } from "../dev/hdPreview";
import { SCENES } from "../scenes";

describe("canvas backing store", () => {
  test("pixel-art frames keep the 640x320 canvas at any display size", () => {
    expect(backingSize(false)).toEqual({ w: 640, h: 320, smooth: false });
    expect(backingSize(false, { w: 1280, h: 640, dpr: 2 })).toEqual({
      w: 640,
      h: 320,
      smooth: false,
    });
  });

  test("HD frames are backed at display resolution", () => {
    expect(backingSize(true, { w: 1280, h: 640, dpr: 1 })).toEqual({
      w: 1280,
      h: 640,
      smooth: true,
    });
    // A Retina screen gets twice the pixels.
    expect(backingSize(true, { w: 1280, h: 640, dpr: 2 })).toEqual({
      w: 2560,
      h: 1280,
      smooth: true,
    });
    // The Win95 window scaled the game down to 70%.
    expect(backingSize(true, { w: 896, h: 448, dpr: 2 })).toEqual({
      w: 1792,
      h: 896,
      smooth: true,
    });
  });

  test("HD keeps the 2:1 aspect and sane bounds", () => {
    const odd = backingSize(true, { w: 1001, h: 500, dpr: 1.5 });
    expect(odd.h).toBe(Math.round(odd.w / 2));
    // Hidden (zero size) or unknown: the art's own 1280x640.
    expect(backingSize(true, { w: 0, h: 0, dpr: 2 }).w).toBe(1280);
    expect(backingSize(true).w).toBe(1280);
    expect(backingSize(true, { w: 100, h: 50, dpr: 1 }).w).toBe(640);
    expect(backingSize(true, { w: 5000, h: 2500, dpr: 3 }).w).toBe(3840);
  });
});

describe("dev HD preview", () => {
  test("swaps every image in the scene for its dev-hd stand-in", () => {
    const hd = hdPreviewScene(SCENES.zurich);
    expect(hd.background).toMatch(/^\/dev-hd\/zurich\/bg\.png$/);
    const urls = [
      hd.background,
      hd.foreground,
      ...hd.objects.flatMap((o) => [
        o.sprite,
        ...Object.values(o.states ?? {}),
      ]),
      ...hd.exits.flatMap((e) => [e.sprite, ...Object.values(e.states ?? {})]),
      ...(hd.animations ?? []).map((a) => a.strip),
    ].filter((u) => u !== undefined);
    expect(urls.length).toBeGreaterThan(5);
    for (const url of urls) expect(url).toMatch(/^\/dev-hd\/zurich\//);
    // The Phase H world scale, as the HB builds will set it.
    expect(hd.depth).toMatchObject({ farHeight: 58, nearHeight: 72 });
    // Everything else is the same scene.
    expect(hd.walkbox).toBe(SCENES.zurich.walkbox);
    expect(hd.objects.map((o) => o.id)).toEqual(
      SCENES.zurich.objects.map((o) => o.id),
    );
  });
});
