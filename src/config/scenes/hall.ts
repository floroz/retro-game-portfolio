/**
 * The Hall: a 1990s airport departure lounge (docs/art-spec.md, scene card
 * `hall`). Built in task B2 from `hall-bg` candidate 01, and remastered at 2x
 * density in RB2 from `hall-bg@2x` candidate 04. Every coordinate is in
 * logical pixels (320x160), top-left origin; the art is 640x320.
 *
 * Signposting, kept minimal (docs/expansion-plan.md, "How visitors know where
 * each section is"): the three gates are the exits, each under a hanging
 * sign with its gate number and city only (`gate:<country>`). The departures
 * board lists the cities, and the duty-free shelf sells one unlabelled
 * product per section. Hovering names the sections in the status line, and
 * the toolbar's country badges carry the rest.
 *
 * Walking depth: the row of seats and the security arch stand out on the
 * carpet, each with a `baselineY` on its front feet. The walkbox is one
 * polygon with keyhole slits from its back edge (the seats' footprint, and
 * each post of the arch), so Daniele walks behind them, in front of them, and
 * through the arch. The pillar and the rubber plant are `fg.png`.
 *
 * Check it with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import { PROFILE } from "../profile";
import { COUNTRIES } from "../sections";
import type { SceneData } from "../../engine/types";
import hallBg from "../../assets/scenes/hall/bg.png";
import hallFg from "../../assets/scenes/hall/fg.png";
import hallObjSeats from "../../assets/scenes/hall/obj-seats.png";
import hallObjArch from "../../assets/scenes/hall/obj-arch.png";
import hallAnimBoard from "../../assets/scenes/hall/anim-board.png";
import hallAnimPlane from "../../assets/scenes/hall/anim-plane.png";

/** Front feet of the free-standing objects: the depth-sort lines. */
const SEATS_BASELINE = 120;
const ARCH_BASELINE = 128;

/** The year of the oldest job in the profile, for the whisky's label. */
const FIRST_YEAR =
  PROFILE.workExperience[PROFILE.workExperience.length - 1].period.match(
    /\d{4}/,
  )?.[0] ?? "";

export const HALL_SCENE: SceneData = {
  id: "hall",
  name: "the airport",
  background: hallBg,
  foreground: hallFg,
  // Loop points from assets-src/provenance/music-hall.json and
  // ambience-hall.json.
  music: { src: "/audio/music/hall.mp3", loopStart: 0.6, loopEnd: 77.4 },
  ambience: { src: "/audio/ambience/hall.mp3", loopStart: 0.5, loopEnd: 40.5 },
  floor: "carpet",
  // The carpet from the window skirting (y 93) to the front edge, set back
  // in front of the duty-free counter, less the plant pot. Keyhole slits cut
  // out the seats (x 143-225, y 111-122) and the arch's two posts
  // (x 248-256 and x 273-281, y 122-129); the gap between the posts is
  // walkable.
  walkbox: [
    [92, 93],
    [184, 93],
    [184, 111],
    [143, 111],
    [143, 122],
    [225, 122],
    [225, 111],
    [184, 111],
    [184, 93],
    [252, 93],
    [252, 122],
    [248, 122],
    [248, 129],
    [256, 129],
    [256, 122],
    [252, 122],
    [252, 93],
    [277, 93],
    [277, 122],
    [273, 122],
    [273, 129],
    [281, 129],
    [281, 122],
    [277, 122],
    [277, 93],
    [306, 93],
    [306, 132],
    [287, 132],
    [287, 158],
    [4, 158],
    [4, 104],
    [90, 104],
  ],
  depth: { farY: 93, nearY: 158, farScale: 0.7, nearScale: 1.0 },
  entryPoints: {
    start: { x: 128, y: 134, facing: "s" },
    fromLondon: { x: 193, y: 96, facing: "s" },
    fromZurich: { x: 239, y: 96, facing: "s" },
    fromSorrento: { x: 288, y: 96, facing: "s" },
  },
  entryLine: "Welcome aboard! Pick a gate, or use the toolbar.",
  // Topmost last: nearer things come after the things behind them.
  objects: [
    {
      id: "board",
      name: "departures board",
      hotspot: { x: 2, y: 2, w: 133, h: 27 },
      look: "Three flights, all on time. Clearly a work of fiction.",
      use: "The flaps only ever flip to DELAYED.",
    },
    {
      id: "monitors",
      name: "flight monitors",
      hotspot: { x: 98, y: 31, w: 32, h: 13 },
      look: "The big board again, only smaller and with more static.",
      use: "A gentle thump. That's how we fixed things in the nineties.",
    },
    {
      id: "airliner",
      name: "parked airliner",
      hotspot: { x: 100, y: 44, w: 74, h: 34 },
      look: "No logo on it. Either very exclusive, or very budget.",
      use: "I can't board through the glass. I've tried. Twice.",
    },
    {
      id: "duty-free",
      name: "duty-free shop",
      hotspot: { x: 0, y: 29, w: 88, h: 9 },
      look: "Duty free: lower prices, and somehow you still spend more.",
      use: "Pick a product. Each one opens a section.",
    },
    {
      id: "perfume",
      name: "Eau de Résumé",
      hotspot: { x: 4, y: 40, w: 23, h: 20 },
      interactionPoint: { x: 16, y: 106, facing: "n" },
      action: "resume",
      look: "Eau de Résumé: notes of achievement and printer toner.",
    },
    {
      id: "snow-globe",
      name: "Vesuvius snow globe",
      hotspot: { x: 32, y: 40, w: 21, h: 20 },
      interactionPoint: { x: 42, y: 106, facing: "n" },
      action: "about",
      look: "Snow on Vesuvius: rarer than a bargain in here.",
    },
    {
      id: "postcards",
      name: "postcards",
      hotspot: { x: 55, y: 40, w: 28, h: 20 },
      interactionPoint: { x: 69, y: 106, facing: "n" },
      action: "contact",
      look: "Stamps already on. Drop me a line: I always write back.",
    },
    {
      id: "whisky",
      name: `whisky, aged since ${FIRST_YEAR}`,
      hotspot: { x: 4, y: 60, w: 39, h: 21 },
      interactionPoint: { x: 23, y: 106, facing: "n" },
      action: "experience",
      look: `Matured since ${FIRST_YEAR} in London and Zurich oak. Long TypeScript finish.`,
    },
    {
      id: "toolbox",
      name: "toolbox of skills",
      hotspot: { x: 51, y: 60, w: 24, h: 21 },
      interactionPoint: { x: 63, y: 106, facing: "n" },
      action: "skills",
      look: "Every skill I pack for a trip. Hand luggage only, somehow.",
    },
    {
      id: "carousel",
      name: "luggage carousel",
      hotspot: { x: 88, y: 69, w: 50, h: 22 },
      interactionPoint: { x: 114, y: 96, facing: "n" },
      look: "Going round since 1994, and still empty.",
      use: "Everyone's bag comes out first except yours. That's the rule.",
    },
    {
      id: "lost-luggage",
      name: "lost-luggage desk",
      hotspot: { x: 140, y: 68, w: 21, h: 24 },
      interactionPoint: { x: 150, y: 96, facing: "n" },
      look: "One unclaimed suitcase. Not mine: all my baggage is emotional.",
      use: "Ding! Nobody came. Probably lost as well.",
    },
    {
      id: "seats",
      name: "row of seats",
      sprite: hallObjSeats,
      x: 145,
      y: 98,
      interactionPoint: { x: 184, y: 128, facing: "n" },
      baselineY: SEATS_BASELINE,
      look: "An armrest every fifty centimetres, so nobody can ever lie down.",
      use: "If I sit down now, I'll wake up in 2031.",
    },
    {
      id: "arch",
      name: "security arch",
      sprite: hallObjArch,
      x: 249,
      y: 70,
      interactionPoint: { x: 265, y: 136, facing: "n" },
      baselineY: ARCH_BASELINE,
      look: "Please remove your laptop, your belt, and your technical debt.",
      use: "Beep. It's always the belt buckle.",
    },
    {
      id: "plant",
      name: "rubber plant",
      hotspot: { x: 284, y: 94, w: 36, h: 66 },
      interactionPoint: { x: 281, y: 142, facing: "e" },
      look: "Waiting longer than anyone: its flight was cancelled in 1997.",
      use: "I watered it. The only happy passenger here.",
    },
  ],
  animations: [
    {
      // Flaps flutter over the board's first columns; the engine letters on top.
      id: "board",
      strip: hallAnimBoard,
      frames: 4,
      x: 4,
      y: 5,
      frameMs: 100,
      everyMs: 12000,
      sound: "split-flap",
    },
    {
      // A plane taking off beyond the right-hand pane, over the horizon.
      id: "plane",
      strip: hallAnimPlane,
      frames: 1,
      x: 168,
      y: 50,
      frameMs: 1000,
      everyMs: 15000,
      motion: { dx: -40, dy: -34, durationMs: 3500 },
      clip: { x: 137, y: 9, w: 37, h: 42 },
    },
  ],
  labels: [
    // Hanging gate signs: "GATE 1" and the city, centred on each panel and
    // set to fit inside it (London's panel is x 176-210, Zurich's 215-264,
    // Sorrento's 269-307).
    {
      id: "gate-london",
      source: "gate:london",
      maxWidth: 32,
      x: 193,
      y: 22,
      align: "center",
      font: "small",
    },
    {
      id: "gate-zurich",
      source: "gate:zurich",
      maxWidth: 46,
      x: 239,
      y: 22,
      align: "center",
      font: "small",
    },
    {
      id: "gate-sorrento",
      source: "gate:sorrento",
      maxWidth: 36,
      x: 287,
      y: 22,
      align: "center",
      font: "small",
    },
    { id: "departures", source: "departures", x: 6, y: 7, font: "small" },
    {
      id: "duty-free",
      source: "text:Duty free",
      x: 43,
      y: 31,
      align: "center",
      font: "small",
    },
  ],
  exits: [
    {
      id: "gate-london",
      to: "london",
      entry: "fromHall",
      // The door and its desk: nothing else is under this column. The
      // sign's bevelled frame starts 2 px further left (x 172-211).
      hotspot: { x: 174, y: 13, w: 39, h: 76 },
      extraHotspots: [{ x: 172, y: 13, w: 41, h: 32 }],
      interactionPoint: { x: 193, y: 95, facing: "n" },
      look: `Gate ${COUNTRIES.london.gate}: ${COUNTRIES.london.name}, where I learned the trade.`,
    },
    {
      id: "gate-zurich",
      to: "zurich",
      entry: "fromHall",
      // The door column stops short of the arch (x 249); the sign, which
      // hangs well above the arch, is clickable across its full width.
      hotspot: { x: 213, y: 13, w: 36, h: 76 },
      extraHotspots: [{ x: 213, y: 13, w: 54, h: 32 }],
      interactionPoint: { x: 239, y: 95, facing: "n" },
      look: `Gate ${COUNTRIES.zurich.gate}: ${COUNTRIES.zurich.name}, where the career grew.`,
    },
    {
      id: "gate-sorrento",
      to: "sorrento",
      entry: "fromHall",
      // As for Zurich: the door column starts right of the arch (x 281),
      // and the sign is clickable across its full width (x 267-309).
      hotspot: { x: 281, y: 13, w: 27, h: 76 },
      extraHotspots: [{ x: 267, y: 13, w: 43, h: 32 }],
      interactionPoint: { x: 288, y: 95, facing: "n" },
      look: `Gate ${COUNTRIES.sorrento.gate}: ${COUNTRIES.sorrento.name}, for now and next.`,
    },
  ],
};
