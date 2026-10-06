/**
 * The Hall: a 1990s airport departure lounge. Built in HB2 from the HD
 * hand-painted layers: `bg.png` is the empty-lounge plate with a stone tile
 * floor and the old luggage desk removed, with Lost & Found, seats and staffed
 * boarding desk as separate sprites and the take-off plane as a moving prop.
 * Every coordinate is in logical pixels (320x160), top-left origin; the art is
 * 640x320, shown at 2x.
 *
 * Signposting, kept minimal: the three gates are the exits, each under a dark
 * sign board that carries its gate number and city only (`gate:<country>`). The
 * arrivals/departures board shows ambient flights, gates and times. The
 * Lost & Found clerk stamps forms while an uncertain traveller crosses the hall.
 * The travel trunk's boarding passes keep portfolio information accessible.
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
import { COUNTRIES } from "../sections";
import type { SceneData } from "../../engine/types";
import { HALL_FLIGHT_BOARD } from "./flight-board";
import flightBoard from "../../assets/scenes/hall/obj-flight-board.png";
import sorrentoGate from "../../assets/scenes/hall/obj-gate-sorrento.png";
import londonGate from "../../assets/scenes/hall/obj-gate-london.png";
import zurichGate from "../../assets/scenes/hall/obj-gate-zurich.png";
import hallBg from "../../assets/scenes/hall/bg.png";
import lostAndFound from "../../assets/scenes/hall/obj-lost-and-found.png";
import clerk from "../../assets/scenes/hall/anim-lost-and-found-clerk.png";
import traveller from "../../assets/scenes/hall/anim-passenger-traveller.png";
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

/** The gate housings cover the old painted frames and stay fully clickable. */
const GATE_BOARD_AREAS = {
  sorrento: { x: 169, y: 12, w: 39, h: 24 },
  london: { x: 209, y: 12, w: 51, h: 24 },
  zurich: { x: 260.5, y: 12, w: 48, h: 24 },
};

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
  // of the Lost & Found counter (base y 97). Keyhole slits cut out the seats'
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
    fromSorrento: { x: 189, y: 93, facing: "s" },
    fromLondon: { x: 234, y: 93, facing: "s" },
    fromZurich: { x: 284, y: 93, facing: "s" },
  },
  entryLine: "Welcome aboard! Pick a gate, or rummage through the trunk below.",
  // Topmost last: nearer things come after the things behind them.
  objects: [
    {
      id: "board",
      name: "arrivals and departures board",
      sprite: flightBoard,
      x: 3,
      y: 2,
      hotspot: { x: 3, y: 2, w: 76, h: 24 },
      look: "Six flights, all on time. Clearly a work of fiction.",
      use: "Six flights. My three gates still get the better views.",
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
      id: "lost-and-found",
      name: "Lost & Found",
      sprite: lostAndFound,
      x: 0,
      y: 27,
      baselineY: 97,
      groundShadows: [{ x: 39, y: 70, width: 80, depth: 5 }],
      hotspot: { x: 1, y: 28, w: 78, h: 14 },
      interactionPoint: { x: 40, y: 106, facing: "n" },
      look: "Everything finds its way here. Except the missing-property forms.",
      use: '"Lost something? Take a number. We\'ve misplaced the dispenser."',
    },
    {
      id: "lost-and-found-clerk",
      name: "Lost & Found clerk",
      hotspot: { x: 29, y: 44, w: 23, h: 22 },
      interactionPoint: { x: 40, y: 106, facing: "n" },
      look: "He's been filing lost property since the property was new.",
      use: '"Describe your suitcase. And please don\'t say suitcase-shaped."',
    },
    {
      id: "service-bell",
      name: "service bell",
      hotspot: { x: 66, y: 60, w: 10, h: 9 },
      interactionPoint: { x: 66, y: 106, facing: "n" },
      look: "For urgent matters. Like interrupting the stamping.",
      use: "Ding. The clerk stamps my request to stop ringing the bell.",
      sound: "boarding-chime",
    },
    {
      id: "unclaimed-trunk",
      name: "unclaimed trunk",
      hotspot: { x: 1, y: 81, w: 24, h: 16 },
      interactionPoint: { x: 18, y: 106, facing: "n" },
      look: "It's packed for a holiday. It hasn't told anyone where.",
      use: '"Unaccompanied baggage," says the clerk. "Very independent."',
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
      id: "lost-and-found-clerk",
      strip: clerk,
      frames: 5,
      frameMs: 100,
      frameDurationsMs: [1500, 600, 400, 700, 2200],
      x: 30,
      y: 45,
      baselineY: 97.1,
      freezeForReducedMotion: true,
    },
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
  splitFlapBoard: HALL_FLIGHT_BOARD,
  props: [
    // Two staggered passes are the same traveller returning after eight
    // seconds offscreen. Their intervals never overlap.
    ...(
      [
        {
          id: "passenger-traveller-outbound",
          from: -50,
          to: 322,
          delayMs: 19000,
        },
        {
          id: "passenger-traveller-return",
          from: 322,
          to: -50,
          delayMs: 47000,
        },
      ] as const
    ).map(({ id, from, to, delayMs }) => ({
      id,
      sprite: traveller,
      frames: 4,
      frameMs: 170,
      path: [
        { at: 0, x: from, y: 92.5 },
        { at: 1, x: to, y: 92.5 },
      ],
      durationMs: 20000,
      everyMs: 56000,
      delayMs,
      faceTravel: true,
      baselineY: 146,
      groundShadows: [{ x: 26.5, y: 53, width: 28, depth: 3.5 }],
      hideForReducedMotion: true,
    })),
    // Crossing lanes are in front of the bench. Entire sprites start and
    // finish offscreen, with quiet gaps between passes; no teleport in view.
    {
      id: "passenger-businessman",
      sprite: businessman,
      frames: 4,
      frameMs: 150,
      path: [
        { at: 0, x: 322, y: 80 },
        { at: 1, x: -38, y: 80 },
      ],
      durationMs: 19167,
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
      frameMs: 183,
      path: [
        { at: 0, x: -64, y: 92 },
        { at: 1, x: 322, y: 92 },
      ],
      durationMs: 25833,
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
    // Matching painted housings, with live gate headers and larger city names.
    {
      id: "gate-sorrento",
      source: "gate:sorrento",
      x: 189,
      y: 17,
      gateBoard: { area: GATE_BOARD_AREAS.sorrento },
    },
    {
      id: "gate-london",
      source: "gate:london",
      x: 234,
      y: 17,
      gateBoard: { area: GATE_BOARD_AREAS.london },
    },
    {
      id: "gate-zurich",
      source: "gate:zurich",
      x: 284,
      y: 17,
      gateBoard: { area: GATE_BOARD_AREAS.zurich },
    },
    {
      id: "lost-and-found",
      source: "text:Lost & Found",
      baselineY: 97,
      x: 40,
      y: 32,
      align: "center",
      font: "small",
      color: "#171c1d",
    },
  ],
  exits: [
    {
      id: "gate-sorrento",
      to: "sorrento",
      entry: "fromHall",
      sprite: sorrentoGate,
      x: GATE_BOARD_AREAS.sorrento.x,
      y: GATE_BOARD_AREAS.sorrento.y,
      // The door and its header slot; the sign board above is the extra
      // hotspot, sharing the housing's registered rectangle.
      hotspot: { x: 176, y: 36, w: 26, h: 51 },
      extraHotspots: [GATE_BOARD_AREAS.sorrento],
      interactionPoint: { x: 189, y: 93, facing: "n" },
      look: `Gate ${COUNTRIES.sorrento.gate}: ${COUNTRIES.sorrento.name}, my hometown, where the journey began.`,
    },
    {
      id: "gate-london",
      to: "london",
      entry: "fromHall",
      sprite: londonGate,
      x: GATE_BOARD_AREAS.london.x,
      y: GATE_BOARD_AREAS.london.y,
      // The full door stays clear of the desk between Gates 2 and 3.
      hotspot: { x: 222, y: 36, w: 22, h: 51 },
      extraHotspots: [GATE_BOARD_AREAS.london],
      interactionPoint: { x: 234, y: 93, facing: "n" },
      look: `Gate ${COUNTRIES.london.gate}: ${COUNTRIES.london.name}, where I moved from Sorrento and learned the trade.`,
    },
    {
      id: "gate-zurich",
      to: "zurich",
      entry: "fromHall",
      sprite: zurichGate,
      x: GATE_BOARD_AREAS.zurich.x,
      y: GATE_BOARD_AREAS.zurich.y,
      hotspot: { x: 274, y: 36, w: 23, h: 51 },
      extraHotspots: [GATE_BOARD_AREAS.zurich],
      interactionPoint: { x: 284, y: 93, facing: "n" },
      look: `Gate ${COUNTRIES.zurich.gate}: ${COUNTRIES.zurich.name}, my current home after London.`,
    },
  ],
};
