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
import { withDemoEffects } from "./dev/effectsDemo";
import { HD_PREVIEW, hdPreviewScene } from "./dev/hdPreview";
import type { SceneRegistry } from "./SceneEngine";
import type { SceneData, TravelMapData } from "./types";

/**
 * The scene, or under `npm run dev` with `?hd=<scene>`, its Phase H preview:
 * the world scale, plus a demo of the effects and moving props.
 */
const preview = (scene: SceneData) =>
  import.meta.env.DEV && HD_PREVIEW === scene.id
    ? withDemoEffects(hdPreviewScene(scene))
    : scene;

export const SCENES: SceneRegistry = {
  hall: preview(HALL_SCENE),
  london: preview(LONDON_SCENE),
  zurich: preview(ZURICH_SCENE),
  sorrento: preview(SORRENTO_SCENE),
};

export const TRAVEL_MAP_DATA: TravelMapData = TRAVEL_MAP;
