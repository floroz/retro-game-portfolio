/**
 * Scene registry. Loading convention: each scene lives in
 * `src/config/scenes/<id>.ts` and exports `<ID>_SCENE: SceneData`
 * (`HALL_SCENE`, `LONDON_SCENE`, `ZURICH_SCENE`, `SORRENTO_SCENE`);
 * `travel-map.ts` exports `TRAVEL_MAP: TravelMapData`. Build tasks replace
 * those files; this registry and the engine stay as they are.
 */
import { HALL_SCENE } from "../config/scenes/hall";
import { LONDON_SCENE } from "../config/scenes/london";
import { SORRENTO_SCENE } from "../config/scenes/sorrento";
import { TRAVEL_MAP } from "../config/scenes/travel-map";
import { ZURICH_SCENE } from "../config/scenes/zurich";
import type { SceneRegistry } from "./SceneEngine";
import type { TravelMapData } from "./types";
import { remasterMap, remasterScene } from "./artwork";

export const ORIGINAL_SCENES: SceneRegistry = {
  hall: HALL_SCENE,
  london: LONDON_SCENE,
  zurich: ZURICH_SCENE,
  sorrento: SORRENTO_SCENE,
};

export const SCENES: SceneRegistry = {
  hall: remasterScene(HALL_SCENE),
  london: remasterScene(LONDON_SCENE),
  zurich: remasterScene(ZURICH_SCENE),
  sorrento: remasterScene(SORRENTO_SCENE),
};

export const ORIGINAL_TRAVEL_MAP: TravelMapData = TRAVEL_MAP;
export const TRAVEL_MAP_DATA: TravelMapData = remasterMap(TRAVEL_MAP);
