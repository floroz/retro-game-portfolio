/**
 * The Hall: a 1990s airport departure lounge (docs/art-spec.md, scene card
 * `hall`). Built in task B2 from `hall-bg` candidate 01. Every coordinate is
 * in native pixels (320x160), top-left origin.
 *
 * Signposting: the three gates are the exits, each under a hanging sign the
 * engine letters with its country and sections (`gate:<country>`). The
 * departures board repeats the same pairing, and the duty-free shelf sells
 * one product per section, each with its section lettered on the shelf lip.
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
import { COUNTRIES, SECTIONS, sectionList } from "../sections";
import type { SceneData, SceneLabel } from "../../engine/types";
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

/** Section names lettered on the duty-free shelf lips (two shelves). */
const SHELF_LABELS: SceneLabel[] = (
  [
    ["resume", 15, 54],
    ["about", 42, 54],
    ["contact", 69, 54],
    ["experience", 23, 75],
    ["skills", 63, 75],
  ] as const
).map(([section, x, y]) => ({
  id: `shelf-${section}`,
  source: `section:${section}`,
  x,
  y,
  align: "center",
  font: "small",
}));

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
  entryLine:
    "Welcome to the airport! Each gate flies to a country and its sections. In a hurry? The duty-free shelf sells every section, no boarding pass needed.",
  // Topmost last: nearer things come after the things behind them.
  objects: [
    {
      id: "board",
      name: "departures board",
      hotspot: { x: 2, y: 2, w: 133, h: 27 },
      look: "The departures board. Three flights, every one of them on time. Clearly a work of fiction.",
      use: "I'd change a flap, but they only ever flip to DELAYED.",
    },
    {
      id: "monitors",
      name: "flight monitors",
      hotspot: { x: 98, y: 31, w: 31, h: 13 },
      look: "Two CRT flight monitors. Same information as the big board, only smaller and with more static.",
      use: "I gave one a gentle thump. That's how we fixed things in the nineties.",
    },
    {
      id: "airliner",
      name: "parked airliner",
      hotspot: { x: 100, y: 44, w: 74, h: 34 },
      look: "An airliner with no logo on it. Either very exclusive or very, very budget.",
      use: "I can't board through the glass. I've tried. Twice.",
    },
    {
      id: "duty-free",
      name: "duty-free shop",
      hotspot: { x: 0, y: 29, w: 88, h: 9 },
      look: "Duty free: the only shop where the prices are lower and you still spend more. One product per section, all in stock.",
      use: "Everything's on the shelves. Pick a product and it opens its section.",
    },
    {
      id: "perfume",
      name: "Eau de Résumé",
      hotspot: { x: 4, y: 40, w: 23, h: 20 },
      interactionPoint: { x: 16, y: 106, facing: "n" },
      action: "resume",
      look: `Eau de Résumé: a fragrance of achievements, with notes of printer toner. Also stocked in the ${COUNTRIES.zurich.name} office's filing cabinet.`,
    },
    {
      id: "snow-globe",
      name: "Vesuvius snow globe",
      hotspot: { x: 32, y: 40, w: 21, h: 20 },
      interactionPoint: { x: 42, y: 106, facing: "n" },
      action: "about",
      look: "Snow on Vesuvius: the least likely thing in this shop, after a bargain. Shake it to find out all about me.",
    },
    {
      id: "postcards",
      name: "postcards",
      hotspot: { x: 55, y: 40, w: 28, h: 20 },
      interactionPoint: { x: 69, y: 106, facing: "n" },
      action: "contact",
      look: "Postcards with the stamp already on. Drop me a line: I always write back.",
    },
    {
      id: "whisky",
      name: `whisky, aged since ${FIRST_YEAR}`,
      hotspot: { x: 4, y: 60, w: 39, h: 21 },
      interactionPoint: { x: 23, y: 106, facing: "n" },
      action: "experience",
      look: `Aged Experience, matured since ${FIRST_YEAR} in London and then Zurich oak. Smooth, with a long TypeScript finish.`,
    },
    {
      id: "toolbox",
      name: "toolbox of skills",
      hotspot: { x: 51, y: 60, w: 24, h: 21 },
      interactionPoint: { x: 63, y: 106, facing: "n" },
      action: "skills",
      look: "A toolbox with every skill I pack for a trip. Hand luggage only, somehow.",
    },
    {
      id: "carousel",
      name: "luggage carousel",
      hotspot: { x: 88, y: 69, w: 50, h: 22 },
      interactionPoint: { x: 114, y: 96, facing: "n" },
      look: "The luggage carousel. It has been going round since 1994, and it's still empty.",
      use: "I'll wait. Everyone's bag comes out first except yours. That's the rule.",
    },
    {
      id: "lost-luggage",
      name: "lost-luggage desk",
      hotspot: { x: 140, y: 68, w: 21, h: 24 },
      interactionPoint: { x: 150, y: 96, facing: "n" },
      look: "The lost-luggage desk, with one unclaimed suitcase. It isn't mine. All my baggage is emotional.",
      use: "Ding! Nobody came. Probably lost as well.",
    },
    {
      id: "seats",
      name: "row of seats",
      sprite: hallObjSeats,
      x: 145,
      y: 99,
      interactionPoint: { x: 184, y: 128, facing: "n" },
      baselineY: SEATS_BASELINE,
      look: "Airport seating, with an armrest every fifty centimetres so that nobody can ever lie down. Ever.",
      use: "Later. If I sit down now, I'll wake up in 2031 with a sore neck.",
    },
    {
      id: "arch",
      name: "security arch",
      sprite: hallObjArch,
      x: 249,
      y: 70,
      interactionPoint: { x: 265, y: 136, facing: "n" },
      baselineY: ARCH_BASELINE,
      look: "The security arch. Please remove your laptop, your belt, and your technical debt.",
      use: "Beep. It's the belt buckle. It's always the belt buckle.",
    },
    {
      id: "plant",
      name: "rubber plant",
      hotspot: { x: 284, y: 94, w: 36, h: 66 },
      interactionPoint: { x: 281, y: 142, facing: "e" },
      look: "A rubber plant. It has been waiting here longer than anyone: its flight was cancelled in 1997.",
      use: "I watered it. It's the only passenger here who's happy with the service.",
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
    // Hanging gate signs: "GATE 1", the city, then its sections with icons.
    {
      id: "gate-london",
      source: "gate:london",
      x: 193,
      y: 19,
      align: "center",
      font: "small",
    },
    {
      id: "gate-zurich",
      source: "gate:zurich",
      x: 239,
      y: 16,
      align: "center",
      font: "small",
    },
    {
      id: "gate-sorrento",
      source: "gate:sorrento",
      x: 287,
      y: 16,
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
    ...SHELF_LABELS,
  ],
  exits: [
    {
      id: "gate-london",
      to: "london",
      entry: "fromHall",
      hotspot: { x: 175, y: 13, w: 37, h: 76 },
      interactionPoint: { x: 193, y: 95, facing: "n" },
      look: `Gate ${COUNTRIES.london.gate}, to ${COUNTRIES.london.name}, where I learned the trade. ${sectionList("london")} on the chalkboard behind the bar.`,
    },
    {
      id: "gate-zurich",
      to: "zurich",
      entry: "fromHall",
      hotspot: { x: 213, y: 13, w: 36, h: 76 },
      interactionPoint: { x: 239, y: 95, facing: "n" },
      look: `Gate ${COUNTRIES.zurich.gate}, to ${COUNTRIES.zurich.name}, where the career grew: ${SECTIONS.experience.label} on the CRT, my ${SECTIONS.resume.label} in the filing cabinet.`,
    },
    {
      id: "gate-sorrento",
      to: "sorrento",
      entry: "fromHall",
      hotspot: { x: 281, y: 13, w: 27, h: 76 },
      interactionPoint: { x: 288, y: 95, facing: "n" },
      look: `Gate ${COUNTRIES.sorrento.gate}, to ${COUNTRIES.sorrento.name}: now and next. ${SECTIONS.about.label} on the fridge, ${SECTIONS.contact.label} by the wall phone.`,
    },
  ],
};
