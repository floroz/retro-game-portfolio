/**
 * Zurich: the office at night, overlooking Lake Zurich and the Alps
 * (docs/art-spec.md, scene card `zurich`). Built in task B1, rebuilt at 2x
 * density in RB1, and assembled from the hand-painted HD layers in HB1: an
 * empty-room plate (`bg.png`, candidate 02 of `zurich-plate@hd`) plus the
 * desk, chair, filing cabinet, door and plant as separate sprites, and the
 * cuckoo as a moving prop. Every coordinate is in logical pixels (320x160),
 * top-left origin; the art is 640x320 and the engine scales positions by its
 * density.
 *
 * Walking depth: the desk (with the CRT and lamp), the chair, and the filing
 * cabinet stand out on the floor, each with a `baselineY` on its front feet.
 * The walkbox is one polygon with two keyhole slits from its back edge, so
 * their footprints are holes and Daniele walks round them, behind (feet above
 * the baseline, drawn under the object) or in front. The plant in the front
 * left corner is an object with a baseline at the bottom of the walkbox, so
 * he always passes behind it, and the walkbox stays clear of its pot.
 *
 * Effects are the engine's: twinkling stars over the painted ones, glints on
 * the lake, and the CRT's blinking cursor. The lamp's light is painted, so it
 * has no effect.
 *
 * Check it with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import { PROFILE } from "../profile";
import { SECTIONS } from "../sections";
import { HD_WORLD_SCALE } from "../../engine/constants";
import type { SceneData } from "../../engine/types";
import zurichBg from "../../assets/scenes/zurich/bg.png";
import zurichObjDesk from "../../assets/scenes/zurich/obj-desk.png";
import zurichObjChair from "../../assets/scenes/zurich/obj-chair.png";
import zurichObjCabinet from "../../assets/scenes/zurich/obj-cabinet.png";
import zurichObjCabinetOpen from "../../assets/scenes/zurich/obj-cabinet@open.png";
import zurichObjDoor from "../../assets/scenes/zurich/obj-door.png";
import zurichObjDoorOpen from "../../assets/scenes/zurich/obj-door@open.png";
import zurichObjPlant from "../../assets/scenes/zurich/obj-plant.png";
import zurichAnimCuckoo from "../../assets/scenes/zurich/anim-cuckoo.png";

const EXPERIENCE = SECTIONS.experience.label;
const RESUME = SECTIONS.resume.label;
const LATEST_JOB = PROFILE.workExperience[0];

/** Front feet of the free-standing furniture: the depth-sort lines. */
const DESK_BASELINE = 127;
const CHAIR_BASELINE = 134;
const CABINET_BASELINE = 119;
/** The plant's pot sits on the front edge of the floor. */
const PLANT_BASELINE = 158;

/** Moonlight on the water, and the sky, inside the window panes. */
const LAKE = { x: 117, y: 64, w: 75, h: 8 };
const SKY = { x: 116, y: 18, w: 77, h: 22 };

export const ZURICH_SCENE: SceneData = {
  id: "zurich",
  name: "Zurich",
  background: zurichBg,
  // Loop points from assets-src/provenance/music-zurich.json and
  // ambience-zurich.json.
  music: { src: "/audio/music/zurich.mp3", loopStart: 0.75, loopEnd: 72.75 },
  ambience: {
    src: "/audio/ambience/zurich.mp3",
    loopStart: 0.5,
    loopEnd: 30.5,
  },
  floor: "wood",
  // The floor from the baseboard (y 101) to the front edge, less the plant's
  // pot corner (x 46 and y 127 clear its leaves and rim). Two keyhole slits
  // (x 170 and x 262) cut out the footprints of the desk and chair
  // (x 136-203, y 119-134) and the cabinet (x 238-276, y 113-119).
  walkbox: [
    [4, 101],
    [170, 101],
    [170, 119],
    [136, 119],
    [136, 127],
    [145, 127],
    [145, 134],
    [172, 134],
    [172, 127],
    [203, 127],
    [203, 119],
    [170, 119],
    [170, 101],
    [262, 101],
    [262, 113],
    [238, 113],
    [238, 119],
    [276, 119],
    [276, 113],
    [262, 113],
    [262, 101],
    [316, 101],
    [316, 158],
    [46, 158],
    [46, 127],
    [4, 127],
  ],
  // The Phase H world scale: Daniele is 58 px tall at the baseboard and 72
  // at the front edge, a depth scale of 0.8 to 1.0 of the 72 px puppet.
  depth: { farY: 101, nearY: 158, ...HD_WORLD_SCALE },
  entryPoints: { fromHall: { x: 298, y: 112, facing: "w" } },
  entryLine: `Zurich, where I grew. ${EXPERIENCE} on the CRT, ${RESUME} in the cabinet.`,
  // Topmost last: nearer things come after the things behind them.
  objects: [
    {
      id: "window",
      name: "window",
      hotspot: { x: 106, y: 12, w: 95, h: 66 },
      interactionPoint: { x: 150, y: 110, facing: "n" },
      look: "Lake Zurich by moonlight, and the Alps showing off.",
      use: "The Alps are strictly look, don't touch.",
    },
    {
      id: "cuckoo",
      name: "cuckoo clock",
      hotspot: { x: 212, y: 10, w: 24, h: 45 },
      interactionPoint: { x: 224, y: 106, facing: "n" },
      look: "Accurate to the second. The most punctual colleague I ever had.",
      use: "It's Swiss. It winds itself, out of a sense of duty.",
    },
    {
      id: "plant",
      name: "rubber plant",
      sprite: zurichObjPlant,
      x: 0,
      y: 87,
      interactionPoint: { x: 52, y: 142, facing: "w" },
      baselineY: PLANT_BASELINE,
      look: "The only thing here with better uptime than production.",
      use: "Watered every sprint. It has never missed a retro.",
    },
    {
      id: "desk",
      name: "desk",
      sprite: zurichObjDesk,
      x: 136,
      y: 78,
      hotspot: { x: 136, y: 98, w: 68, h: 28 },
      interactionPoint: { x: 192, y: 131, facing: "n" },
      baselineY: DESK_BASELINE,
      look: "Perfectly level since day one, unlike my first pull request.",
      use: "I'd tidy it, but then I'd never find anything.",
    },
    {
      id: "lamp",
      name: "desk lamp",
      hotspot: { x: 178, y: 81, w: 14, h: 19 },
      interactionPoint: { x: 188, y: 131, facing: "n" },
      look: "In Zurich, even the lamps look like they manage a portfolio.",
      use: "Click. Click. Yes, it works.",
    },
    {
      id: "crt",
      name: "CRT workstation",
      hotspot: { x: 148, y: 78, w: 25, h: 19 },
      interactionPoint: { x: 184, y: 131, facing: "n" },
      action: "experience",
      look: `My whole career, newest first. ${LATEST_JOB.company} is on top.`,
      use: "Booting up. Please do not turn off your recruiter.",
    },
    {
      id: "chair",
      name: "office chair",
      sprite: zurichObjChair,
      x: 145,
      y: 103,
      interactionPoint: { x: 157, y: 141, facing: "n" },
      baselineY: CHAIR_BASELINE,
      look: "Five wheels, no opinions. The ideal code reviewer.",
      use: "Sitting down is how deadlines sneak up on you.",
    },
    {
      id: "cabinet",
      name: "filing cabinet",
      sprite: zurichObjCabinet,
      states: { open: zurichObjCabinetOpen },
      // The 84x94 art px canvas is shared with the open state, whose drawer
      // sticks out to the left of the body.
      x: 233,
      y: 71,
      interactionPoint: { x: 261, y: 128, facing: "n" },
      baselineY: CABINET_BASELINE,
      action: "resume",
      look: "Filed under R, for Resume. Also for Really well organised.",
      use: "It all fits on one page. Well, two.",
    },
  ],
  effects: [
    {
      // Over the painted stars in the panes, which they twinkle in turn.
      kind: "stars",
      id: "stars",
      points: [
        [143.5, 20],
        [166, 21],
        [120, 22],
        [131.5, 27],
        [146, 29],
        [160, 30],
        [125.5, 33],
        [118.5, 37],
      ],
      periodMs: 2600,
      color: "#f2f4ff",
      dim: "#1e2858",
      clip: SKY,
    },
    {
      // Moonlight dashes on Lake Zurich.
      kind: "glints",
      id: "lake",
      area: LAKE,
      count: 6,
      lifeMs: 1500,
      length: 4,
      color: "#c8d8f8",
      clip: LAKE,
    },
    {
      // The prompt cursor, under the word on the CRT's green screen.
      kind: "lamps",
      id: "cursor",
      points: [[152.5, 89]],
      size: 1,
      pattern: "alternate",
      stepMs: 530,
      on: "#7fae52",
      baselineY: DESK_BASELINE,
    },
  ],
  props: [
    {
      // The cuckoo pops out of the clock's gable door, calls twice, and goes
      // back in: it grows out of the door (its top-left moves so it stays
      // centred on it while it scales).
      id: "cuckoo",
      sprite: zurichAnimCuckoo,
      path: [
        { at: 0, x: 221.9, y: 17.1, scale: 0.35 },
        { at: 0.1, x: 217.5, y: 14, scale: 1 },
        { at: 0.2, x: 217, y: 13, scale: 1 },
        { at: 0.3, x: 217.5, y: 14, scale: 1 },
        { at: 0.4, x: 217, y: 13, scale: 1 },
        { at: 0.5, x: 217.5, y: 14, scale: 1 },
        { at: 0.8, x: 217.5, y: 14, scale: 1 },
        { at: 0.9, x: 219.3, y: 15.5, scale: 0.7 },
        { at: 1, x: 221.9, y: 17.1, scale: 0.35 },
      ],
      durationMs: 2800,
      everyMs: 20000,
      delayMs: 4000,
      sound: "cuckoo",
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
      // "EXP" on the CRT's green screen (x 151-167, y 82-92): the full word
      // is 74 art px at its smallest, on a 33 px screen, so the screen shows
      // the RPG stat instead. The cursor blinks under it.
      id: "crt",
      source: "text:EXP",
      x: 152.5,
      y: 84,
      font: "small",
      maxWidth: 13.5,
      color: "#7fae52",
      baselineY: DESK_BASELINE,
    },
    {
      // Lettered on the card on the cabinet's top drawer (x 242-267, about
      // 25 px wide). The word at its smallest size is 23 px, so it sits
      // inside the card with a px to spare on each side.
      id: "cabinet",
      source: "section:resume",
      x: 255,
      y: 77.5,
      align: "center",
      font: "small",
      maxWidth: 25,
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
      x: 281,
      y: 31,
      hotspot: { x: 281, y: 31, w: 37, h: 70 },
      interactionPoint: { x: 300, y: 106, facing: "n" },
      look: "Back to the airport. In Zurich, even the doors leave on time.",
    },
  ],
};
