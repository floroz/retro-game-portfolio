/** Daytime Zürich chalet: fondue, a career album, and a curious garden neighbour.
 * Coordinates are logical 320x160 pixels. Art is authored at density 2;
 * remaster twins preserve that pixel grid at density 4. The bar, stool and
 * table have separate footprints and depth lines; the cow stays outside.
 */
import { HD_WORLD_SCALE } from "../../engine/constants";
import type { SceneData } from "../../engine/types";
import bg from "../../assets/scenes/zurich/bg.png";
import bar from "../../assets/scenes/zurich/obj-fondue-bar.png";
import fondue from "../../assets/scenes/zurich/obj-fondue.png";
import stool from "../../assets/scenes/zurich/obj-stool.png";
import table from "../../assets/scenes/zurich/obj-table.png";
import album from "../../assets/scenes/zurich/obj-album.png";
import satchel from "../../assets/scenes/zurich/obj-satchel.png";
import satchelOpen from "../../assets/scenes/zurich/obj-satchel@open.png";
import door from "../../assets/scenes/zurich/obj-door.png";
import cow from "../../assets/scenes/zurich/anim-garden-cow.png";
import boat from "../../assets/scenes/zurich/anim-boat.png";
import cuckoo from "../../assets/scenes/zurich/anim-cuckoo.png";

const BAR_BASELINE = 124;
const TABLE_BASELINE = 151;
const WATER = { x: 140, y: 55, w: 58, h: 11 };

export const ZURICH_SCENE: SceneData = {
  id: "zurich",
  name: "Zürich",
  background: bg,
  music: { src: "/audio/music/zurich.mp3", loopStart: 0.625, loopEnd: 45.625 },
  ambience: {
    src: "/audio/ambience/zurich.mp3",
    loopStart: 0.5,
    loopEnd: 30.5,
  },
  floor: "wood",
  characterShadow: { width: 0.4, depth: 0.085 },
  // The rear-left notch excludes bar/stool. A keyhole from the rear wall
  // excludes the table's feet while leaving room to walk behind and in front.
  walkbox: [
    [4, 140],
    [30, 140],
    [30, 126],
    [84, 126],
    [84, 97],
    [134, 97],
    [134, 142],
    [87, 142],
    [87, 151],
    [179, 151],
    [179, 142],
    [134, 142],
    [134, 97],
    [315, 97],
    [315, 158],
    [4, 158],
  ],
  depth: { farY: 97, nearY: 158, ...HD_WORLD_SCALE },
  entryPoints: { fromHall: { x: 287, y: 106, facing: "w" } },
  entryLine:
    "Zürich, home now. Career album, resume satchel. Fondue is a separate qualification.",
  objects: [
    {
      id: "window",
      name: "Lake Zürich and the Alps",
      hotspot: { x: 114, y: 19, w: 85, h: 48 },
      interactionPoint: { x: 195, y: 103, facing: "n" },
      look: "Snow on top, green below. Switzerland has its layers sorted.",
      use: "A lake view. Finally, a window that doesn't need updating.",
    },
    {
      id: "crockery",
      name: "fondue plates and forks",
      hotspot: { x: 13, y: 16, w: 63, h: 39 },
      interactionPoint: { x: 87, y: 127, facing: "w" },
      look: "Long forks. Short meetings. A system I can get behind.",
      use: "Lose your bread in the pot and you owe everyone a story.",
    },
    {
      id: "cuckoo",
      name: "cuckoo clock",
      hotspot: { x: 228, y: 11, w: 23, h: 35 },
      interactionPoint: { x: 239, y: 103, facing: "n" },
      look: "My most punctual colleague. Occasionally interrupts with useful feedback: cuckoo.",
      use: "Already running on Swiss time. Best leave it alone.",
    },
    {
      id: "satchel",
      name: "document satchel — resume",
      sprite: satchel,
      states: { open: satchelOpen },
      x: 230,
      y: 53,
      interactionPoint: { x: 244, y: 104, facing: "n" },
      action: "resume",
      look: "Everything a recruiter needs, with room left for a sandwich.",
      use: "The short version of the journey. Brass buckle included.",
    },
    {
      id: "garden-cow",
      name: "curious Swiss cow",
      hotspot: { x: 269, y: 59, w: 24, h: 18 },
      interactionPoint: { x: 281, y: 102, facing: "n" },
      look: "She's here for quality control. The fondue has her full attention.",
      use: "She's booked the grass suite. Excellent views, unlimited salad.",
    },
    {
      id: "fondue-bar",
      name: "fondue bar",
      sprite: bar,
      x: 0,
      y: 76,
      baselineY: BAR_BASELINE,
      groundShadows: [{ x: 40, y: 47, width: 78, depth: 5 }],
      interactionPoint: { x: 88, y: 126, facing: "w" },
      look: "A little bread, a little cheese, and absolutely no slide deck.",
      use: "The only melting pot I need after work.",
    },
    {
      id: "fondue",
      name: "bubbling cheese fondue",
      sprite: fondue,
      x: 19,
      y: 61,
      baselineY: BAR_BASELINE,
      interactionPoint: { x: 88, y: 126, facing: "w" },
      look: "A shared resource. Please acquire the fork before accessing the cheese.",
      use: "One more dip. Then I'll tell you about my career. Probably.",
    },
    {
      id: "stool",
      name: "wooden stool",
      sprite: stool,
      x: 6,
      y: 110,
      baselineY: 139,
      groundShadows: [{ x: 9, y: 28, width: 17, depth: 4 }],
      interactionPoint: { x: 35, y: 139, facing: "w" },
      look: "One seat at the fondue bar. The cow joined the waiting list.",
      use: "Save it for the guest. That's you.",
    },
    {
      id: "table",
      name: "coffee table",
      sprite: table,
      x: 88,
      y: 111,
      baselineY: TABLE_BASELINE,
      groundShadows: [{ x: 45, y: 39, width: 87, depth: 5 }],
      interactionPoint: { x: 132, y: 156, facing: "n" },
      look: "Coffee and a few chapters of my life. Make yourself comfortable.",
      use: "The album is open at the interesting bits.",
    },
    {
      id: "career-album",
      name: "travel album — experience",
      sprite: album,
      x: 113,
      y: 114,
      baselineY: TABLE_BASELINE,
      interactionPoint: { x: 141, y: 156, facing: "n" },
      action: "experience",
      look: "Sorrento, London, Zürich. Different views, plenty of things learned.",
      use: "Opening the career album. No projector required.",
    },
  ],
  animations: [
    {
      id: "garden-cow",
      strip: cow,
      frames: 6,
      frameMs: 180,
      everyMs: 8300,
      phaseMs: 2300,
      x: 269,
      y: 59,
      baselineY: 77,
      clip: { x: 267, y: 20, w: 38, h: 75 },
      freezeForReducedMotion: true,
    },
  ],
  effects: [
    {
      kind: "steam",
      id: "fondue-steam",
      hideForReducedMotion: true,
      x: 30,
      y: 70,
      everyMs: 850,
      lifeMs: 2600,
      rise: 13,
      drift: 2,
      size: 2,
      color: "#f4ecd8",
      opacity: 0.55,
      baselineY: BAR_BASELINE,
    },
    {
      kind: "glints",
      id: "lake",
      hideForReducedMotion: true,
      area: WATER,
      count: 5,
      lifeMs: 1600,
      length: 2,
      color: "#f4ecd8",
      clip: WATER,
    },
    {
      kind: "pendulum",
      id: "clock-pendulum",
      x: 239,
      y: 35,
      length: 7,
      radius: 1.4,
      angle: 0.25,
      periodMs: 2000,
      color: "#b8862a",
      edge: "#382413",
      highlight: "#f7de8a",
    },
  ],
  props: [
    {
      id: "lake-boat",
      hideForReducedMotion: true,
      sprite: boat,
      path: [
        { at: 0, x: 199, y: 56 },
        { at: 1, x: 126, y: 56 },
      ],
      durationMs: 65000,
      everyMs: 85000,
      delayMs: 1000,
      faceTravel: true,
      clip: WATER,
    },
    {
      id: "cuckoo",
      sprite: cuckoo,
      path: [
        { at: 0, x: 237.5, y: 21, scale: 0.1 },
        { at: 0.22, x: 237, y: 21, scale: 1 },
        { at: 0.78, x: 237, y: 21, scale: 1 },
        { at: 1, x: 237.5, y: 21, scale: 0.1 },
      ],
      durationMs: 1900,
      everyMs: 36000,
      delayMs: 15000,
      sound: "cuckoo",
      hideForReducedMotion: true,
    },
  ],
  exits: [
    {
      id: "door-hall",
      to: "hall",
      entry: "fromZurich",
      name: "the airport",
      sprite: door,
      x: 302,
      y: 10,
      baselineY: 96,
      hotspot: { x: 267, y: 78, w: 36, h: 20 },
      extraHotspots: [
        { x: 293, y: 20, w: 10, h: 58 },
        { x: 303, y: 21, w: 17, h: 77 },
      ],
      interactionPoint: { x: 287, y: 106, facing: "n" },
      look: "Back to the airport. The cow has not cleared passport control.",
    },
  ],
};
