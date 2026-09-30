/**
 * The Hall: a 1990s airport departure lounge (docs/art-spec.md, scene card
 * `hall`). Built in HB2 from the HD hand-painted layers: `bg.png` is the
 * empty-lounge plate with a stone tile floor and the duty-free fixture removed,
 * with the shop, seats and staffed boarding desk as separate sprites and
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
 * Walking depth: the row of seats and the boarding desk stand out
 * on the tile floor, each with a `baselineY` on its front feet. The walkbox is one
 * polygon with keyhole slits from its back edge for the bench and desk
 * footprints, so Daniele walks behind and in front of them. The scale is the
 * Hall's own perspective (`HALL_DEPTH`), not the shared Phase H world scale:
 * this plate is a much wider, deeper shot than the other rooms.
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
import type { SceneData } from "../../engine/types";
import hallBg from "../../assets/scenes/hall/bg.png";
import dutyFree from "../../assets/scenes/hall/obj-duty-free.png";
import hallObjSeats from "../../assets/scenes/hall/obj-seats.png";
import hallObjBoardingDesk from "../../assets/scenes/hall/obj-boarding-desk.png";
import hallAnimPlane from "../../assets/scenes/hall/anim-plane.png";
import businessman from "../../assets/scenes/hall/anim-passenger-businessman.png";
import family from "../../assets/scenes/hall/anim-passenger-family.png";
import reader from "../../assets/scenes/hall/anim-passenger-reader.png";
import windowMan from "../../assets/scenes/hall/anim-passenger-window-man.png";
import windowWoman from "../../assets/scenes/hall/anim-passenger-window-woman.png";

/**
 * The Hall's perspective, measured from the art (HB2b), in logical px.
 * Daniele is 1.8 m; the engine interpolates his height linearly in y, which is
 * what a ground plane in perspective does.
 *
 * - Back edge (y 91), 34 px: the gate doors stand on the wall at y 85.5 and
 *   are 41 px tall with their frame (38.8 px for the glass leaves). Taking
 *   the door as 2.2 m, that is 18.6 px/m, so 1.8 m is 33 px at the wall, and
 *   34 at the walk-to points a step in front of it (0.83 of the door).
 * - Seats (y 123), 48 px: the seats (27 px, about 0.85 m) come up
 *   to just over half of him.
 * - Front edge (y 158), 64 px. The seats and doors set the perspective
 *   rather than the floor texture, preserving the original walking scale; it
 *   also keeps him at 0.89 of the rig, under its native size.
 */
const HALL_DEPTH = {
  farY: 91,
  nearY: 158,
  farHeight: 34,
  nearHeight: 64,
} as const;

/** Front feet of the free-standing objects: the depth-sort lines. */
const SEATS_BASELINE = 123;
const BOARDING_DESK_BASELINE = 116;

/** The year of the oldest job in the profile, for the whisky's label. */
const FIRST_YEAR =
  PROFILE.workExperience[PROFILE.workExperience.length - 1].period.match(
    /\d{4}/,
  )?.[0] ?? "";

/**
 * The window glass the plane shows through: the right-hand pane, then the
 * left pane's three strips between the posts, above the monitors.
 */
const HALL_PLANE_CLIP = [
  { x: 125, y: 9, w: 42, h: 45 },
  { x: 119, y: 9, w: 4, h: 18 },
  { x: 100, y: 9, w: 17, h: 18 },
  { x: 86, y: 9, w: 12, h: 18 },
];

export const HALL_SCENE: SceneData = {
  id: "hall",
  name: "the airport",
  background: hallBg,
  // Loop points from assets-src/provenance/music-hall.json and
  // ambience-hall.json.
  music: { src: "/audio/music/hall.mp3", loopStart: 0.6, loopEnd: 77.4 },
  ambience: { src: "/audio/ambience/hall.mp3", loopStart: 0.5, loopEnd: 40.5 },
  floor: "tile",
  characterShadow: { width: 0.38, depth: 0.085 },
  // The floor from the skirting (y 91) to the front edge, set back in front
  // of the duty-free counter (base y 97). Keyhole slits cut out the seats'
  // bench (x 137-226, y 111-124) and boarding desk (x 245-273, y 108-117).
  // The gates and the newly open right-hand floor remain walkable.
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
    [259, 91],
    [259, 108],
    [245, 108],
    [245, 117],
    [273, 117],
    [273, 108],
    [259, 108],
    [259, 91],
    [316, 91],
    [316, 158],
    [4, 158],
    [4, 101],
    [80, 101],
  ],
  depth: HALL_DEPTH,
  entryPoints: {
    start: { x: 128, y: 134, facing: "s" },
    fromLondon: { x: 189, y: 93, facing: "s" },
    fromZurich: { x: 234, y: 93, facing: "s" },
    fromSorrento: { x: 284, y: 93, facing: "s" },
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
      sprite: dutyFree,
      x: 0,
      y: 27,
      baselineY: 97,
      groundShadows: [{ x: 39, y: 70, width: 80, depth: 5 }],
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
      groundShadows: [
        { x: 45, y: 25, width: 85, depth: 7 },
        { x: 10, y: 26, width: 10, depth: 3 },
        { x: 45, y: 26, width: 10, depth: 3 },
        { x: 80, y: 26, width: 10, depth: 3 },
      ],
      look: "An armrest every fifty centimetres, so nobody can ever lie down.",
      use: "If I sit down now, I'll wake up in 2031.",
    },
    {
      id: "boarding-desk",
      name: "boarding desk",
      sprite: hallObjBoardingDesk,
      x: 245,
      y: 76,
      interactionPoint: { x: 259, y: 124, facing: "n" },
      baselineY: BOARDING_DESK_BASELINE,
      groundShadows: [{ x: 14, y: 39, width: 25, depth: 6 }],
      look: "A friendly gate attendant. Somehow still smiling after the fifth final call.",
      use: '"Any gate you like. Your career is the destination."',
      sound: "boarding-chime",
    },
  ],
  // The two window-facing passengers sit behind the red chair backs. The
  // reader occupies the first seat, in front of its back but behind walkers.
  animations: [
    {
      id: "passenger-reader",
      strip: reader,
      frames: 1,
      frameMs: 1000,
      x: 139.5,
      y: 85,
      baselineY: SEATS_BASELINE + 0.1,
      groundShadows: [{ x: 6.5, y: 37, width: 9, depth: 3 }],
      idle: { splitY: 22, rise: 0.5, periodMs: 3800, phaseMs: 0 },
    },
    {
      id: "passenger-window-man",
      strip: windowMan,
      frames: 1,
      frameMs: 1000,
      x: 171.5,
      y: 83,
      baselineY: SEATS_BASELINE - 0.1,
      idle: { splitY: 24, rise: 0.5, periodMs: 4600, phaseMs: 1700 },
    },
    {
      id: "passenger-window-woman",
      strip: windowWoman,
      frames: 1,
      frameMs: 1000,
      x: 206,
      y: 84,
      baselineY: SEATS_BASELINE - 0.1,
      idle: { splitY: 24, rise: 0.5, periodMs: 4200, phaseMs: 700 },
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
    // Crossing lanes are in front of the bench. Entire sprites start and
    // finish offscreen, with quiet gaps between passes; no teleport in view.
    {
      id: "passenger-businessman",
      sprite: businessman,
      frames: 4,
      frameMs: 180,
      path: [
        { at: 0, x: 322, y: 80 },
        { at: 1, x: -38, y: 80 },
      ],
      durationMs: 23000,
      everyMs: 37000,
      delayMs: 1500,
      faceTravel: true,
      baselineY: 133,
      groundShadows: [{ x: 18, y: 52, width: 29, depth: 5 }],
      hideForReducedMotion: true,
    },
    {
      id: "passenger-family",
      sprite: family,
      frames: 4,
      frameMs: 220,
      path: [
        { at: 0, x: -64, y: 92 },
        { at: 1, x: 322, y: 92 },
      ],
      durationMs: 31000,
      everyMs: 49000,
      delayMs: 8500,
      faceTravel: true,
      baselineY: 147,
      groundShadows: [
        { x: 18, y: 53, width: 25, depth: 5 },
        { x: 45, y: 53, width: 23, depth: 5 },
      ],
      hideForReducedMotion: true,
    },
    {
      // A plane taking off beyond the right-hand pane, nose up, climbing
      // away up and to the left and shrinking as it goes. It passes behind
      // the mullion (x 123-124) and the two monitor poles (x 98-99 and
      // 117-118) into the left pane, and stays above the monitors (y 27).
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
      clip: HALL_PLANE_CLIP,
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
      // The painted split-flap rules crossed the letters. A clean inset
      // preserves the frame while keeping every destination readable.
      background: { area: { x: 24, y: 5, w: 37, h: 20 }, color: "#080d17" },
      maxWidth: 36,
      x: 24,
      y: 6,
      font: "small",
    },
    {
      id: "duty-free",
      source: "text:Duty free",
      baselineY: 97,
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
      interactionPoint: { x: 189, y: 93, facing: "n" },
      look: `Gate ${COUNTRIES.london.gate}: ${COUNTRIES.london.name}, where I learned the trade.`,
    },
    {
      id: "gate-zurich",
      to: "zurich",
      entry: "fromHall",
      // The full door stays clear of the desk between Gates 2 and 3.
      hotspot: { x: 222, y: 36, w: 22, h: 51 },
      extraHotspots: [{ x: 209, y: 12, w: 50, h: 24 }],
      interactionPoint: { x: 234, y: 93, facing: "n" },
      look: `Gate ${COUNTRIES.zurich.gate}: ${COUNTRIES.zurich.name}, where the career grew.`,
    },
    {
      id: "gate-sorrento",
      to: "sorrento",
      entry: "fromHall",
      hotspot: { x: 274, y: 36, w: 23, h: 51 },
      extraHotspots: [{ x: 261, y: 12, w: 46, h: 24 }],
      interactionPoint: { x: 284, y: 93, facing: "n" },
      look: `Gate ${COUNTRIES.sorrento.gate}: ${COUNTRIES.sorrento.name}, for now and next.`,
    },
  ],
};
