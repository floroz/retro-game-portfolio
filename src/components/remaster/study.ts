import {
  CHARACTER_RIG,
  CHARACTER_SHEET,
  ImageStore,
  densityRules,
  sceneImages,
} from "../../engine/assets";
import {
  ORIGINAL_SCENES,
  ORIGINAL_TRAVEL_MAP,
  SCENES,
  TRAVEL_MAP_DATA,
} from "../../engine/scenes";
import { SceneEngine } from "../../engine/SceneEngine";

export function createStudy(smooth: boolean) {
  const scenes = smooth ? SCENES : ORIGINAL_SCENES;
  const map = smooth ? TRAVEL_MAP_DATA : ORIGINAL_TRAVEL_MAP;
  const images = new ImageStore(
    densityRules(Object.values(scenes), map, CHARACTER_SHEET),
  );
  const engine = new SceneEngine({
    scenes,
    travelMap: map,
    sheet: CHARACTER_SHEET,
    rig: CHARACTER_RIG,
    rng: () => 0.5,
    host: { openSection() {}, sceneChanged() {} },
  });
  engine.update(0);
  engine.speech = null;
  const urls = [
    ...sceneImages(scenes.hall),
    CHARACTER_SHEET.image,
    ...(CHARACTER_RIG ? [CHARACTER_RIG.image] : []),
  ];
  return { engine, images, urls, smooth };
}

export type Study = ReturnType<typeof createStudy>;
