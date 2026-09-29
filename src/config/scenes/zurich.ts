/**
 * PLACEHOLDER scene data for Zurich, written by E1 against F1's
 * placeholder art so the engine runs end to end. Task B1 replaces this whole
 * file; keep the export name (`ZURICH_SCENE`) and the `SceneData` type.
 * Check positions with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import type { SceneData } from "../../engine/types";
import zurichBg from "../../assets/scenes/zurich/bg.png";
import zurichFg from "../../assets/scenes/zurich/fg.png";
import zurichObjPlaceholder from "../../assets/scenes/zurich/obj-placeholder.png";
import zurichAnimPlaceholder from "../../assets/scenes/zurich/anim-placeholder.png";

export const ZURICH_SCENE: SceneData = {
  id: "zurich",
  name: "Zurich",
  background: zurichBg,
  foreground: zurichFg,
  music: "/audio/music/zurich.mp3",
  ambience: "/audio/ambience/zurich.mp3",
  floor: "carpet",
  walkbox: [
    [4, 102],
    [316, 102],
    [316, 158],
    [4, 158],
  ],
  depth: { farY: 102, nearY: 158, farScale: 0.7, nearScale: 1.0 },
  entryPoints: { fromHall: { x: 296, y: 112, facing: "w" } },
  entryLine:
    "Zurich, where the career grew. Experience is on the CRT, and my resume is in the filing cabinet.",
  objects: [
    {
      id: "crt",
      name: "CRT workstation",
      sprite: zurichObjPlaceholder,
      x: 140,
      y: 108,
      baselineY: 135,
      interactionPoint: { x: 160, y: 144, facing: "n" },
      action: "experience",
      look: "A beige CRT, humming with ten years of commit history.",
    },
    {
      id: "cabinet",
      name: "filing cabinet",
      hotspot: { x: 244, y: 56, w: 30, h: 44 },
      interactionPoint: { x: 259, y: 106, facing: "n" },
      action: "resume",
      look: "Filed under R, for Resume. Also for Really well organised.",
    },
    {
      id: "window",
      name: "window",
      hotspot: { x: 110, y: 14, w: 88, h: 58 },
      look: "Lake Zurich by moonlight, and the Alps pretending they're not showing off.",
    },
  ],
  animations: [
    {
      id: "placeholder",
      strip: zurichAnimPlaceholder,
      frames: 2,
      x: 176,
      y: 30,
      frameMs: 700,
    },
  ],
  slots: [
    {
      id: "job-photos",
      kind: "photo-frame",
      source: "jobs:switzerland",
      positions: [
        [14, 20],
        [38, 20],
        [62, 20],
        [14, 46],
        [38, 46],
        [62, 46],
      ],
      fold: "slot-photo-frame-more",
    },
  ],
  labels: [
    {
      id: "cabinet",
      source: "section:resume",
      x: 259,
      y: 48,
      align: "center",
      font: "small",
    },
  ],
  exits: [
    {
      id: "door-hall",
      to: "hall",
      entry: "fromZurich",
      name: "the airport",
      hotspot: { x: 286, y: 32, w: 30, h: 68 },
      interactionPoint: { x: 300, y: 108, facing: "e" },
    },
  ],
};
