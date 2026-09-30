/**
 * The one engine instance for the page, wired to the game store. It lives
 * outside React so the visitor stays where they were when the content
 * screen or the game window closes and reopens. The store still starts
 * fresh on every page load.
 */
import { useGameStore } from "../store/gameStore";
import {
  CHARACTER_RIG,
  CHARACTER_SHEET,
  ImageStore,
  densityRules,
  sceneImages,
  travelMapImages,
} from "./assets";
import { SceneAudio } from "./audio";
import { SceneEngine } from "./SceneEngine";
import { SCENES, TRAVEL_MAP_DATA } from "./scenes";

/** Music, ambience, and effects for the scene engine (desktop only). */
export const sceneAudio = new SceneAudio();

let engine: SceneEngine | null = null;

export function getEngine(): SceneEngine {
  if (!engine) {
    engine = new SceneEngine({
      scenes: SCENES,
      travelMap: TRAVEL_MAP_DATA,
      sheet: CHARACTER_SHEET,
      rig: CHARACTER_RIG,
      // Scenes built to the Phase H world scale (`farHeight`, `nearHeight`)
      // draw the rig; the rest keep the sprite sheet until they're rebuilt.
      host: {
        openSection: (section) =>
          useGameStore.getState().openTerminalScreen(section),
        openInspection: (inspection) =>
          useGameStore.getState().openInspection(inspection),
        sceneChanged: (scene) => useGameStore.getState().setCurrentScene(scene),
        skippableChanged: (skippable) => useGameStore.setState({ skippable }),
        flightChanged: (flyingTo) => useGameStore.setState({ flyingTo }),
        sound: (name) => sceneAudio.play(name),
      },
    });
  }
  return engine;
}

export const images = new ImageStore(
  densityRules(Object.values(SCENES), TRAVEL_MAP_DATA, CHARACTER_SHEET),
);

/** Every image in the game, for preloading before the first frame. */
export function allImages(): string[] {
  return [
    ...new Set([
      CHARACTER_SHEET.image,
      ...(CHARACTER_RIG ? [CHARACTER_RIG.image] : []),
      ...Object.values(SCENES).flatMap(sceneImages),
      ...travelMapImages(TRAVEL_MAP_DATA),
    ]),
  ];
}
