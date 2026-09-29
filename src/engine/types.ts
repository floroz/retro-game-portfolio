/**
 * Scene data contract (docs/art-spec.md, "Scene data contract").
 *
 * The engine reads these shapes and the build tasks write them, one file per
 * scene in `src/config/scenes/<scene>.ts`. Every coordinate is in native,
 * or logical, pixels (320x160) with a top-left origin, whatever the density
 * of the art: the engine works out each image's density from its size
 * (density.ts) and scales when it draws, so remastered art at density 2
 * replaces the old files with no change here.
 */

/** Walkable scenes. The travel map is a transition, not a scene you walk in. */
export type SceneId = "hall" | "london" | "zurich" | "sorrento";

/** The three country scenes, each reached from a Hall gate. */
export type CountrySceneId = Exclude<SceneId, "hall">;

/** Content sections, each opened by a primary object in its country scene. */
export type SectionId =
  | "about"
  | "skills"
  | "experience"
  | "contact"
  | "resume";

/** The `country` recorded on each job in `profile.ts`. */
export type JobCountry = "london" | "switzerland" | "italy";

/** East, west, north (away from the viewer), south (towards the viewer). */
export type Facing = "n" | "s" | "e" | "w";

/** A point as `[x, y]`, as in walkbox polygons and slot positions. */
export type Vec = readonly [x: number, y: number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the character stands, and which way it faces once there. */
export interface StandPoint {
  x: number;
  y: number;
  facing: Facing;
}

/**
 * Depth scaling: how big Daniele is with his feet on `farY` (the back of the
 * room) and on `nearY` (the front), interpolated linearly between them and
 * clamped outside. Give either:
 *
 * - `farHeight` and `nearHeight`: his standing height in logical px, the
 *   world scale of HD scenes (docs/art-spec.md, "Phase H", the scale sheet).
 *   Spread `HD_WORLD_SCALE` (constants.ts) for the Phase H defaults, 58 and
 *   72 px, which is a depth scale of 0.8 to 1.0 for the 72 px HD puppet;
 * - or `farScale` and `nearScale`: a scale of the character's own size, as
 *   the pixel-art scenes do (0.7 to 1.0 of the 57.5 px sprite).
 *
 * Heights win when both are given, so one scene's data draws every
 * character at the same size in the world.
 */
export interface DepthScale {
  farY: number;
  nearY: number;
  farScale?: number;
  nearScale?: number;
  farHeight?: number;
  nearHeight?: number;
}

/** Which footstep sounds the scene plays. */
export type FloorSurface = "carpet" | "wood" | "tile";

/**
 * A one-shot effect, `public/audio/sfx/<name>.mp3`. Objects and animations
 * name one in `sound`; the engine plays the rest itself (doors, the boarding
 * chime, the map plane, the UI blip).
 */
export type EffectName =
  | "boarding-chime"
  | "cuckoo"
  | "dart-thunk"
  | "door-close"
  | "door-open"
  | "fruit-machine"
  | "map-plane"
  | "moka-gurgle"
  | "phone-ring"
  | "split-flap"
  | "ui-blip";

/**
 * A music or ambience loop. A plain URL loops the whole decoded file. Give
 * loop points (seconds, from the track's provenance record) when the track
 * has a pickup before the loop or padding after it: playback starts at 0,
 * then loops between `loopStart` and `loopEnd`.
 */
export type AudioTrack =
  | string
  | { src: string; loopStart?: number; loopEnd?: number };

/**
 * An interactive thing in the scene. With a `sprite`, it's drawn at `x`,`y`.
 * Without one, it's painted into `bg.png` and needs an explicit `hotspot`.
 */
export interface SceneObject {
  id: string;
  /** Hover name, lower case unless it's a proper noun: "chalkboard menu". */
  name: string;
  /** Imported asset URL of `obj-<id>.png`. */
  sprite?: string;
  /**
   * Alternative sprites by state, e.g. `{ open: objCabinetOpen }` for
   * `obj-cabinet@open.png`. `open` shows while the object's content is on
   * screen (the drawer is out while the resume shows).
   */
  states?: Record<string, string>;
  /** Sprite top-left. Required with `sprite`. */
  x?: number;
  y?: number;
  /** Defaults to the sprite's alpha bounding box. */
  hotspot?: Rect;
  /** Where the character walks to. Without one, it turns and talks in place. */
  interactionPoint?: StandPoint;
  /**
   * Floor line for depth sorting. The object is drawn over the character
   * while the character's feet are above this line. Leave it out for things
   * on the wall, which are always behind the character.
   */
  baselineY?: number;
  /** Opens this section's content. Leave it out for flavour objects. */
  action?: SectionId;
  /** "Look at" line (right click), in the LucasArts voice. */
  look: string;
  /**
   * "Use" line (left click) for flavour objects. Falls back to `look`.
   * Objects with an `action` open their section instead of talking.
   */
  use?: string;
  /**
   * Played when the object is used (left click), as the character reaches
   * it: `"dart-thunk"`, `"fruit-machine"`, `"phone-ring"`, `"moka-gurgle"`.
   * For an object with an `action`, it replaces the UI blip.
   */
  sound?: EffectName;
}

/** A small loop from an `anim-<id>.png` strip of equal-width frames. */
export interface SceneAnimation {
  id: string;
  /** Imported asset URL of `anim-<id>.png`. */
  strip: string;
  /** Number of frames in the strip. The frame width is `width / frames`. */
  frames: number;
  /** Top-left of the first frame (the start of `motion`, if any). */
  x: number;
  y: number;
  frameMs: number;
  /**
   * Plays one cycle (or one `motion` pass) every `everyMs`, holding frame 0
   * in between (hidden in between, for a `motion`). Loops forever without it.
   */
  everyMs?: number;
  /** Moves the strip by `dx`,`dy` over `durationMs`: the bus, the ferry. */
  motion?: { dx: number; dy: number; durationMs: number };
  /** Only draws inside this rectangle, e.g. the window the bus passes. */
  clip?: Rect;
  /** Depth-sorts it like an object. Leave it out for wall and window loops. */
  baselineY?: number;
  /**
   * Played as each cycle (or `motion` pass) starts: `"cuckoo"`,
   * `"split-flap"`. Give it an `everyMs`, or it plays on every loop.
   */
  sound?: EffectName;
}

/** Generic slot sprites, in `src/assets/shared/slots/slot-<kind>.png`. */
export type SlotKind = "tap" | "photo-frame" | "magnet";

/** Which `profile.ts` collection fills a slot row. */
export type SlotSource = "skills:groups" | `jobs:${JobCountry}`;

/**
 * A row of containers filled from `profile.ts`, one per entry. Its capacity
 * is its number of positions. When there are more entries than positions, the
 * last position shows the `fold` object, holding the oldest entries.
 */
export interface SlotRow {
  id: string;
  kind: SlotKind;
  source: SlotSource;
  /** Top-left of each slot sprite, in display order (newest entry first). */
  positions: Vec[];
  /** Fold sprite id, e.g. "slot-photo-frame-more" (in the slots folder). */
  fold: string;
  /** Optional engine-drawn caption per slot, offset from its top-left. */
  caption?: { dx: number; dy: number; color?: string };
  /** Depth-sorts the whole row, like an object (taps on the bar counter). */
  baselineY?: number;
}

/**
 * What an engine-drawn label says:
 * - `section:<id>`: the section name, "RESUME"
 * - `scene:<id>`: the scene name, "LONDON"
 * - `gate:<country>`: "GATE 1" and the city, nothing more
 * - `departures`: one departures-board row per gate: the city only
 * - `text:<literal>`: fixed text, for signs that never change
 */
export type LabelSource =
  | `section:${SectionId}`
  | `scene:${SceneId}`
  | `gate:${CountrySceneId}`
  | "departures"
  | `text:${string}`;

/** Text drawn by the engine at display resolution (font.ts). Never paint text into art. */
export interface SceneLabel {
  id: string;
  source: LabelSource;
  /** Anchor: top-left, top-centre, or top-right, depending on `align`. */
  x: number;
  y: number;
  align?: "left" | "center" | "right";
  /** "small" is capitals, for signs. "regular" is the speech font. */
  font?: "small" | "regular";
  /** Hex colour. Defaults to the core palette's lightest neutral. */
  color?: string;
  /** Hex outline colour, or false for none. Defaults to none. */
  outline?: string | false;
  /**
   * Wraps lines longer than this many native px, and shrinks a single word
   * that is still too long to fit.
   */
  maxWidth?: number;
  /**
   * Scrolls the text right to left through `clip`, like the Windows
   * "Scrolling Marquee" screensaver, at `pxPerSec` native px a second. For a
   * word too long for its sign, such as the Zurich CRT's "EXPERIENCE". `x`
   * is ignored; `y` still sets the line.
   */
  marquee?: { clip: Rect; pxPerSec: number };
  baselineY?: number;
}

/** A door, gate, or scene edge that leads to another scene. */
export interface SceneExit {
  id: string;
  to: SceneId;
  /** Key into the destination's `entryPoints`. */
  entry: string;
  /**
   * Hover name for exits to the Hall ("door to the airport"). Gates to a
   * country get "Fly to London: Skills" from the engine and ignore it.
   */
  name?: string;
  sprite?: string;
  /** e.g. `{ open: objDoorOpen }`, shown while the character goes through. */
  states?: Record<string, string>;
  x?: number;
  y?: number;
  hotspot: Rect;
  /**
   * More areas that act as this exit, such as a gate's hanging sign, where
   * one rectangle can't cover both without blocking something in between.
   */
  extraHotspots?: Rect[];
  interactionPoint: StandPoint;
  look?: string;
  baselineY?: number;
}

export interface SceneData {
  id: SceneId;
  /** Display name: "London", "Zurich", "Sorrento", "the airport". */
  name: string;
  /** Imported asset URL of `bg.png` (320x160, opaque). */
  background: string;
  /** Imported asset URL of `fg.png`, drawn over everything else. */
  foreground?: string;
  music?: AudioTrack;
  ambience?: AudioTrack;
  floor?: FloorSurface;
  /** Walkable floor polygon. Concave shapes are fine; the engine paths. */
  walkbox: Vec[];
  depth: DepthScale;
  /**
   * Where the character appears. Country scenes need `fromHall`. The Hall
   * needs `start` plus one entry per country exit, e.g. `fromLondon`.
   */
  entryPoints: Record<string, StandPoint>;
  /**
   * Said on the first arrival: names the section and its object, e.g.
   * "London, where I learned the trade. The skills are on the chalkboard."
   */
  entryLine?: string;
  objects: SceneObject[];
  animations?: SceneAnimation[];
  slots?: SlotRow[];
  labels?: SceneLabel[];
  exits: SceneExit[];
}

/**
 * The travel map (`src/config/scenes/travel-map.ts`). The engine draws the
 * red route and the plane on top of `background`.
 */
export interface TravelMapData {
  id: "travel-map";
  background: string;
  /** Marker centre for each country. */
  markers: Record<CountrySceneId, Vec>;
  /** Where a flight starts when the visitor hasn't visited a country yet. */
  hall: Vec;
  /**
   * Optional bezier control point per route, keyed "from-to" with `hall` as
   * a possible origin ("hall-london", "london-zurich"). Defaults to an arc.
   */
  routes?: Partial<Record<`${CountrySceneId | "hall"}-${CountrySceneId}`, Vec>>;
  /** Optional plane sprite strip. `headings: 8` is E, SE, S, SW, W, NW, N, NE. */
  plane?: { strip: string; headings: 1 | 8 };
  /** Optional marker sprite, centred on each marker. */
  marker?: string;
  /** Hex colours. Default to the core palette's red and darkest neutral. */
  routeColor?: string;
  labelColor?: string;
}
