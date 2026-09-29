/**
 * Sorrento: a kitchen at sunset, looking across the Gulf of Naples to
 * Naples, Vesuvius, and Ischia (docs/art-spec.md, scene card `sorrento`).
 * Built in task B4 from candidate 02, and rebuilt at 2x density in RB4 from
 * remaster candidate 01 (the art is 640x320). Every coordinate is in logical
 * pixels (320x160), top-left origin; the engine scales by the density.
 *
 * Walking depth: the table for two, its two chairs, and the stove stand out
 * on the floor, each with a `baselineY` on its front feet. The walkbox is one
 * polygon with two keyhole slits from its back edge (x 190 and x 268), so
 * their footprints are holes and Daniele walks behind them (feet above the
 * baseline, drawn under the object) or in front. The lemon tree is `fg.png`.
 *
 * Check it with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import { PROFILE } from "../profile";
import { SECTIONS } from "../sections";
import type { SceneData } from "../../engine/types";
import sorrentoBg from "../../assets/scenes/sorrento/bg.png";
import sorrentoFg from "../../assets/scenes/sorrento/fg.png";
import sorrentoObjDoor from "../../assets/scenes/sorrento/obj-door.png";
import sorrentoObjDoorOpen from "../../assets/scenes/sorrento/obj-door@open.png";
import sorrentoObjStove from "../../assets/scenes/sorrento/obj-stove.png";
import sorrentoObjTable from "../../assets/scenes/sorrento/obj-table.png";
import sorrentoObjChairLeft from "../../assets/scenes/sorrento/obj-chair-left.png";
import sorrentoObjChairRight from "../../assets/scenes/sorrento/obj-chair-right.png";
import sorrentoAnimGlints from "../../assets/scenes/sorrento/anim-glints.png";
import sorrentoAnimFerry from "../../assets/scenes/sorrento/anim-ferry.png";
import sorrentoAnimSteam from "../../assets/scenes/sorrento/anim-steam.png";

const ABOUT = SECTIONS.about.label;
const CONTACT = SECTIONS.contact.label;
const FIRST_NAME = PROFILE.name.split(" ")[0];

/** Front feet of the free-standing furniture: the depth-sort lines. */
const STOVE_BASELINE = 119;
const TABLE_BASELINE = 138;
const CHAIR_BASELINE = 137;

/** The view through the window, which the ferry never leaves. */
const VIEW = { x: 118, y: 14, w: 78, h: 59 };

export const SORRENTO_SCENE: SceneData = {
  id: "sorrento",
  name: "Sorrento",
  background: sorrentoBg,
  foreground: sorrentoFg,
  // Loop points from assets-src/provenance/music-sorrento.json and
  // ambience-sorrento.json.
  music: {
    src: "/audio/music/sorrento.mp3",
    loopStart: 0.375,
    loopEnd: 63.375,
  },
  ambience: {
    src: "/audio/ambience/sorrento.mp3",
    loopStart: 0.5,
    loopEnd: 36.5,
  },
  floor: "tile",
  // The tiled floor from the baseboard (y 103) to the front edge, less the
  // lemon tree's pot. Two keyhole slits cut out the footprints of the table
  // and chairs (x 158-228, y 129-140) and the stove (x 249-287, y 111-121).
  walkbox: [
    [4, 103],
    [190, 103],
    [190, 129],
    [158, 129],
    [158, 140],
    [228, 140],
    [228, 129],
    [190, 129],
    [190, 103],
    [268, 103],
    [268, 111],
    [249, 111],
    [249, 121],
    [287, 121],
    [287, 111],
    [268, 111],
    [268, 103],
    [316, 103],
    [316, 124],
    [291, 128],
    [287, 158],
    [4, 158],
  ],
  depth: { farY: 103, nearY: 158, farScale: 0.7, nearScale: 1.0 },
  entryPoints: { fromHall: { x: 28, y: 114, facing: "e" } },
  entryLine: `Sorrento, the next chapter. ${ABOUT} on the fridge, ${CONTACT} by the phone.`,
  // Topmost last: nearer things come after the things behind them.
  objects: [
    {
      id: "window",
      name: "window",
      hotspot: { x: 105, y: 9, w: 105, h: 64 },
      interactionPoint: { x: 157, y: 108, facing: "n" },
      look: "Naples, Vesuvius pretending to sleep, and Ischia catching the sunset.",
      use: "I shout 'Buonasera!' at the ferry. It never shouts back.",
    },
    {
      id: "sill",
      name: "lemons and limoncello",
      hotspot: { x: 150, y: 57, w: 39, h: 16 },
      interactionPoint: { x: 175, y: 108, facing: "n" },
      look: "One is breakfast, one is a digestif. I'm not saying which.",
      use: "Limoncello has never once improved a technical interview.",
    },
    {
      id: "plate",
      name: "majolica plate",
      hotspot: { x: 57, y: 13, w: 18, h: 18 },
      interactionPoint: { x: 70, y: 106, facing: "n" },
      look: "Too nice to eat off, so it lives on the wall.",
      use: "It's load-bearing. Nonna said so.",
    },
    {
      id: "fridge",
      name: "fridge",
      hotspot: { x: 46, y: 40, w: 40, h: 63 },
      interactionPoint: { x: 66, y: 108, facing: "n" },
      action: "about",
      look: `Everything worth knowing about ${FIRST_NAME} ends up on this fridge.`,
    },
    {
      id: "pans",
      name: "copper pans",
      hotspot: { x: 262, y: 14, w: 53, h: 35 },
      interactionPoint: { x: 288, y: 106, facing: "n" },
      look: "Polished to a mirror. They've seen more sauce than a code review.",
      use: "Decorative. The real cooking happens in one dented pot.",
    },
    {
      id: "phone",
      name: "wall phone",
      hotspot: { x: 218, y: 40, w: 31, h: 49 },
      interactionPoint: { x: 234, y: 108, facing: "n" },
      action: "contact",
      sound: "phone-ring",
      look: "It only rings for good news. Be the good news.",
    },
    {
      id: "stove",
      name: "stove",
      sprite: sorrentoObjStove,
      x: 250,
      y: 84,
      interactionPoint: { x: 268, y: 126, facing: "n" },
      baselineY: STOVE_BASELINE,
      look: "Older than the internet, and more reliable.",
      use: "It has two settings: off, and Neapolitan grandmother.",
    },
    {
      id: "moka-pot",
      name: "moka pot",
      hotspot: { x: 271, y: 84, w: 11, h: 10 },
      interactionPoint: { x: 272, y: 126, facing: "n" },
      sound: "moka-gurgle",
      look: "The only thing in this house allowed to be under pressure.",
      use: "That gurgle means it's ready. Two cups, as always.",
    },
    {
      id: "table",
      name: "table for two",
      sprite: sorrentoObjTable,
      x: 172,
      y: 107,
      interactionPoint: { x: 193, y: 146, facing: "n" },
      baselineY: TABLE_BASELINE,
      look: "Two espresso cups: one for me, one for you. Let's talk.",
      use: "Nobody in Italy discusses business without a coffee.",
    },
    {
      id: "chair-left",
      name: "chair",
      sprite: sorrentoObjChairLeft,
      x: 159,
      y: 104,
      interactionPoint: { x: 150, y: 142, facing: "e" },
      baselineY: CHAIR_BASELINE,
      look: "Handmade, slightly wonky, full of character. Like me.",
      use: "It creaks in a friendly way. The Italian welcome.",
    },
    {
      id: "chair-right",
      name: "chair",
      sprite: sorrentoObjChairRight,
      x: 213,
      y: 104,
      interactionPoint: { x: 236, y: 142, facing: "w" },
      baselineY: CHAIR_BASELINE,
      look: "The guest chair. It's been waiting for you. No pressure.",
      use: "Save it for the visitor. That's you, by the way.",
    },
    {
      id: "lemon-tree",
      name: "lemon tree",
      hotspot: { x: 284, y: 75, w: 36, h: 85 },
      interactionPoint: { x: 282, y: 142, facing: "e" },
      look: "Life gave me lemons, so I made limoncello and moved here.",
      use: "They're for the limoncello. Priorities.",
    },
  ],
  animations: [
    {
      // Short, hard glints on the water under the sun.
      id: "glints",
      strip: sorrentoAnimGlints,
      frames: 4,
      x: 126,
      y: 49,
      frameMs: 450,
    },
    {
      // A ferry heading east across the gulf, round the clock.
      id: "ferry",
      strip: sorrentoAnimFerry,
      frames: 2,
      x: VIEW.x - 16,
      y: 50,
      frameMs: 400,
      motion: { dx: VIEW.w + 16, dy: 0, durationMs: 60000 },
      clip: VIEW,
    },
    {
      // Steam from the moka pot, so it sorts with the stove.
      id: "steam",
      strip: sorrentoAnimSteam,
      frames: 6,
      x: 271,
      y: 72,
      frameMs: 160,
      baselineY: STOVE_BASELINE,
    },
  ],
  slots: [
    {
      // The bare lower fridge door: two rows of three 8x7 magnets.
      id: "magnets",
      kind: "magnet",
      source: "jobs:italy",
      positions: [
        [51, 73],
        [60, 73],
        [69, 73],
        [51, 84],
        [60, 84],
        [69, 84],
      ],
      fold: "slot-magnet-more",
    },
  ],
  labels: [
    {
      // Lettered on the note stuck to the upper fridge door.
      id: "fridge",
      source: "section:about",
      x: 66,
      y: 57,
      align: "center",
      font: "small",
      color: "#2a2328",
    },
    {
      // Lettered on the note pinned above the phone.
      id: "phone",
      source: "section:contact",
      x: 233,
      y: 43,
      align: "center",
      font: "small",
      color: "#2a2328",
    },
  ],
  exits: [
    {
      id: "door-hall",
      to: "hall",
      entry: "fromSorrento",
      name: "the airport",
      sprite: sorrentoObjDoor,
      states: { open: sorrentoObjDoorOpen },
      x: 8,
      y: 30,
      hotspot: { x: 5, y: 27, w: 30, h: 76 },
      interactionPoint: { x: 20, y: 107, facing: "n" },
      look: "Back to the airport. Try not to stop for gelato.",
    },
  ],
};
