/**
 * PLACEHOLDER scene data for the Hall, written by E1 against F1's
 * placeholder art so the engine runs end to end. Task B2 replaces this whole
 * file; keep the export name (`HALL_SCENE`) and the `SceneData` type.
 * Check positions with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import type { SceneData } from "../../engine/types";
import hallBg from "../../assets/scenes/hall/bg.png";
import hallFg from "../../assets/scenes/hall/fg.png";
import hallObjPlaceholder from "../../assets/scenes/hall/obj-placeholder.png";
import hallAnimPlaceholder from "../../assets/scenes/hall/anim-placeholder.png";

export const HALL_SCENE: SceneData = {
  id: "hall",
  name: "the airport",
  background: hallBg,
  foreground: hallFg,
  // Loop points from assets-src/provenance/music-hall.json.
  music: { src: "/audio/music/hall.mp3", loopStart: 0.6, loopEnd: 77.4 },
  // Loop points from assets-src/provenance/ambience-hall.json.
  ambience: { src: "/audio/ambience/hall.mp3", loopStart: 0.5, loopEnd: 40.5 },
  floor: "carpet",
  walkbox: [
    [4, 102],
    [316, 102],
    [316, 158],
    [4, 158],
  ],
  depth: { farY: 102, nearY: 158, farScale: 0.7, nearScale: 1.0 },
  entryPoints: {
    start: { x: 160, y: 140, facing: "s" },
    fromLondon: { x: 35, y: 110, facing: "s" },
    fromZurich: { x: 75, y: 110, facing: "s" },
    fromSorrento: { x: 295, y: 110, facing: "s" },
  },
  objects: [
    {
      id: "seats",
      name: "row of seats",
      sprite: hallObjPlaceholder,
      x: 140,
      y: 104,
      baselineY: 131,
      look: "Airport seating: designed by someone who has never sat down.",
    },
    ...(
      [
        ["experience", "Aged Experience, since 2016", 204],
        ["skills", "Skills Sampler Pack", 219],
        ["about", "Eau de Daniele", 234],
        ["contact", "Postcard Home", 249],
        ["resume", "Eau de Résumé", 264],
      ] as const
    ).map(([action, name, x]) => ({
      id: `duty-free-${action}`,
      name,
      hotspot: { x, y: 64, w: 12, h: 24 },
      interactionPoint: { x: x + 6, y: 106, facing: "n" as const },
      action,
      look: `${name}. Duty free, and free of duty.`,
    })),
  ],
  animations: [
    {
      id: "placeholder",
      strip: hallAnimPlaceholder,
      frames: 2,
      x: 176,
      y: 30,
      frameMs: 500,
    },
  ],
  labels: [
    {
      id: "gate-london",
      source: "gate:london",
      x: 35,
      y: 4,
      align: "center",
      font: "small",
    },
    {
      id: "gate-zurich",
      source: "gate:zurich",
      x: 75,
      y: 4,
      align: "center",
      font: "small",
    },
    {
      id: "gate-sorrento",
      source: "gate:sorrento",
      x: 295,
      y: 4,
      align: "center",
      font: "small",
    },
    { id: "departures", source: "departures", x: 116, y: 20, font: "small" },
    {
      id: "duty-free",
      source: "text:Duty free",
      x: 240,
      y: 52,
      align: "center",
      font: "small",
    },
    ...(["experience", "skills", "about", "contact", "resume"] as const).map(
      (s, i) => ({
        id: `duty-free-${s}`,
        source: `text:{${s}}` as const,
        x: 207 + i * 15,
        y: 72,
        font: "small" as const,
      }),
    ),
  ],
  exits: [
    {
      id: "gate-london",
      to: "london",
      entry: "fromHall",
      hotspot: { x: 20, y: 32, w: 30, h: 68 },
      interactionPoint: { x: 35, y: 106, facing: "n" },
    },
    {
      id: "gate-zurich",
      to: "zurich",
      entry: "fromHall",
      hotspot: { x: 60, y: 32, w: 30, h: 68 },
      interactionPoint: { x: 75, y: 106, facing: "n" },
    },
    {
      id: "gate-sorrento",
      to: "sorrento",
      entry: "fromHall",
      hotspot: { x: 280, y: 32, w: 30, h: 68 },
      interactionPoint: { x: 295, y: 106, facing: "n" },
    },
  ],
};
