/**
 * London: a pub on a rainy evening, with the City through the window
 * (docs/art-spec.md, scene card `london`). Built in task B3 from candidate 05
 * of `london-bg`, and remastered at 2x density in RB3 from candidate 02 of
 * `london-bg@2x`. Every coordinate is in logical pixels (320x160), top-left
 * origin; the 640x320 art is drawn at twice that density.
 *
 * The chalkboard behind the bar opens Skills: the engine letters "SKILLS" on
 * its header and chalks the menu (one line per skill group) below it. The
 * taps on the bar top are a slot row with one tap per skill group, each with
 * its own hotspot and "look at" joke (src/config/slotCopy.ts). The London job
 * photos hang as a 3 x 2 slot row on the bare wallpaper by the dartboard.
 *
 * Walking depth: the bar counter, the table with its two stools, and the
 * fruit machine stand out on the floor, each with a `baselineY` on its front
 * feet. The walkbox is one polygon with keyhole slits from its back edge, so
 * their footprints are holes and Daniele walks behind them (behind the bar,
 * like the barman) or in front. The stool in the bottom-left is `fg.png`.
 *
 * Check it with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import { SECTIONS } from "../sections";
import type { SceneData } from "../../engine/types";
import londonBg from "../../assets/scenes/london/bg.png";
import londonFg from "../../assets/scenes/london/fg.png";
import londonObjBar from "../../assets/scenes/london/obj-bar.png";
import londonObjTable from "../../assets/scenes/london/obj-table.png";
import londonObjFruitMachine from "../../assets/scenes/london/obj-fruit-machine.png";
import londonObjDoor from "../../assets/scenes/london/obj-door.png";
import londonObjDoorOpen from "../../assets/scenes/london/obj-door@open.png";
import londonAnimRain from "../../assets/scenes/london/anim-rain.png";
import londonAnimBus from "../../assets/scenes/london/anim-bus.png";
import londonAnimLights from "../../assets/scenes/london/anim-lights.png";

const SKILLS = SECTIONS.skills.label;
const CONTACT = SECTIONS.contact.label;

/** Front feet of the free-standing furniture: the depth-sort lines. */
const TABLE_BASELINE = 121;
const BAR_BASELINE = 126;
const FRUIT_MACHINE_BASELINE = 133;

/** The bar top, where the taps stand (each tap's bottom row sits on it). */
const TAP_Y = 81;
/** Eight taps at 9 px, centred under the chalkboard (x 140-204). */
const TAP_X0 = 137;

export const LONDON_SCENE: SceneData = {
  id: "london",
  name: "London",
  background: londonBg,
  foreground: londonFg,
  // Loop points from assets-src/provenance/music-london.json and
  // ambience-london.json.
  music: { src: "/audio/music/london.mp3", loopStart: 0.5, loopEnd: 72.5 },
  ambience: {
    src: "/audio/ambience/london.mp3",
    loopStart: 0.5,
    loopEnd: 32.5,
  },
  floor: "wood",
  // The floor from the baseboard (y 109) to the front edge, less the
  // foreground stool's corner. Keyhole slits (x 60 and x 180) cut out the
  // footprints of the table and stools (x 34-92, y 113-122) and the bar
  // (x 99-259, y 118-127); the fruit machine's footprint (x 289-316,
  // y 124-135) is a notch in the right edge.
  walkbox: [
    [4, 109],
    [60, 109],
    [60, 113],
    [34, 113],
    [34, 122],
    [92, 122],
    [92, 113],
    [60, 113],
    [60, 109],
    [180, 109],
    [180, 118],
    [99, 118],
    [99, 127],
    [259, 127],
    [259, 118],
    [180, 118],
    [180, 109],
    [316, 109],
    [316, 124],
    [289, 124],
    [289, 135],
    [316, 135],
    [316, 158],
    [32, 158],
    [32, 125],
    [4, 123],
  ],
  depth: { farY: 109, nearY: 158, farScale: 0.7, nearScale: 1.0 },
  entryPoints: { fromHall: { x: 22, y: 115, facing: "e" } },
  entryLine: `London, where I learned the trade. ${SKILLS} are on the chalkboard, and every one of them is on tap.`,
  // Topmost last: nearer things come after the things behind them.
  objects: [
    {
      id: "window",
      name: "window",
      hotspot: { x: 37, y: 13, w: 74, h: 65 },
      interactionPoint: { x: 72, y: 111, facing: "n" },
      look: "The City in the rain: St Paul's, the Gherkin and the Shard, all queueing politely for a sunny day.",
      use: "If I open it, the weather comes in and orders a pint.",
    },
    {
      id: "phone-box",
      name: "phone box",
      hotspot: { x: 39, y: 56, w: 8, h: 21 },
      interactionPoint: { x: 46, y: 111, facing: "n" },
      look: "A red phone box. Nobody has made a call from it since 1998, but it's still the best-dressed thing on the street.",
      use: `Out of reach, and out of order. ${CONTACT} lives in Sorrento these days.`,
    },
    {
      id: "bottles",
      name: "bottles",
      hotspot: { x: 112, y: 16, w: 27, h: 78 },
      interactionPoint: { x: 125, y: 113, facing: "n" },
      look: "Spirits, sorted by colour, then by regret.",
      use: "Not while I'm working. And this portfolio is always working.",
    },
    {
      id: "glasses",
      name: "pint glasses",
      hotspot: { x: 206, y: 16, w: 27, h: 78 },
      interactionPoint: { x: 219, y: 113, facing: "n" },
      look: "Pint glasses, polished and stacked. Each one holds exactly one pint and one strong opinion about tabs versus spaces.",
      use: "They're clean. Somebody has to be the first to ruin that, and it won't be me.",
    },
    {
      id: "chalkboard",
      name: "chalkboard menu",
      hotspot: { x: 140, y: 6, w: 65, h: 75 },
      interactionPoint: { x: 172, y: 131, facing: "n" },
      action: "skills",
      look: "Tonight's menu, chalked up fresh: every skill I've got, and all of them on tap.",
    },
    {
      id: "dartboard",
      name: "dartboard",
      hotspot: { x: 300, y: 33, w: 20, h: 18 },
      interactionPoint: { x: 282, y: 120, facing: "e" },
      look: "A dartboard. The dart in the wallpaper is from my first sprint estimate.",
      use: "Thunk. Treble twenty! Or the wallpaper. Let's call it treble twenty.",
      sound: "dart-thunk",
    },
    {
      id: "table",
      name: "table",
      sprite: londonObjTable,
      x: 28,
      y: 88,
      interactionPoint: { x: 63, y: 127, facing: "n" },
      baselineY: TABLE_BASELINE,
      look: "A pub table with a permanent wobble. The beer mat under the leg is load-bearing.",
      use: "I'd sit down, but the chalkboard won't read itself.",
    },
    {
      id: "bar",
      name: "bar counter",
      sprite: londonObjBar,
      x: 100,
      y: 94,
      interactionPoint: { x: 140, y: 131, facing: "n" },
      baselineY: BAR_BASELINE,
      look: "Polished by a century of elbows. Every tap on it pours a different skill.",
      use: "I lean on it with the confidence of a regular. The barman pretends not to know me.",
    },
    {
      id: "fruit-machine",
      name: "fruit machine",
      sprite: londonObjFruitMachine,
      x: 290,
      y: 81,
      interactionPoint: { x: 282, y: 132, facing: "e" },
      baselineY: FRUIT_MACHINE_BASELINE,
      look: "A fruit machine: the old vending machine's rowdier cousin. Three lemons pays out nothing, just like my first side project.",
      use: "Cherry, lemon, orange. Nothing. The house always wins, and the house is a very small pub.",
      sound: "fruit-machine",
    },
    {
      id: "stool",
      name: "bar stool",
      hotspot: { x: 0, y: 126, w: 30, h: 34 },
      look: "A bar stool, right where you'll trip over it. Traditional.",
      use: "I'll stand, thanks. Standing is how you get served.",
    },
  ],
  animations: [
    {
      // Behind the phone box (clip starts right of it) and the lamp post.
      id: "bus",
      strip: londonAnimBus,
      frames: 2,
      x: 21,
      y: 56,
      frameMs: 160,
      motion: { dx: 88, dy: 0, durationMs: 5200 },
      everyMs: 14000,
      clip: { x: 47, y: 32, w: 60, h: 46 },
    },
    {
      // Sparse, hard-edged streaks over the glass, skipping the glazing bars.
      id: "rain",
      strip: londonAnimRain,
      frames: 4,
      x: 37,
      y: 13,
      frameMs: 120,
    },
    {
      // The fruit machine's nine lamps, chasing in threes; sorts with it.
      id: "lights",
      strip: londonAnimLights,
      frames: 4,
      x: 295,
      y: 85,
      frameMs: 260,
      baselineY: FRUIT_MACHINE_BASELINE,
    },
  ],
  slots: [
    {
      // One tap per skill group, standing on the bar top; sorts with the bar.
      // No caption: at 9 px spacing every name overlaps its neighbours (the
      // small font is 4 px a character), so the chalkboard menu lists the
      // groups and each tap names its group on hover.
      id: "taps",
      kind: "tap",
      source: "skills:groups",
      positions: Array.from(
        { length: 8 },
        (_, i) => [TAP_X0 + 9 * i, TAP_Y] as const,
      ),
      fold: "slot-tap-more",
      baselineY: BAR_BASELINE,
    },
    {
      // Bare wallpaper under the picture lights: two rows of three frames.
      id: "job-photos",
      kind: "photo-frame",
      source: "jobs:london",
      positions: [
        [238, 34],
        [260, 34],
        [282, 34],
        [238, 54],
        [260, 54],
        [282, 54],
      ],
      fold: "slot-photo-frame-more",
    },
  ],
  labels: [
    {
      // Gilt lettering on the chalkboard's wooden header.
      id: "board-header",
      source: "section:skills",
      x: 172,
      y: 8,
      align: "center",
      font: "small",
      color: "#e0b040",
    },
    {
      // Chalked on the board: "On tap", then one line per skill group.
      id: "menu",
      source: "skills:menu",
      x: 172,
      y: 17,
      align: "center",
      font: "small",
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
      x: 6,
      y: 44,
      hotspot: { x: 6, y: 44, w: 24, h: 64 },
      interactionPoint: { x: 18, y: 111, facing: "n" },
      look: "The way back to the airport. Mind the gap, and the puddle on the step.",
    },
  ],
};
