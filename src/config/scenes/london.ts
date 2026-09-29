/**
 * London: a pub on a rainy evening, with the City through the window
 * (docs/art-spec.md, scene card `london`). Built in HB3 from the Phase H
 * layers: candidate 02 of `london-plate@hd` (the empty pub), and the table
 * with its two stools (01), the bar (02), the fruit machine (01) and the
 * door with its open state (01) as separate sprites, all painted at
 * density 2 (640x320, 2x nearest-neighbour, one 256-colour palette). Every
 * coordinate is in logical pixels (320x160), top-left origin; the art has
 * two pixels per logical px.
 *
 * The chalkboard behind the bar opens Skills: the engine letters "SKILLS" on
 * its header and nothing else, since lists belong in the content screen
 * (docs/expansion-plan.md, "Minimal in-world text"). The taps on the bar top
 * are a slot row with one tap per skill group, each naming its group on
 * hover, with its own "look at" joke (src/config/slotCopy.ts). The London job
 * photos hang as a 3 x 2 slot row on the bare red wall by the dartboard.
 *
 * The rain on the window and the fruit machine's chasing lamps are
 * procedural effects (`effects`), and the passing double-decker is a moving
 * prop (`props`) clipped to the stretch of window between the phone box and
 * the lamp post.
 *
 * Walking depth: the bar counter, the table with its two stools, and the
 * fruit machine stand out on the floor, each with a `baselineY` just above
 * its front feet. Their footprints are notches in the walkbox, so it stays
 * one polygon: he walks round the table and the bar in front (the window,
 * shelves and chalkboard behind them are as dark as his sweater), and
 * behind the bar's right end and the fruit machine, where the wall is red
 * panelling and the sprites sort in front of his legs. His depth is
 * measured against the painted furniture (see `depth`): 55 px tall at the
 * back of the floor and 66 at the front.
 *
 * Check it with the dev overlay: `npm run dev`, then `?debug=scene`.
 */
import { SECTIONS } from "../sections";
import type { SceneData, Vec } from "../../engine/types";
import londonBg from "../../assets/scenes/london/bg.png";
import londonObjBar from "../../assets/scenes/london/obj-bar.png";
import londonObjTable from "../../assets/scenes/london/obj-table.png";
import londonObjFruitMachine from "../../assets/scenes/london/obj-fruit-machine.png";
import londonObjDoor from "../../assets/scenes/london/obj-door.png";
import londonObjDoorOpen from "../../assets/scenes/london/obj-door@open.png";
import londonAnimBus from "../../assets/scenes/london/anim-bus.png";

const SKILLS = SECTIONS.skills.label;
const CONTACT = SECTIONS.contact.label;

/** Front feet of the free-standing furniture: the depth-sort lines. */
const TABLE_BASELINE = 113;
const BAR_BASELINE = 119;
const FRUIT_MACHINE_BASELINE = 123;

/** The bar top, where the taps stand (each tap's bottom row sits on it). */
const TAP_Y = 73.5;
/** Eight taps at 9 px, centred under the chalkboard (x 140-200). */
const TAP_X0 = 135;

/**
 * The fruit machine's nine gold lamps, three rows of three (the sprite sits
 * at 287,74), as 5 art px squares centred on the painted domes (which are
 * 7 px across, so a lit lamp keeps its gold rim), in reading order so the
 * chase runs along each row and down.
 */
const LAMP_SIZE = 2.5;
const FRUIT_LAMPS: Vec[] = [79, 85.2, 102.7].flatMap((y) =>
  [294, 301.5, 309].map((x): Vec => [x - LAMP_SIZE / 2, y - LAMP_SIZE / 2]),
);

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
  music: { src: "/audio/music/london.mp3", loopStart: 0.5, loopEnd: 72.5 },
  ambience: {
    src: "/audio/ambience/london.mp3",
    loopStart: 0.5,
    loopEnd: 32.5,
  },
  floor: "wood",
  // The floor from the baseboard (y 106) to the front edge. The table
  // (x 31-91, y 106-115) and the bar (x 99-254, y 106-119.5) are notches in
  // the back edge, so Daniele walks round them, in front, and never in front
  // of the dark window, shelves and chalkboard (his navy sweater would sink
  // into them: the contrast walk). The bar's right end (x 236-254) leaves a
  // strip of floor behind it, and so does the fruit machine (x 288-312, y
  // 113-124.5, a notch in the right edge), where the wall is red panelling:
  // he walks behind both and the sprites sort in front.
  walkbox: [
    [8, 106],
    [31, 106],
    [31, 115],
    [91, 115],
    [91, 106],
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
  ],
  // Daniele's height, measured against the painted furniture rather than the
  // shared world scale (58 to 72): the door (67 px, taken as 2.1 m), the
  // counter (34 px, 1.1 m), the table top (26 px up, 0.75 m) and the fruit
  // machine (51 px, 1.7 m) come to 30-35 px a metre at any depth, so a
  // 1.8 m man is 54-62 px at the floor lines of the door, table, bar and
  // machine (y 104-125). 55 px at the back and 66 at the front keeps him
  // within 10% of every one of them (worldScale.test.ts, london.test.ts).
  depth: { farY: 106, nearY: 158, ...LONDON_HEIGHTS },
  entryPoints: { fromHall: { x: 20, y: 113, facing: "e" } },
  entryLine: `London, where I learned the trade. ${SKILLS} are on tap.`,
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
      use: `Out of order. ${CONTACT} lives in Sorrento these days.`,
    },
    {
      id: "bottles",
      name: "bottles",
      hotspot: { x: 111, y: 14, w: 28, h: 88 },
      interactionPoint: { x: 125, y: 126, facing: "n" },
      look: "Spirits, sorted by colour, then by regret.",
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
      id: "chalkboard",
      name: "chalkboard menu",
      hotspot: { x: 139, y: 5, w: 61, h: 71 },
      interactionPoint: { x: 170, y: 126, facing: "n" },
      action: "skills",
      look: "Tonight's menu: every skill I've got, all on tap.",
    },
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
      y: 83,
      interactionPoint: { x: 61, y: 122, facing: "n" },
      baselineY: TABLE_BASELINE,
      look: "A permanent wobble. The beer mat under the leg is load-bearing.",
      use: "I'd sit down, but the chalkboard won't read itself.",
    },
    {
      id: "stool",
      name: "bar stool",
      // The table's right-hand stool; the table sprite carries both.
      hotspot: { x: 76, y: 95, w: 15, h: 21 },
      interactionPoint: { x: 97, y: 122, facing: "w" },
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
      look: "Polished by a century of elbows. Every tap pours a skill.",
      use: "Leaning like a regular. The barman pretends not to know me.",
    },
    {
      id: "fruit-machine",
      name: "fruit machine",
      sprite: londonObjFruitMachine,
      x: 287,
      y: 74,
      interactionPoint: { x: 277, y: 128, facing: "e" },
      baselineY: FRUIT_MACHINE_BASELINE,
      look: "The old vending machine's rowdier cousin. Three lemons pays nothing.",
      use: "Cherry, lemon, orange. Nothing. The house always wins.",
      sound: "fruit-machine",
    },
  ],
  effects: [
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
    {
      // The nine lamps chase in turn; sorts with the machine.
      kind: "lamps",
      id: "fruit-lamps",
      points: FRUIT_LAMPS,
      size: LAMP_SIZE,
      pattern: "chase",
      stepMs: 150,
      on: "#fff4b8",
      baselineY: FRUIT_MACHINE_BASELINE,
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
  slots: [
    {
      // One tap per skill group, standing on the bar top; sorts with the bar.
      // No caption: at 9 px spacing every name overlaps its neighbours (the
      // small font is 4 px a character), so each tap names its group on
      // hover.
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
      // Bare red panelling under the pendant lamps: two rows of three
      // frames, a lamp above each column.
      id: "job-photos",
      kind: "photo-frame",
      source: "jobs:london",
      positions: [
        [232, 34],
        [253, 34],
        [274, 34],
        [232, 54],
        [253, 54],
        [274, 54],
      ],
      fold: "slot-photo-frame-more",
    },
  ],
  labels: [
    {
      // Gilt lettering on the chalkboard's wooden header.
      id: "board-header",
      source: "section:skills",
      x: 170,
      y: 6,
      align: "center",
      font: "small",
      color: "#e0b040",
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
