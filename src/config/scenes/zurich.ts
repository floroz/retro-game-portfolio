/**
 * Zurich: the office at night, overlooking Lake Zurich and the Alps
 * (docs/art-spec.md, scene card `zurich`). Built in task B1 from the F5 style
 * anchor and rebuilt at 2x density in RB1 from the remaster anchor. Every
 * coordinate is in logical pixels (320x160), top-left origin; the art is
 * 640x320 and the engine scales positions by its density.
 *
 * Walking depth: the desk (with the CRT and lamp), the chair, and the filing
 * cabinet stand out on the floor, each with a `baselineY` on its front feet.
 * The walkbox is one polygon with two keyhole slits from its back edge, so
 * their footprints are holes and Daniele walks round them, behind (feet above
 * the baseline, drawn under the object) or in front. The plant is `fg.png`.
 *
 * Check it with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import { PROFILE } from "../profile";
import { SECTIONS } from "../sections";
import type { SceneData } from "../../engine/types";
import zurichBg from "../../assets/scenes/zurich/bg.png";
import zurichFg from "../../assets/scenes/zurich/fg.png";
import zurichObjDesk from "../../assets/scenes/zurich/obj-desk.png";
import zurichObjChair from "../../assets/scenes/zurich/obj-chair.png";
import zurichObjCabinet from "../../assets/scenes/zurich/obj-cabinet.png";
import zurichObjCabinetOpen from "../../assets/scenes/zurich/obj-cabinet@open.png";
import zurichObjDoor from "../../assets/scenes/zurich/obj-door.png";
import zurichObjDoorOpen from "../../assets/scenes/zurich/obj-door@open.png";
import zurichAnimStars from "../../assets/scenes/zurich/anim-stars.png";
import zurichAnimLake from "../../assets/scenes/zurich/anim-lake.png";
import zurichAnimCuckoo from "../../assets/scenes/zurich/anim-cuckoo.png";
import zurichAnimPendulum from "../../assets/scenes/zurich/anim-pendulum.png";
import zurichAnimCursor from "../../assets/scenes/zurich/anim-cursor.png";

const EXPERIENCE = SECTIONS.experience.label;
const RESUME = SECTIONS.resume.label;
const LATEST_JOB = PROFILE.workExperience[0];

/** Front feet of the free-standing furniture: the depth-sort lines. */
const DESK_BASELINE = 126;
const CHAIR_BASELINE = 134;
const CABINET_BASELINE = 124;

export const ZURICH_SCENE: SceneData = {
  id: "zurich",
  name: "Zurich",
  background: zurichBg,
  foreground: zurichFg,
  // Loop points from assets-src/provenance/music-zurich.json and
  // ambience-zurich.json.
  music: { src: "/audio/music/zurich.mp3", loopStart: 0.75, loopEnd: 72.75 },
  ambience: {
    src: "/audio/ambience/zurich.mp3",
    loopStart: 0.5,
    loopEnd: 30.5,
  },
  floor: "wood",
  // The floor from the baseboard (y 102) to the front edge, less the plant
  // pot's corner. Two keyhole slits (x 166 and x 261) cut out the footprints
  // of the desk and chair (x 130-203, y 117-137) and the cabinet
  // (x 244-279, y 117-127).
  walkbox: [
    [4, 102],
    [166, 102],
    [166, 117],
    [130, 117],
    [130, 127],
    [142, 127],
    [142, 137],
    [171, 137],
    [171, 127],
    [203, 127],
    [203, 117],
    [166, 117],
    [166, 102],
    [261, 102],
    [261, 117],
    [244, 117],
    [244, 127],
    [279, 127],
    [279, 117],
    [261, 117],
    [261, 102],
    [316, 102],
    [316, 158],
    [36, 158],
    [4, 126],
  ],
  depth: { farY: 102, nearY: 158, farScale: 0.7, nearScale: 1.0 },
  entryPoints: { fromHall: { x: 298, y: 114, facing: "w" } },
  entryLine: `Zurich, where the career grew. ${EXPERIENCE} is on the CRT, and my ${RESUME} is in the filing cabinet.`,
  // Topmost last: nearer things come after the things behind them.
  objects: [
    {
      id: "window",
      name: "window",
      hotspot: { x: 106, y: 13, w: 95, h: 66 },
      interactionPoint: { x: 150, y: 110, facing: "n" },
      look: "Lake Zurich by moonlight, and the Alps pretending they're not showing off.",
      use: "It doesn't open. The Alps are strictly look, don't touch.",
    },
    {
      id: "cuckoo",
      name: "cuckoo clock",
      hotspot: { x: 212, y: 11, w: 24, h: 44 },
      interactionPoint: { x: 223, y: 106, facing: "n" },
      look: "A cuckoo clock, accurate to the second. The bird is the most punctual colleague I ever had.",
      use: "I'd wind it, but it's Swiss. It winds itself, out of a sense of duty.",
    },
    {
      id: "plant",
      name: "rubber plant",
      hotspot: { x: 0, y: 97, w: 35, h: 63 },
      interactionPoint: { x: 44, y: 140, facing: "w" },
      look: "A rubber plant. The only thing in this office with better uptime than production.",
      use: "I water it every sprint. It has never missed a retro.",
    },
    {
      id: "desk",
      name: "desk",
      sprite: zurichObjDesk,
      x: 135,
      y: 78,
      hotspot: { x: 135, y: 102, w: 65, h: 25 },
      interactionPoint: { x: 192, y: 131, facing: "n" },
      baselineY: DESK_BASELINE,
      look: "A proper Swiss desk. Perfectly level since the day it arrived, unlike my first pull request.",
      use: "I'd tidy it, but then I'd never find anything.",
    },
    {
      id: "lamp",
      name: "desk lamp",
      hotspot: { x: 177, y: 84, w: 14, h: 18 },
      interactionPoint: { x: 188, y: 131, facing: "n" },
      look: "A green banker's lamp. In Zurich, even the lamps look like they manage a portfolio.",
      use: "Click. Click. Yes, it works. No, I won't do that all night.",
    },
    {
      id: "crt",
      name: "CRT workstation",
      hotspot: { x: 145, y: 78, w: 29, h: 24 },
      interactionPoint: { x: 184, y: 131, facing: "n" },
      action: "experience",
      look: `A beige CRT with my whole career on it, newest first. ${LATEST_JOB.company} is at the top of the stack.`,
      use: "Booting up the experience. Please do not turn off your recruiter.",
    },
    {
      id: "chair",
      name: "office chair",
      sprite: zurichObjChair,
      x: 145,
      y: 105,
      interactionPoint: { x: 157, y: 141, facing: "n" },
      baselineY: CHAIR_BASELINE,
      look: "An office chair with five wheels and no opinions. The ideal code reviewer.",
      use: "Later. Sitting down is how deadlines sneak up on you.",
    },
    {
      id: "cabinet",
      name: "filing cabinet",
      sprite: zurichObjCabinet,
      states: { open: zurichObjCabinetOpen },
      x: 245,
      y: 79,
      interactionPoint: { x: 261, y: 132, facing: "n" },
      baselineY: CABINET_BASELINE,
      action: "resume",
      look: "Filed under R, for Resume. Also for Really well organised.",
      use: "Everything in here fits on one page. Well, two.",
    },
  ],
  animations: [
    {
      id: "stars",
      strip: zurichAnimStars,
      frames: 4,
      x: 114,
      y: 18,
      frameMs: 900,
    },
    {
      id: "lake",
      strip: zurichAnimLake,
      frames: 4,
      x: 174,
      y: 63,
      frameMs: 420,
    },
    {
      id: "cuckoo",
      strip: zurichAnimCuckoo,
      frames: 10,
      x: 217,
      y: 15,
      frameMs: 180,
      everyMs: 20000,
    },
    {
      id: "pendulum",
      strip: zurichAnimPendulum,
      frames: 4,
      x: 220,
      y: 36,
      frameMs: 500,
    },
    {
      // On the CRT, so it sorts with the desk.
      id: "cursor",
      strip: zurichAnimCursor,
      frames: 2,
      x: 154,
      y: 85,
      frameMs: 530,
      baselineY: DESK_BASELINE,
    },
  ],
  slots: [
    {
      // Bare wallpaper left of the window: two rows of three 20x16 frames.
      id: "job-photos",
      kind: "photo-frame",
      source: "jobs:switzerland",
      positions: [
        [16, 20],
        [42, 20],
        [68, 20],
        [16, 42],
        [42, 42],
        [68, 42],
      ],
      fold: "slot-photo-frame-more",
    },
  ],
  labels: [
    {
      // Lettered on the card on the cabinet's top drawer.
      id: "cabinet",
      source: "section:resume",
      x: 261,
      y: 85,
      align: "center",
      font: "small",
      color: "#2a2328",
      baselineY: CABINET_BASELINE,
    },
  ],
  exits: [
    {
      id: "door-hall",
      to: "hall",
      entry: "fromZurich",
      name: "the airport",
      sprite: zurichObjDoor,
      states: { open: zurichObjDoorOpen },
      x: 286,
      y: 32,
      hotspot: { x: 286, y: 32, w: 30, h: 69 },
      interactionPoint: { x: 300, y: 105, facing: "n" },
      look: "The way back to the airport. In Zurich, even the doors leave on time.",
    },
  ],
};
