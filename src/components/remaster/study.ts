import {
  CHARACTER_RIG,
  CHARACTER_SHEET,
  ImageStore,
  densityRules,
  sceneImages,
} from "../../engine/assets";
import { SCENES, TRAVEL_MAP_DATA } from "../../engine/scenes";
import { SceneEngine } from "../../engine/SceneEngine";
import type { SceneData } from "../../engine/types";

const originals = import.meta.glob<string>("../../assets/scenes/hall/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const recovered = import.meta.glob<string>("../../assets/remaster/hall/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const replacements = new Map(
  Object.entries(originals).flatMap(([path, url]) => {
    const replacement = recovered[path.replace("/scenes/", "/remaster/")];
    return replacement ? [[url, replacement] as const] : [];
  }),
);
const replace = (url: string) => replacements.get(url) ?? url;

/** Only asset URLs change. Geometry, depth, effects, timings and content are shared. */
const remastered: SceneData = {
  ...SCENES.hall,
  background: replace(SCENES.hall.background),
  objects: SCENES.hall.objects.map((object) => ({
    ...object,
    sprite: object.sprite && replace(object.sprite),
  })),
  animations: SCENES.hall.animations?.map((animation) => ({
    ...animation,
    strip: replace(animation.strip),
  })),
  props: SCENES.hall.props?.map((prop) => ({
    ...prop,
    sprite: replace(prop.sprite),
  })),
};

export function createStudy(smooth: boolean) {
  const scenes = { ...SCENES, hall: smooth ? remastered : SCENES.hall };
  const images = new ImageStore(
    densityRules(Object.values(scenes), TRAVEL_MAP_DATA, CHARACTER_SHEET),
  );
  const engine = new SceneEngine({
    scenes,
    travelMap: TRAVEL_MAP_DATA,
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
