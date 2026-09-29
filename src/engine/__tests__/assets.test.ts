import { describe, expect, test } from "vitest";
import { CHARACTER_SHEET, ImageStore, sceneImages } from "../assets";
import { SCENES } from "../scenes";

describe("image preloading", () => {
  test("a frame waits for every image it draws", () => {
    const store = new ImageStore();
    expect(store.ready([])).toBe(true);
    const urls = [...sceneImages(SCENES.zurich), CHARACTER_SHEET.image];
    expect(urls.length).toBeGreaterThan(2);
    expect(store.ready(urls)).toBe(false);
  });

  test("every scene lists its background, sprites, and strips", () => {
    for (const scene of Object.values(SCENES)) {
      const urls = sceneImages(scene);
      expect(urls).toContain(scene.background);
      for (const a of scene.animations ?? []) expect(urls).toContain(a.strip);
      for (const o of [...scene.objects, ...scene.exits]) {
        if (o.sprite) expect(urls).toContain(o.sprite);
      }
    }
  });
});
