/**
 * London: a rainy pub, painted at density 2 on a 320x160 logical grid.
 * The foreground table and its patrons sort at their feet, in front of
 * the bar. The floor connects behind and in front of the table via its
 * right-hand aisle. The jukebox occupies the old machine's footprint.
 * Rain and traffic stay behind the glass. A bored bartender works behind
 * the counter; clicking his section reveals Skills. Check with ?debug=scene.
 */
import { SECTIONS } from "../sections";
import type {
  SceneAnimation,
  SceneData,
  SceneObject,
} from "../../engine/types";
import londonBg from "../../assets/scenes/london/bg.png";
import londonObjBar from "../../assets/scenes/london/obj-bar.png";
import londonObjTable from "../../assets/scenes/london/obj-table.png";
import londonObjJukebox from "../../assets/scenes/london/obj-jukebox.png";
import londonObjDoor from "../../assets/scenes/london/obj-door.png";
import londonObjDoorOpen from "../../assets/scenes/london/obj-door@open.png";
import londonAnimBus from "../../assets/scenes/london/anim-bus.png";
import bartenderPour from "../../assets/scenes/london/anim-bartender-pour.png";
import bartenderWipe from "../../assets/scenes/london/anim-bartender-wipe.png";
import guestBoard from "../../assets/scenes/london/obj-guest-board.png";
import tap from "../../assets/shared/slots/slot-tap.png";

import tableWoman from "../../assets/scenes/london/anim-patron-table-woman.png";
import tableMan from "../../assets/scenes/london/anim-patron-table-man.png";
import barMan from "../../assets/scenes/london/anim-patron-bar-man.png";
import barWoman from "../../assets/scenes/london/anim-patron-bar-woman.png";

const SKILLS = SECTIONS.skills.label;
const CONTACT = SECTIONS.contact.label;

/** Front feet of the free-standing furniture: the depth-sort lines. */
const TABLE_BASELINE = 138;
const BAR_BASELINE = 119;
const JUKEBOX_BASELINE = 123;

/** The barman's body sorts behind the counter; his hands rest on its top. */
const BARTENDER_POSITION = {
  x: 146,
  y: 58,
  frames: 8,
  frameMs: 300,
  freezeForReducedMotion: true,
  baselineY: BAR_BASELINE - 0.1,
};

// Both strips have an 11.55 s cycle. Pour ends with a transparent hold; wipe
// starts with one. Exactly one body is visible, including under reduced motion.
const BARTENDERS: SceneAnimation[] = [
  {
    ...BARTENDER_POSITION,
    id: "bartender-pour",
    strip: bartenderPour,
    frameDurationsMs: [2600, 350, 900, 1200, 650, 400, 550, 4900],
  },
  {
    ...BARTENDER_POSITION,
    id: "bartender-wipe",
    strip: bartenderWipe,
    frameDurationsMs: [6650, 300, 250, 400, 250, 1000, 250, 2450],
  },
];

/** Clear working space around his animated tap and wiping hand. */
const TAPS: SceneObject[] = [135, 184, 195, 206].map((x, index) => ({
  id: `tap-${index + 1}`,
  name: "beer tap",
  sprite: tap,
  x,
  y: 73.5,
  baselineY: BAR_BASELINE,
  interactionPoint: { x: 185, y: 126, facing: "n" },
  action: "skills",
  look: "A well-rounded selection. The barman's enthusiasm is sold separately.",
}));

/** The window's glass, inside its wooden frame: the rain is clipped to it. */
const WINDOW_GLASS = { x: 33, y: 10, w: 76, h: 64 };

/** Daniele's standing height at the back and front of the floor, in px. */
const LONDON_HEIGHTS = { farHeight: 55, nearHeight: 66 } as const;

/** The stretch of window between the phone box and the lamp post. */
const BUS_VIEW = { x: 45, y: 40, w: 57, h: 30 };

export const LONDON_SCENE: SceneData = {
  id: "london",
  name: "London",
  background: londonBg,
  // Loop points from assets-src/provenance/music-london.json and
  // ambience-london.json.
  music: {
    src: "/audio/music/london.mp3",
    loopStart: 0.4,
    loopEnd: 77.2,
  },
  ambience: {
    src: "/audio/ambience/london.mp3",
    loopStart: 0.5,
    loopEnd: 32.5,
  },
  floor: "wood",
  // The table is a foreground notch from the left edge (y126-140).
  // Keep a corridor behind it and a route around its right stool so
  // Daniele can pass behind the seated pair, then emerge in front.
  // The counter and jukebox retain their own floor notches.
  walkbox: [
    [8, 106],
    [99, 106],
    [99, 119.5],
    [254, 119.5],
    [254, 112],
    [236, 112],
    [236, 106],
    [312, 106],
    [312, 113],
    [288, 113],
    [288, 124.5],
    [312, 124.5],
    [312, 158],
    [8, 158],
    [8, 140],
    [94, 140],
    [94, 126],
    [8, 126],
  ],
  // Daniele stays in proportion to the painted furniture at each floor
  // line: 55 px tall at the back, 66 at the front. The foreground table
  // has a 26 px tabletop height (0.75 m) at y140; the counter and jukebox
  // remain farther back. london.test.ts checks these proportions.
  depth: { farY: 106, nearY: 158, ...LONDON_HEIGHTS },
  entryPoints: { fromHall: { x: 20, y: 113, facing: "e" } },
  entryLine: `London, my next stop after Sorrento. ${SKILLS} are on tap.`,
  // Topmost last: nearer things come after the things behind them.
  objects: [
    {
      id: "window",
      name: "window",
      hotspot: { x: 30, y: 8, w: 82, h: 68 },
      interactionPoint: { x: 61, y: 122, facing: "n" },
      look: "St Paul's, the Gherkin and the Shard, queueing politely for sun.",
      use: "Open it, and the weather comes in and orders a pint.",
    },
    {
      id: "phone-box",
      name: "phone box",
      hotspot: { x: 34, y: 53, w: 11, h: 20 },
      interactionPoint: { x: 24, y: 112, facing: "n" },
      look: "Unused since 1998, and still the best-dressed thing on the street.",
      use: `Out of order. ${CONTACT} details are in the Sorrento scene.`,
    },
    {
      id: "bottles",
      name: "bottles",
      hotspot: { x: 111, y: 14, w: 28, h: 88 },
      interactionPoint: { x: 125, y: 126, facing: "n" },
      look: "Spirits, arranged by whoever closed last.",
      use: "Not while I'm working. This portfolio is always working.",
    },
    {
      id: "glasses",
      name: "pint glasses",
      hotspot: { x: 200, y: 14, w: 27, h: 88 },
      interactionPoint: { x: 214, y: 126, facing: "n" },
      look: "Each holds one pint and one strong opinion on tabs versus spaces.",
      use: "They're clean. I won't be the one to ruin that.",
    },
    {
      id: "back-bar",
      name: "back bar",
      hotspot: { x: 139, y: 5, w: 61, h: 71 },
      interactionPoint: { x: 185, y: 126, facing: "n" },
      action: "skills",
      look: "Skills acquired on the job. Others, on the rocks.",
    },
    {
      id: "bartender",
      name: "bored bartender",
      hotspot: { x: 149, y: 61, w: 27, h: 28 },
      interactionPoint: { x: 185, y: 126, facing: "n" },
      action: "skills",
      look: "He's polished that patch through three governments. Still waiting for a promotion.",
    },
    {
      id: "guest-board",
      name: "regulars' photo board",
      sprite: guestBoard,
      x: 231,
      y: 23,
      hotspot: { x: 231, y: 23, w: 61, h: 46 },
      interactionPoint: { x: 262, y: 123, facing: "n" },
      look: "The regulars. Immortalised in blurry photos and unpaid tabs.",
      use: "The dog is the only one here with a clean record.",
    },
    ...TAPS,
    {
      id: "dartboard",
      name: "dartboard",
      hotspot: { x: 298, y: 28, w: 18, h: 19 },
      interactionPoint: { x: 277, y: 118, facing: "e" },
      look: "The dart in the wallpaper is from my first sprint estimate.",
      use: "Thunk. Treble twenty! Or the wallpaper. Let's say treble twenty.",
      sound: "dart-thunk",
    },
    {
      id: "table",
      name: "table",
      sprite: londonObjTable,
      x: 30,
      y: 108,
      interactionPoint: { x: 61, y: 147, facing: "n" },
      baselineY: TABLE_BASELINE,
      look: "A permanent wobble. The beer mat under the leg is load-bearing.",
      use: "I'd sit down, but the barman might mistake me for a regular.",
    },
    {
      id: "stool",
      name: "bar stool",
      // The table's right-hand stool; the table sprite carries both.
      hotspot: { x: 76, y: 120, w: 15, h: 21 },
      interactionPoint: { x: 97, y: 145, facing: "w" },
      look: "Right where you'll trip over it. Traditional.",
      use: "I'll stand, thanks. Standing is how you get served.",
    },
    {
      id: "bar",
      name: "bar counter",
      sprite: londonObjBar,
      x: 97,
      y: 86.5,
      interactionPoint: { x: 140, y: 126, facing: "n" },
      baselineY: BAR_BASELINE,
      action: "skills",
      look: "Polished by a century of elbows. And one very bored man.",
      use: "Leaning like a regular. The barman pretends not to know me.",
    },
    {
      id: "jukebox",
      name: "jukebox",
      sprite: londonObjJukebox,
      x: 287,
      y: 74,
      interactionPoint: { x: 277, y: 128, facing: "e" },
      baselineY: JUKEBOX_BASELINE,
      pulse: { everyMs: 5000, durationMs: 650, compression: 0.01, anchorY: 49 },
      look: "All the hits, filed under: one more before we go.",
      use: "Already playing the house playlist. No skips, no subscriptions.",
    },
  ],
  // The bartender works behind the bar. His hands and props cross its top
  // edge, but stay behind the guests and Daniele. The table
  // pair sit on its existing stools; the rear-view guests carry their stools
  // in the strip and sort just in front of the counter. Their laps stay fixed.
  animations: [
    ...BARTENDERS.flatMap((animation) => [
      animation,
      {
        ...animation,
        id: `${animation.id}-countertop`,
        clip: { x: 146, y: 86.5, w: 32, h: 4 },
        baselineY: BAR_BASELINE + 0.05,
      },
    ]),
    {
      id: "patron-table-woman",
      strip: tableWoman,
      x: 30,
      y: 90,
      baselineY: TABLE_BASELINE + 0.1,
      frames: 4,
      frameMs: 420,
      everyMs: 9400,
      phaseMs: 2800,
      freezeForReducedMotion: true,
      idle: { splitY: 31, rise: 0.5, periodMs: 4100, phaseMs: 200 },
    },
    {
      id: "patron-table-man",
      strip: tableMan,
      x: 68,
      y: 90,
      baselineY: TABLE_BASELINE + 0.1,
      frames: 4,
      frameMs: 500,
      everyMs: 11700,
      phaseMs: 5700,
      freezeForReducedMotion: true,
      idle: { splitY: 31, rise: 0.5, periodMs: 4700, phaseMs: 1400 },
    },
    {
      id: "patron-bar-man",
      strip: barMan,
      x: 108,
      y: 64,
      baselineY: BAR_BASELINE + 0.1,
      frames: 4,
      frameMs: 480,
      everyMs: 10300,
      phaseMs: 700,
      freezeForReducedMotion: true,
      idle: { splitY: 27, rise: 0.5, periodMs: 4400, phaseMs: 2400 },
    },
    {
      id: "patron-bar-woman",
      strip: barWoman,
      x: 221,
      y: 64,
      baselineY: BAR_BASELINE + 0.1,
      frames: 4,
      frameMs: 450,
      everyMs: 12900,
      phaseMs: 8400,
      freezeForReducedMotion: true,
      idle: { splitY: 28, rise: 0.5, periodMs: 3900, phaseMs: 900 },
    },
  ],
  effects: [
    {
      kind: "music-notes",
      id: "jukebox-notes",
      x: 299,
      y: 73.5,
      colors: ["#e6c77c", "#a8c0a2"],
      baselineY: JUKEBOX_BASELINE + 0.1,
      hideForReducedMotion: true,
    },
    {
      // Slow far drops and fast near ones, hard-edged, over the glass.
      kind: "rain",
      id: "rain-far",
      area: WINDOW_GLASS,
      drops: 14,
      speed: 60,
      length: 4,
      slant: 12,
      color: "#6e88b4",
      clip: WINDOW_GLASS,
    },
    {
      kind: "rain",
      id: "rain-near",
      area: WINDOW_GLASS,
      drops: 12,
      speed: 105,
      length: 6,
      slant: 12,
      color: "#b4c8e8",
      clip: WINDOW_GLASS,
    },
  ],
  props: [
    {
      // The double-decker crawls along the far embankment, between the phone
      // box and the lamp post (it is drawn over the plate, so the clip keeps
      // it from crossing them), one pass in twelve seconds.
      id: "bus",
      sprite: londonAnimBus,
      path: [
        { at: 0, x: 19, y: 51 },
        { at: 1, x: 102, y: 51 },
      ],
      durationMs: 7000,
      everyMs: 15000,
      delayMs: 2500,
      clip: BUS_VIEW,
    },
  ],
  exits: [
    {
      id: "door-hall",
      to: "hall",
      entry: "fromLondon",
      name: "the airport",
      sprite: londonObjDoor,
      states: { open: londonObjDoorOpen },
      x: 1,
      y: 37,
      hotspot: { x: 2, y: 37, w: 28, h: 67 },
      interactionPoint: { x: 16, y: 111, facing: "n" },
      look: "Back to the airport. Mind the gap, and the puddle.",
    },
  ],
};
