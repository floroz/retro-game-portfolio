/**
 * Quick checks on one scene's data, shown in the dev overlay's HUD so a
 * build task sees a mistake while placing things (the unit tests in
 * src/engine/__tests__/scenes.test.ts enforce the same rules).
 */
import { SECTIONS, isCountryScene } from "../config/sections";
import { pointInPolygon } from "./geometry";
import type { SceneRegistry } from "./SceneEngine";
import type { SceneData, StandPoint } from "./types";

export function sceneWarnings(
  scene: SceneData,
  scenes: SceneRegistry,
): string[] {
  const out: string[] = [];
  const walkable = (p: StandPoint) => pointInPolygon([p.x, p.y], scene.walkbox);
  if (scene.walkbox.length < 3) out.push("walkbox needs at least 3 points");
  const { depth } = scene;
  const heights = [depth.farHeight, depth.nearHeight];
  const scales = [depth.farScale, depth.nearScale];
  if (heights.some((h) => h !== undefined) && heights.includes(undefined)) {
    out.push("depth needs both farHeight and nearHeight");
  }
  if (heights.includes(undefined) && scales.includes(undefined)) {
    out.push("depth needs farHeight and nearHeight, or farScale and nearScale");
  }
  for (const [key, p] of Object.entries(scene.entryPoints)) {
    if (!walkable(p)) out.push(`entry ${key} is off the walkbox`);
  }
  for (const o of scene.objects) {
    if (o.interactionPoint && !walkable(o.interactionPoint)) {
      out.push(`${o.id}: interaction point is off the walkbox`);
    }
    if (o.sprite && (o.x === undefined || o.y === undefined)) {
      out.push(`${o.id}: a sprite needs x and y`);
    }
    if (!o.sprite && !o.hotspot)
      out.push(`${o.id}: needs a sprite or a hotspot`);
  }
  for (const e of scene.exits) {
    if (!walkable(e.interactionPoint)) {
      out.push(`${e.id}: interaction point is off the walkbox`);
    }
    if (!scenes[e.to]?.entryPoints[e.entry]) {
      out.push(`${e.id}: ${e.to} has no entry "${e.entry}"`);
    }
  }
  if (isCountryScene(scene.id)) {
    for (const [section, info] of Object.entries(SECTIONS)) {
      if (
        info.home === scene.id &&
        !scene.objects.some((o) => o.action === section)
      ) {
        out.push(`no primary object for ${section}`);
      }
    }
    if (!scene.entryPoints.fromHall) out.push("needs a fromHall entry");
  } else if (!scene.entryPoints.start) {
    out.push("needs a start entry");
  }
  return out;
}
