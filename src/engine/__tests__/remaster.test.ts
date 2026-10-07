/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { sceneImages, travelMapImages } from "../assets";
import {
  SCENES,
  ORIGINAL_SCENES,
  TRAVEL_MAP_DATA,
  ORIGINAL_TRAVEL_MAP,
} from "../scenes";

function size(url: string) {
  const path = url.replace(/^\//, "").split("?")[0];
  const png = readFileSync(path);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("remaster registration", () => {
  test.each(Object.keys(SCENES) as (keyof typeof SCENES)[])(
    "%s keeps its navigation and interaction geometry",
    (id) => {
      const scene = SCENES[id];
      const original = ORIGINAL_SCENES[id];
      expect(scene.walkbox).toBe(original.walkbox);
      expect(scene.depth).toBe(original.depth);
      expect(scene.entryPoints).toBe(original.entryPoints);
      for (const [index, object] of scene.objects.entries()) {
        expect(object.hotspot).toBe(original.objects[index].hotspot);
        expect(object.interactionPoint).toBe(
          original.objects[index].interactionPoint,
        );
      }
      for (const [index, exit] of scene.exits.entries()) {
        expect(exit.hotspot).toBe(original.exits[index].hotspot);
        expect(exit.interactionPoint).toBe(
          original.exits[index].interactionPoint,
        );
      }
    },
  );

  test("every scene and map image uses a registered density-4 export", () => {
    const urls = new Set([
      ...Object.values(SCENES).flatMap(sceneImages),
      ...travelMapImages(TRAVEL_MAP_DATA),
    ]);
    for (const url of urls) {
      expect(url).toContain("/assets/remaster/");
      const original = url.includes("/remaster/shared/")
        ? url.replace("/remaster/shared/", "/shared/")
        : url.replace("/remaster/", "/scenes/");
      const before = size(original);
      const after = size(url);
      expect(after, url).toEqual({
        width: before.width * 2,
        height: before.height * 2,
      });
    }
    expect(TRAVEL_MAP_DATA.markers).toBe(ORIGINAL_TRAVEL_MAP.markers);
    expect(TRAVEL_MAP_DATA.routes).toBe(ORIGINAL_TRAVEL_MAP.routes);
  });
});
