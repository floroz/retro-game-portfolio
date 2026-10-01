import { describe, expect, test } from "vitest";
import { preloadTiers } from "../preload";
import { allImages } from "../runtime";
import { sceneImages } from "../assets";
import { SCENES } from "../scenes";

describe("preload order", () => {
  const tiers = preloadTiers();
  const urls = tiers.flatMap((tier) => tier.urls);

  test("lists every image once", () => {
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("covers every image the scenes and the travel map draw", () => {
    for (const url of allImages()) expect(urls).toContain(url);
  });

  test("loads the title card, then the Hall, before anything else", () => {
    expect(tiers[0].urls).toHaveLength(1);
    expect(tiers[0].urls[0]).toMatch(/boarding-pass/);
    const launch = [...tiers[0].urls, ...tiers[1].urls];
    for (const url of sceneImages(SCENES.hall)) expect(launch).toContain(url);
    expect(tiers.slice(0, 2).every((tier) => tier.priority === "high")).toBe(
      true,
    );
  });

  test("ends with the inspection cards", () => {
    expect(tiers.at(-1)?.urls.every((url) => /\.webp/.test(url))).toBe(true);
  });
});
