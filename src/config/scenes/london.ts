/**
 * PLACEHOLDER scene data for London, written by E1 against F1's
 * placeholder art so the engine runs end to end. Task B3 replaces this whole
 * file; keep the export name (`LONDON_SCENE`) and the `SceneData` type.
 * Check positions with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import type { SceneData } from "../../engine/types";
import londonBg from "../../assets/scenes/london/bg.png";
import londonFg from "../../assets/scenes/london/fg.png";
import londonObjPlaceholder from "../../assets/scenes/london/obj-placeholder.png";
import londonAnimPlaceholder from "../../assets/scenes/london/anim-placeholder.png";

export const LONDON_SCENE: SceneData = {
  id: "london",
  name: "London",
  background: londonBg,
  foreground: londonFg,
  // Loop points from assets-src/provenance/music-london.json and
  // ambience-london.json.
  music: { src: "/audio/music/london.mp3", loopStart: 0.5, loopEnd: 72.5 },
  ambience: {
    src: "/audio/ambience/london.mp3",
    loopStart: 0.5,
    loopEnd: 32.5,
  },
  floor: "wood",
  walkbox: [
    [4, 102],
    [316, 102],
    [316, 158],
    [4, 158],
  ],
  depth: { farY: 102, nearY: 158, farScale: 0.7, nearScale: 1.0 },
  entryPoints: { fromHall: { x: 296, y: 112, facing: "w" } },
  entryLine:
    "London, where I learned the trade. The skills are on the chalkboard.",
  objects: [
    {
      id: "chalkboard",
      name: "chalkboard menu",
      hotspot: { x: 14, y: 18, w: 66, h: 64 },
      interactionPoint: { x: 47, y: 106, facing: "n" },
      action: "skills",
      look: "Today's specials, chalked up fresh. Everything's on tap.",
    },
    {
      id: "bar",
      name: "bar counter",
      sprite: londonObjPlaceholder,
      x: 130,
      y: 106,
      baselineY: 133,
      look: "Polished by a century of elbows.",
      use: "I'd lean on it, but I'm on the clock.",
    },
    {
      id: "window",
      name: "window",
      hotspot: { x: 110, y: 14, w: 88, h: 58 },
      look: "Rain on the City. St Paul's, the Gherkin, the Shard, and a bus that's always late.",
    },
  ],
  animations: [
    {
      id: "placeholder",
      strip: londonAnimPlaceholder,
      frames: 2,
      x: 176,
      y: 30,
      frameMs: 400,
    },
  ],
  slots: [
    {
      id: "taps",
      kind: "tap",
      source: "skills:groups",
      positions: [
        [206, 76],
        [215, 76],
        [224, 76],
        [233, 76],
        [242, 76],
        [251, 76],
        [260, 76],
        [269, 76],
      ],
      fold: "slot-tap-more",
    },
    {
      id: "job-photos",
      kind: "photo-frame",
      source: "jobs:london",
      positions: [
        [206, 22],
        [230, 22],
        [254, 22],
        [206, 48],
        [230, 48],
        [254, 48],
      ],
      fold: "slot-photo-frame-more",
    },
  ],
  labels: [{ id: "menu", source: "skills:menu", x: 18, y: 22, font: "small" }],
  exits: [
    {
      id: "door-hall",
      to: "hall",
      entry: "fromLondon",
      name: "the airport",
      hotspot: { x: 286, y: 32, w: 30, h: 68 },
      interactionPoint: { x: 300, y: 108, facing: "e" },
    },
  ],
};
