/**
 * PLACEHOLDER scene data for Sorrento, written by E1 against F1's
 * placeholder art so the engine runs end to end. Task B4 replaces this whole
 * file; keep the export name (`SORRENTO_SCENE`) and the `SceneData` type.
 * Check positions with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import type { SceneData } from "../../engine/types";
import sorrentoBg from "../../assets/scenes/sorrento/bg.png";
import sorrentoFg from "../../assets/scenes/sorrento/fg.png";
import sorrentoObjPlaceholder from "../../assets/scenes/sorrento/obj-placeholder.png";
import sorrentoAnimPlaceholder from "../../assets/scenes/sorrento/anim-placeholder.png";

export const SORRENTO_SCENE: SceneData = {
  id: "sorrento",
  name: "Sorrento",
  background: sorrentoBg,
  foreground: sorrentoFg,
  music: "/audio/music/sorrento.mp3",
  ambience: "/audio/ambience/sorrento.mp3",
  floor: "tile",
  walkbox: [
    [4, 102],
    [316, 102],
    [316, 158],
    [4, 158],
  ],
  depth: { farY: 102, nearY: 158, farScale: 0.7, nearScale: 1.0 },
  entryPoints: { fromHall: { x: 296, y: 112, facing: "w" } },
  entryLine:
    "Sorrento: now and next. About me is on the fridge, and the phone is for Contact.",
  objects: [
    {
      id: "fridge",
      name: "fridge door",
      hotspot: { x: 18, y: 28, w: 36, h: 72 },
      interactionPoint: { x: 36, y: 106, facing: "n" },
      action: "about",
      look: "Photos, postcards, and a magnet shaped like a lemon. My life, alphabetised by fridge.",
    },
    {
      id: "phone",
      name: "wall phone",
      hotspot: { x: 230, y: 44, w: 14, h: 26 },
      interactionPoint: { x: 237, y: 106, facing: "n" },
      action: "contact",
      look: "A wall phone with a curly cord. It only rings for good news.",
    },
    {
      id: "table",
      name: "table with two espresso cups",
      sprite: sorrentoObjPlaceholder,
      x: 140,
      y: 110,
      baselineY: 137,
      look: "Two espresso cups: one for me, one for you. Let's talk.",
    },
    {
      id: "window",
      name: "window",
      hotspot: { x: 110, y: 14, w: 88, h: 58 },
      look: "The Gulf of Naples: Vesuvius, Ischia, and a ferry that runs on Italian time.",
    },
  ],
  animations: [
    {
      id: "placeholder",
      strip: sorrentoAnimPlaceholder,
      frames: 2,
      x: 176,
      y: 30,
      frameMs: 300,
    },
  ],
  slots: [
    {
      id: "magnets",
      kind: "magnet",
      source: "jobs:italy",
      positions: [
        [22, 36],
        [32, 36],
        [42, 36],
        [22, 48],
        [32, 48],
        [42, 48],
      ],
      fold: "slot-magnet-more",
    },
  ],
  labels: [],
  exits: [
    {
      id: "door-hall",
      to: "hall",
      entry: "fromSorrento",
      name: "the airport",
      hotspot: { x: 286, y: 32, w: 30, h: 68 },
      interactionPoint: { x: 300, y: 108, facing: "e" },
    },
  ],
};
