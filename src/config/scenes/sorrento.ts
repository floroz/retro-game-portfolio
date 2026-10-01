/**
 * Sorrento: a kitchen at sunset, looking across the Gulf of Naples to
 * Naples, Vesuvius, and Ischia. Built in task HB4 from the hand-painted HD
 * layers (Phase H): the empty plate (bg.png), the door with its open state, the
 * stove, the table, the two chairs, and the potted lemon tree, all painted
 * density 2 (the art is 640x320, shown at 2x nearest-neighbour, one 256-colour
 * palette). Every coordinate is in logical pixels (320x160), top-left origin;
 * the engine scales by the density.
 *
 * Walking depth: the table for two, its two chairs, and the stove stand out
 * on the floor, each with a `baselineY` on its front feet. The walkbox is one
 * polygon with a keyhole slit from its back edge at x 186, so the table and
 * chairs' footprint is a hole and Daniele walks behind them (feet above the
 * baseline, drawn under the object) or in front. The stove sits against the
 * wall, so its footprint is a notch in the back edge. The lemon tree is an
 * object whose baseline is the floor's front edge, so it is always drawn
 * over Daniele; its pot is left out of the walkbox.
 *
 * The sea glints and the moka steam are procedural effects; the ferry is a
 * moving prop that sails across the window.
 *
 * Check it with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import { PROFILE } from "../profile";
import { HD_WORLD_SCALE } from "../../engine/constants";
import type { SceneData } from "../../engine/types";
import sorrentoBg from "../../assets/scenes/sorrento/bg.png";
import sorrentoObjDoor from "../../assets/scenes/sorrento/obj-door.png";
import sorrentoObjDoorOpen from "../../assets/scenes/sorrento/obj-door@open.png";
import sorrentoObjStove from "../../assets/scenes/sorrento/obj-stove.png";
import sorrentoObjTable from "../../assets/scenes/sorrento/obj-table.png";
import sorrentoObjChairLeft from "../../assets/scenes/sorrento/obj-chair-left.png";
import sorrentoObjChairRight from "../../assets/scenes/sorrento/obj-chair-right.png";
import sorrentoObjLemonTree from "../../assets/scenes/sorrento/obj-lemon-tree.png";
import sorrentoAnimFerry from "../../assets/scenes/sorrento/anim-ferry.png";

const FIRST_NAME = PROFILE.name.split(" ")[0];

/** Front feet of the free-standing furniture: the depth-sort lines. */
const STOVE_BASELINE = 112;
const TABLE_BASELINE = 138;
const CHAIR_BASELINE = 137;
/** The lemon tree's pot stands on the floor's front edge. */
const TREE_BASELINE = 158;

/** The floor: from the baseboard to the front edge. */
const FLOOR_FAR = 104;
const FLOOR_NEAR = 158;

/** The view through the window, which the ferry never leaves. */
const VIEW = { x: 115, y: 25, w: 80, h: 46 };

export const SORRENTO_SCENE: SceneData = {
  id: "sorrento",
  name: "Sorrento",
  background: sorrentoBg,
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
  // Furniture contact shadows are already painted into the background.
  characterShadow: { width: 0.38, depth: 0.085 },
  // The tiled floor from the baseboard to the front edge, less the lemon
  // tree's pot. One keyhole slit at x 186 cuts out the footprint of the table
  // and chairs (x 146-226, y 129-140); the stove (x 249-288, y 104-113) is a
  // notch in the back edge, since it stands against the wall.
  walkbox: [
    [4, FLOOR_FAR],
    [186, FLOOR_FAR],
    [186, 129],
    [146, 129],
    [146, 140],
    [226, 140],
    [226, 129],
    [186, 129],
    [186, FLOOR_FAR],
    [249, FLOOR_FAR],
    [249, 113],
    [288, 113],
    [288, FLOOR_FAR],
    [316, FLOOR_FAR],
    [316, 134],
    [291, 138],
    [291, FLOOR_NEAR],
    [4, FLOOR_NEAR],
  ],
  depth: {
    farY: FLOOR_FAR,
    nearY: FLOOR_NEAR,
    ...HD_WORLD_SCALE,
  },
  entryPoints: { fromHall: { x: 28, y: 114, facing: "e" } },
  entryLine:
    "Sorrento, my hometown. Story on the fridge; contacts by the phone.",
  // Topmost last: nearer things come after the things behind them.
  objects: [
    {
      id: "window",
      name: "window",
      hotspot: { x: 101, y: 4, w: 108, h: 72 },
      interactionPoint: { x: 157, y: 108, facing: "n" },
      look: "Naples, Vesuvius pretending to sleep, and Ischia catching the sunset.",
      use: "I shout 'Buonasera!' at the ferry. It never shouts back.",
    },
    {
      id: "sill",
      name: "lemons and limoncello",
      hotspot: { x: 152, y: 57, w: 38, h: 17 },
      interactionPoint: { x: 175, y: 108, facing: "n" },
      look: "One is breakfast, one is a digestif. I'm not saying which.",
      use: "Limoncello has never once improved a technical interview.",
    },
    {
      id: "plate",
      name: "majolica plate",
      hotspot: { x: 54, y: 11, w: 19, h: 19 },
      interactionPoint: { x: 70, y: 106, facing: "n" },
      look: "Too nice to eat off, so it lives on the wall.",
      use: "It's load-bearing. Nonna said so.",
    },
    {
      id: "fridge",
      name: "postcard on the fridge — about me",
      hotspot: { x: 46, y: 38, w: 39, h: 63 },
      interactionPoint: { x: 66, y: 108, facing: "n" },
      action: "about",
      look: `The story of ${FIRST_NAME}. The fridge has become my biographer.`,
    },
    {
      id: "pans",
      name: "copper pans",
      hotspot: { x: 258, y: 13, w: 56, h: 36 },
      interactionPoint: { x: 296, y: 108, facing: "n" },
      look: "Polished to a mirror. They've seen more sauce than a code review.",
      use: "Decorative. The real cooking happens in one dented pot.",
    },
    {
      id: "phone",
      name: "phone and address book — contact me",
      hotspot: { x: 217, y: 41, w: 31, h: 46 },
      interactionPoint: { x: 234, y: 108, facing: "n" },
      action: "contact",
      sound: "phone-ring",
      look: "My address book. The phone only rings for good news. Yours, perhaps?",
    },
    {
      id: "stove",
      name: "stove",
      sprite: sorrentoObjStove,
      x: 250,
      y: 73,
      interactionPoint: { x: 268, y: 126, facing: "n" },
      baselineY: STOVE_BASELINE,
      look: "Older than the internet, and more reliable.",
      use: "It has two settings: off, and Neapolitan grandmother.",
    },
    {
      id: "moka-pot",
      name: "moka pot",
      hotspot: { x: 273, y: 73, w: 11, h: 12 },
      interactionPoint: { x: 272, y: 126, facing: "n" },
      sound: "moka-gurgle",
      look: "The only thing in this house allowed to be under pressure.",
      use: "That gurgle means it's ready. Two cups, as always.",
    },
    {
      id: "table",
      name: "table for two",
      sprite: sorrentoObjTable,
      x: 159,
      y: 107,
      interactionPoint: { x: 186, y: 146, facing: "n" },
      baselineY: TABLE_BASELINE,
      look: "Two espresso cups: one for me, one for you. Let's talk.",
      use: "Nobody in Italy discusses business without a coffee.",
    },
    {
      id: "chair-left",
      name: "chair",
      sprite: sorrentoObjChairLeft,
      x: 145,
      y: 97,
      interactionPoint: { x: 138, y: 142, facing: "e" },
      baselineY: CHAIR_BASELINE,
      look: "Handmade, slightly wonky, full of character. Like me.",
      use: "It creaks in a friendly way. The Italian welcome.",
    },
    {
      id: "chair-right",
      name: "chair",
      sprite: sorrentoObjChairRight,
      x: 203,
      y: 97,
      interactionPoint: { x: 234, y: 142, facing: "w" },
      baselineY: CHAIR_BASELINE,
      look: "The guest chair. It's been waiting for you. No pressure.",
      use: "Save it for the visitor. That's you, by the way.",
    },
    {
      // In front of everything at the right edge: its pot is off the walkbox,
      // and its baseline is the floor's front edge.
      id: "lemon-tree",
      name: "lemon tree",
      sprite: sorrentoObjLemonTree,
      x: 283,
      y: 82,
      hotspot: { x: 283, y: 82, w: 37, h: 78 },
      interactionPoint: { x: 287, y: 146, facing: "e" },
      baselineY: TREE_BASELINE,
      look: "Hometown lemons. A taste of Sorrento, wherever I live.",
      use: "They're for the limoncello. Priorities.",
    },
  ],
  // Procedural effects (E4): hard pixels on the art grid, deterministic.
  effects: [
    {
      // Short glints on the sun's trail under the setting sun.
      kind: "glints",
      id: "sun-trail",
      area: { x: 127, y: 52, w: 16, h: 6 },
      count: 3,
      lifeMs: 900,
      length: 4,
      color: "#ffe9a6",
    },
    {
      // Sparkle on the open water between the bush and the bottle.
      kind: "glints",
      id: "sea",
      area: { x: 146, y: 53, w: 34, h: 9 },
      count: 4,
      lifeMs: 1200,
      length: 3,
      color: "#fff3c8",
    },
    {
      // Steam from the moka pot's lid, so it sorts with the stove.
      kind: "steam",
      id: "moka-steam",
      x: 278,
      y: 72,
      everyMs: 520,
      lifeMs: 2600,
      rise: 22,
      drift: 3,
      size: 3,
      color: "#f4efe6",
      opacity: 0.75,
      baselineY: STOVE_BASELINE,
    },
  ],
  props: [
    {
      // A ferry heading east across the gulf, round the clock.
      id: "ferry",
      sprite: sorrentoAnimFerry,
      path: [
        { at: 0, x: VIEW.x - 22, y: 48 },
        { at: 1, x: VIEW.x + VIEW.w, y: 48 },
      ],
      durationMs: 70000,
      clip: VIEW,
    },
  ],
  slots: [
    {
      // The bare lower fridge door: two rows of three 8x7 magnets.
      id: "magnets",
      kind: "magnet",
      source: "jobs:italy",
      positions: [
        [52, 71],
        [62, 71],
        [72, 71],
        [52, 83],
        [62, 83],
        [72, 83],
      ],
      fold: "slot-magnet-more",
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
      x: 3,
      y: 25,
      hotspot: { x: 3, y: 25, w: 38, h: 75 },
      interactionPoint: { x: 22, y: 108, facing: "n" },
      look: "Back to the airport. Try not to stop for gelato.",
    },
  ],
};
