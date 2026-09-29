/**
 * The Hall: a 1990s airport departure lounge (docs/art-spec.md, scene card
 * `hall`). Built in HB2 from the HD hand-painted layers: `bg.png` is the
 * empty-lounge plate (candidate 01 of `hall-plate@hd`, seats, arch and plant
 * edited out), with the seats, arch and rubber plant as separate sprites and
 * the take-off plane as a moving prop. Every coordinate is in logical pixels
 * (320x160), top-left origin; the art is 640x320, shown at 2x.
 *
 * Signposting, kept minimal (docs/expansion-plan.md, "How visitors know where
 * each section is"): the three gates are the exits, each under a dark sign
 * board that carries its gate number and city only (`gate:<country>`). The
 * departures board lists the cities, and the duty-free shelf sells one
 * unlabelled product per section. Hovering names the sections in the status
 * line, and the travel trunk's boarding passes carry the rest.
 *
 * Walking depth: the row of seats, the security arch and the plant stand out
 * on the carpet, each with a `baselineY` on its front feet. The walkbox is one
 * polygon with keyhole slits from its back edge (the seats' bench and each
 * post of the arch, feet only) and a notch for the plant pot, so Daniele
 * walks behind them, in front of them, and through the arch. The scale is the
 * Phase H world scale: 58 logical px tall at the back of the floor (y 91),
 * 72 at the front (y 158).
 *
 * Colour rule: no large surface behind Daniele is within 0.08 OKLab of his
 * sweater, jeans or hair. That is why the seats are vermilion, the sign
 * boards and the shop back are near black, and the shelves are oak
 * (see assets-src/provenance/hall-bg.json).
 *
 * Check it with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import { PROFILE } from "../profile";
import { COUNTRIES } from "../sections";
import { HD_WORLD_SCALE } from "../../engine/constants";
import type { SceneData } from "../../engine/types";
import hallBg from "../../assets/scenes/hall/bg.png";
import hallObjSeats from "../../assets/scenes/hall/obj-seats.png";
import hallObjArch from "../../assets/scenes/hall/obj-arch.png";
import hallObjPlant from "../../assets/scenes/hall/obj-plant.png";
import hallAnimPlane from "../../assets/scenes/hall/anim-plane.png";

/** Front feet of the free-standing objects: the depth-sort lines. */
const SEATS_BASELINE = 123;
const ARCH_BASELINE = 123;
/** Above the pot's base so Daniele can stand in front of its left edge. */
const PLANT_BASELINE = 150;

/** The year of the oldest job in the profile, for the whisky's label. */
const FIRST_YEAR =
  PROFILE.workExperience[PROFILE.workExperience.length - 1].period.match(
    /\d{4}/,
  )?.[0] ?? "";

export const HALL_SCENE: SceneData = {
  id: "hall",
  name: "the airport",
  background: hallBg,
  // Loop points from assets-src/provenance/music-hall.json and
  // ambience-hall.json.
  music: { src: "/audio/music/hall.mp3", loopStart: 0.6, loopEnd: 77.4 },
  ambience: { src: "/audio/ambience/hall.mp3", loopStart: 0.5, loopEnd: 40.5 },
  floor: "carpet",
  // The carpet from the skirting (y 91) to the front edge, set back in front
  // of the duty-free counter (base y 97) and cut short at the plant pot.
  // Keyhole slits cut out the seats' bench (x 137-226, y 111-124) and the
  // feet of the arch's two posts (x 240-250 and x 268-278, y 118-124); the
  // gap between the posts is walkable. The first vertex is on the back edge.
  walkbox: [
    [80, 91],
    [181, 91],
    [181, 111],
    [137, 111],
    [137, 124],
    [226, 124],
    [226, 111],
    [181, 111],
    [181, 91],
    [244, 91],
    [244, 118],
    [240, 118],
    [240, 124],
    [250, 124],
    [250, 118],
    [244, 118],
    [244, 91],
    [272, 91],
    [272, 118],
    [268, 118],
    [268, 124],
    [278, 124],
    [278, 118],
    [272, 118],
    [272, 91],
    [306, 91],
    [306, 140],
    [282, 140],
    [282, 158],
    [4, 158],
    [4, 101],
    [80, 101],
  ],
  depth: { farY: 91, nearY: 158, ...HD_WORLD_SCALE },
  entryPoints: {
    start: { x: 128, y: 134, facing: "s" },
    fromLondon: { x: 189, y: 96, facing: "s" },
    fromZurich: { x: 234, y: 96, facing: "s" },
    fromSorrento: { x: 285, y: 96, facing: "s" },
  },
  entryLine: "Welcome aboard! Pick a gate, or rummage through the trunk below.",
  // Topmost last: nearer things come after the things behind them.
  objects: [
    {
      id: "board",
      name: "departures board",
      hotspot: { x: 22, y: 3, w: 41, h: 24 },
      look: "Three flights, all on time. Clearly a work of fiction.",
      use: "The flaps only ever flip to DELAYED.",
    },
    {
      id: "monitors",
      name: "flight monitors",
      hotspot: { x: 88, y: 27, w: 36, h: 16 },
      look: "The big board again, only smaller and with more static.",
      use: "A gentle thump. That's how we fixed things in the nineties.",
    },
    {
      id: "airliner",
      name: "parked airliner",
      hotspot: { x: 86, y: 44, w: 80, h: 32 },
      look: "No logo on it. Either very exclusive, or very budget.",
      use: "I can't board through the glass. I've tried. Twice.",
    },
    {
      id: "duty-free",
      name: "duty-free shop",
      hotspot: { x: 0, y: 27, w: 80, h: 10 },
      look: "Duty free: lower prices, and somehow you still spend more.",
      use: "Pick a product. Each one opens a section.",
    },
    {
      id: "perfume",
      name: "Eau de Résumé",
      hotspot: { x: 5, y: 37, w: 22, h: 15 },
      interactionPoint: { x: 16, y: 106, facing: "n" },
      action: "resume",
      look: "Eau de Résumé: notes of achievement and printer toner.",
    },
    {
      id: "snow-globe",
      name: "Vesuvius snow globe",
      hotspot: { x: 27, y: 37, w: 24, h: 15 },
      interactionPoint: { x: 39, y: 106, facing: "n" },
      action: "about",
      look: "Snow on Vesuvius: rarer than a bargain in here.",
    },
    {
      id: "postcards",
      name: "postcards",
      hotspot: { x: 51, y: 37, w: 24, h: 15 },
      interactionPoint: { x: 63, y: 106, facing: "n" },
      action: "contact",
      look: "Stamps already on. Drop me a line: I always write back.",
    },
    {
      id: "whisky",
      name: `whisky, aged since ${FIRST_YEAR}`,
      hotspot: { x: 5, y: 58, w: 35, h: 15 },
      interactionPoint: { x: 22, y: 106, facing: "n" },
      action: "experience",
      look: `Matured since ${FIRST_YEAR} in London and Zurich oak. Long TypeScript finish.`,
    },
    {
      id: "toolbox",
      name: "toolbox of skills",
      hotspot: { x: 40, y: 58, w: 35, h: 15 },
      interactionPoint: { x: 57, y: 106, facing: "n" },
      action: "skills",
      look: "Every skill I pack for a trip. Hand luggage only, somehow.",
    },
    {
      id: "carousel",
      name: "luggage carousel",
      hotspot: { x: 79, y: 66, w: 50, h: 21 },
      interactionPoint: { x: 104, y: 96, facing: "n" },
      look: "Going round since 1994, and still empty.",
      use: "Everyone's bag comes out first except yours. That's the rule.",
    },
    {
      id: "lost-luggage",
      name: "lost-luggage desk",
      hotspot: { x: 129, y: 68, w: 23, h: 19 },
      interactionPoint: { x: 141, y: 96, facing: "n" },
      look: "One unclaimed suitcase. Not mine: all my baggage is emotional.",
      use: "Ding! Nobody came. Probably lost as well.",
    },
    {
      id: "seats",
      name: "row of seats",
      sprite: hallObjSeats,
      x: 135.5,
      y: 96,
      interactionPoint: { x: 181, y: 130, facing: "n" },
      baselineY: SEATS_BASELINE,
      look: "An armrest every fifty centimetres, so nobody can ever lie down.",
      use: "If I sit down now, I'll wake up in 2031.",
    },
    {
      id: "arch",
      name: "security arch",
      sprite: hallObjArch,
      x: 241,
      y: 74,
      interactionPoint: { x: 259, y: 136, facing: "n" },
      baselineY: ARCH_BASELINE,
      look: "Please remove your laptop, your belt, and your technical debt.",
      use: "Beep. It's always the belt buckle.",
    },
    {
      id: "plant",
      name: "rubber plant",
      sprite: hallObjPlant,
      x: 270,
      y: 78.5,
      interactionPoint: { x: 279, y: 146, facing: "e" },
      baselineY: PLANT_BASELINE,
      look: "Waiting longer than anyone: its flight was cancelled in 1997.",
      use: "I watered it. The only happy passenger here.",
    },
  ],
  // The take-off plane is a moving prop (below); the board flutters in data.
  effects: [
    {
      // The board's three rows of flaps flutter now and then; the engine
      // letters the cities on top.
      id: "board-flutter",
      kind: "flutter",
      rows: [
        { x: 23, y: 6, w: 38, h: 6 },
        { x: 23, y: 12, w: 38, h: 6 },
        { x: 23, y: 19, w: 38, h: 6 },
      ],
      everyMs: 12000,
      durationMs: 1600,
      staggerMs: 200,
      edge: "#8a97b5",
      face: "#161c30",
      sound: "split-flap",
    },
  ],
  props: [
    {
      // A plane taking off beyond the right-hand pane, nose up, climbing
      // away up and to the left and shrinking as it goes. It slides behind
      // the mullion (x 125), which is the pane's left edge.
      id: "plane",
      sprite: hallAnimPlane,
      path: [
        { at: 0, x: 148, y: 40, scale: 1 },
        { at: 1, x: 106, y: 8, scale: 0.5 },
      ],
      durationMs: 5000,
      everyMs: 15000,
      delayMs: 3000,
      ease: "in",
      clip: { x: 126, y: 9, w: 41, h: 45 },
    },
  ],
  labels: [
    // Gate signs: "GATE 1" and the city, centred on each dark board and set
    // to fit inside it (London's face is x 171-206, Zurich's 210-258,
    // Sorrento's 262-305).
    {
      id: "gate-london",
      source: "gate:london",
      maxWidth: 32,
      x: 189,
      y: 17,
      align: "center",
      font: "small",
    },
    {
      id: "gate-zurich",
      source: "gate:zurich",
      maxWidth: 44,
      x: 234,
      y: 17,
      align: "center",
      font: "small",
    },
    {
      id: "gate-sorrento",
      source: "gate:sorrento",
      maxWidth: 40,
      x: 284,
      y: 17,
      align: "center",
      font: "small",
    },
    {
      id: "departures",
      source: "departures",
      maxWidth: 36,
      x: 24,
      y: 6,
      font: "small",
    },
    {
      id: "duty-free",
      source: "text:Duty free",
      x: 40,
      y: 29,
      align: "center",
      font: "small",
    },
  ],
  exits: [
    {
      id: "gate-london",
      to: "london",
      entry: "fromHall",
      // The door and its header slot; the sign board above is the extra
      // hotspot (x 170-208, y 12-36).
      hotspot: { x: 176, y: 36, w: 26, h: 51 },
      extraHotspots: [{ x: 170, y: 12, w: 38, h: 24 }],
      interactionPoint: { x: 189, y: 95, facing: "n" },
      look: `Gate ${COUNTRIES.london.gate}: ${COUNTRIES.london.name}, where I learned the trade.`,
    },
    {
      id: "gate-zurich",
      to: "zurich",
      entry: "fromHall",
      // The door column stops short of the arch (x 241); the sign board
      // (x 209-259), which hangs well above the arch, is clickable across
      // its full width.
      hotspot: { x: 222, y: 36, w: 19, h: 51 },
      extraHotspots: [{ x: 209, y: 12, w: 50, h: 24 }],
      interactionPoint: { x: 234, y: 95, facing: "n" },
      look: `Gate ${COUNTRIES.zurich.gate}: ${COUNTRIES.zurich.name}, where the career grew.`,
    },
    {
      id: "gate-sorrento",
      to: "sorrento",
      entry: "fromHall",
      // As for Zurich: the door column starts right of the arch (x 277),
      // and the sign board is clickable across its full width (x 261-307).
      hotspot: { x: 277, y: 36, w: 20, h: 51 },
      extraHotspots: [{ x: 261, y: 12, w: 46, h: 24 }],
      interactionPoint: { x: 285, y: 95, facing: "n" },
      look: `Gate ${COUNTRIES.sorrento.gate}: ${COUNTRIES.sorrento.name}, for now and next.`,
    },
  ],
};
