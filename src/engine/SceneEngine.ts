/**
 * The adventure engine's logic: where Daniele is, what he's doing, what he's
 * saying, and which transition is playing. It has no DOM and no timers of
 * its own; the host calls `update(dtMs)` every frame and draws the result,
 * so every rule here is unit-testable.
 *
 * Routing:
 * - country to country only through the Hall: a country's exits lead to
 *   the Hall, and the Hall's gates lead to the countries;
 * - Hall gates play the travel map; doors back to the Hall use an iris;
 * - a section shortcut walks to the nearest exit (at most MAX_TRAVEL_TIME),
 *   flies, and opens the content on arrival. A click skips to the content.
 */
import { SECTIONS, isCountryScene } from "../config/sections";
import { cycleStarted } from "./animation";
import { effectCycleStarted, propPassStarted } from "./effects";
import {
  CharacterAnimator,
  facingFor,
  type AnimInput,
  type CharacterSheet,
  type Pose,
} from "./character";
import { RigAnimator, type RigState } from "./rig/animator";
import type { Rig } from "./rig/rig";
import {
  IRIS_HOLD_MS,
  IRIS_MS,
  MAX_TRAVEL_TIME,
  SPEECH_WIDTH,
  speechMs,
} from "./constants";
import { wrapText } from "./font";
import {
  clampToPolygon,
  findPath,
  hasWorldScale,
  pointInPolygon,
  scaleAt,
} from "./geometry";
import { hoverText, lookText } from "./hover";
import { groundDistance, groundSpeed, walkTime } from "./walkSpeed";
import { fillSlotRow, type SlotItem } from "./slots";
import {
  FLIGHT_MS,
  LANDED_MS,
  routeFor,
  type Route,
  type RouteOrigin,
} from "./travelMap";
import type {
  CountrySceneId,
  EffectName,
  Facing,
  FloorSurface,
  Rect,
  SceneData,
  SceneExit,
  SceneId,
  SceneObject,
  SectionId,
  StandPoint,
  TravelMapData,
  Vec,
} from "./types";

export type SceneRegistry = Record<SceneId, SceneData>;

export type Interactable =
  | { kind: "object"; object: SceneObject }
  | { kind: "exit"; exit: SceneExit }
  | { kind: "slot"; item: SlotItem };

/** Every sound the engine asks the host for: effects, footsteps, the sting. */
export type SoundName =
  | `footstep-${FloorSurface}`
  | EffectName
  | "travel-sting";

export interface EngineHost {
  /** Open a section's content screen. */
  openSection(section: SectionId): void;
  openInspection?(inspection: import("./types").ObjectInspection): void;
  sceneChanged(scene: SceneId): void;
  sound?(name: SoundName): void;
  /** A click would now skip something (a trip, or the travel map), or not. */
  skippableChanged?(skippable: boolean): void;
  /** The travel map started flying to a country, or finished (null). */
  flightChanged?(to: CountrySceneId | null): void;
}

/** Size and alpha bounding box of a loaded sprite, for default hotspots. */
export type SpriteInfo = (
  url: string,
) => { w: number; h: number; bbox: Rect } | undefined;

export interface Speech {
  lines: string[];
  /** The whole line, for the rig's mouth shapes. */
  text: string;
  /** Engine time the line started. */
  since: number;
  until: number;
  onDone?: () => void;
  /**
   * A conversation line (`converse`): it stays up once Daniele has said it,
   * until the conversation moves on, and `onLeave` runs if a click elsewhere
   * ends it.
   */
  held?: { onLeave: () => void };
  /** A held line Daniele has finished saying: no talking, text still up. */
  spoken?: boolean;
}

/**
 * How Daniele is drawn this frame: from the sprite sheet, or as the cut-out
 * rig (rig/), each with its own depth scale (1 is its own size).
 */
export type Figure =
  | { kind: "sheet"; pose: Pose; scale: number }
  | { kind: "rig"; rig: Rig; state: RigState; scale: number };

export type Transition =
  | {
      kind: "iris";
      phase: "close" | "open";
      t: number;
      center: Vec;
      onClosed?: () => void;
    }
  | {
      kind: "map";
      route: Route;
      to: CountrySceneId;
      t: number;
      onDone: () => void;
    };

interface Actor {
  x: number;
  y: number;
  facing: Facing;
  path: Vec[];
  /** Multiplies the natural walking speed (walkSpeed.ts): 1, or more for a shortcut. */
  pace: number;
  onArrive: (() => void) | null;
}

interface Timer {
  at: number;
  fn: () => void;
}

/** Where the game opens unless told otherwise. */
export const START_SCENE: SceneId = "hall";

export interface EngineOptions {
  scenes: SceneRegistry;
  travelMap: TravelMapData;
  sheet: CharacterSheet;
  /**
   * The cut-out rig, once HB7 packs it. Without one, Daniele is always the
   * sprite sheet.
   */
  rig?: Rig | null;
  /**
   * Whether a scene draws Daniele as the rig or the sprite sheet. Defaults
   * to the rig in scenes built to the Phase H world scale (`farHeight` and
   * `nearHeight`), and the sheet elsewhere.
   */
  rigFor?: (scene: SceneData) => boolean;
  host: EngineHost;
  start?: SceneId;
  rng?: () => number;
}

/** "fromLondon" for a trip from London into the Hall. */
const entryFrom = (id: SceneId) => `from${id[0].toUpperCase()}${id.slice(1)}`;

export class SceneEngine {
  private readonly scenes: SceneRegistry;
  private readonly map: TravelMapData;
  private readonly host: EngineHost;
  private readonly animator: CharacterAnimator;
  private readonly figureHeight: number;
  private readonly rig: Rig | null;
  private readonly rigAnimator: RigAnimator | null;
  private readonly rigFor: (scene: SceneData) => boolean;
  private current: SceneData;
  private slotItems: SlotItem[] = [];
  private actor: Actor;
  private clock = 0;
  private timers: Timer[] = [];
  private skipFn: (() => void) | null = null;
  private keyboard: Vec = [0, 0];
  private states = new Map<string, string>();
  private visited = new Set<SceneId>();
  private lastCountry: CountrySceneId | null = null;
  /** Object shown in its `open` state while its content is on screen. */
  private opened: string | null = null;
  private wasSkippable = false;
  private wasFlying: CountrySceneId | null = null;
  private readonly start: SceneId;
  private greeted = false;
  speech: Speech | null = null;
  transition: Transition | null = null;

  constructor(opts: EngineOptions) {
    this.scenes = opts.scenes;
    this.map = opts.travelMap;
    this.host = opts.host;
    this.animator = new CharacterAnimator(opts.sheet, opts.rng);
    this.figureHeight = opts.sheet.figureHeight;
    this.rig = opts.rig ?? null;
    this.rigAnimator = this.rig ? new RigAnimator(this.rig, opts.rng) : null;
    this.rigFor = opts.rigFor ?? hasWorldScale;
    const start = opts.start ?? START_SCENE;
    this.start = start;
    this.current = this.scenes[start];
    const ep = this.entryPoint(this.current, "start");
    this.actor = { ...ep, path: [], pace: 1, onArrive: null };
    this.visited.add(start);
    if (isCountryScene(start)) this.lastCountry = start;
    this.slotItems = this.fillSlots(this.current);
  }

  // --- Queries ---------------------------------------------------------------

  get scene(): SceneData {
    return this.current;
  }

  get now(): number {
    return this.clock;
  }

  get position(): StandPoint {
    return { x: this.actor.x, y: this.actor.y, facing: this.actor.facing };
  }

  get walking(): boolean {
    return this.actor.path.length > 0 || this.keyboardActive;
  }

  /** True while a shortcut or trip is running and a click would skip it. */
  get sequenceRunning(): boolean {
    return this.skipFn !== null;
  }

  get slots(): SlotItem[] {
    return this.slotItems;
  }

  /**
   * Daniele's depth scale where he stands: 1 is his own size. In a scene
   * with a world scale (`farHeight`, `nearHeight`), it's the height there
   * over his own height.
   */
  get scale(): number {
    return scaleAt(this.current.depth, this.actor.y, this.activeHeight());
  }

  /** True while this scene draws Daniele as the cut-out rig. */
  private get rigActive(): boolean {
    return this.rigAnimator !== null && this.rigFor(this.current);
  }

  /** The drawn character's own height, which the world scale is against. */
  private activeHeight(): number {
    return this.rig && this.rigActive
      ? this.rig.figureHeight
      : this.figureHeight;
  }

  /** How to draw Daniele this frame. */
  figure(): Figure {
    if (this.rig && this.rigAnimator && this.rigActive) {
      return {
        kind: "rig",
        rig: this.rig,
        state: this.rigAnimator.state(),
        scale: this.scale,
      };
    }
    return { kind: "sheet", pose: this.animator.pose(), scale: this.scale };
  }

  /** Current state of an object or exit ("open"), if any. */
  stateOf(id: string): string | undefined {
    return this.states.get(id);
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Handles a click that arrives while something is playing. Returns true
   * when the click was used up (skipping a sequence, the map, or a line).
   */
  interrupt(): boolean {
    if (this.skipFn) {
      const skip = this.skipFn;
      this.skipFn = null;
      skip();
      return true;
    }
    const tr = this.transition;
    if (tr?.kind === "map") {
      tr.onDone();
      return true;
    }
    if (tr) return true;
    const speech = this.speech;
    if (speech?.held) {
      // A click while Daniele talks skips to the choices. Once they're up,
      // a click elsewhere in the scene walks away from the conversation.
      if (!speech.spoken) {
        this.finishSpeaking(speech);
        return true;
      }
      this.speech = null;
      speech.held.onLeave();
      return false;
    }
    if (speech) {
      const done = speech.onDone;
      this.speech = null;
      if (done) {
        done();
        return true;
      }
    }
    return false;
  }

  /**
   * Daniele says one line of a conversation and holds it on screen, talking
   * while he says it; `onSpoken` runs once he's done (or the visitor skips
   * ahead), when the choices come up. `onLeave` runs if a click in the
   * scene ends the conversation instead.
   */
  converse(text: string, onSpoken: () => void, onLeave: () => void) {
    this.speech = {
      lines: wrapText(text, SPEECH_WIDTH),
      text,
      since: this.clock,
      until: this.clock + speechMs(text),
      onDone: onSpoken,
      held: { onLeave },
    };
  }

  /** Skips the rest of a conversation line: the same as a click on it. */
  skipLine(): boolean {
    const speech = this.speech;
    if (!speech?.held || speech.spoken) return false;
    this.finishSpeaking(speech);
    return true;
  }

  /** The conversation is over: takes down its line, if it's still up. */
  endConversation() {
    if (this.speech?.held) this.speech = null;
  }

  private finishSpeaking(speech: Speech) {
    speech.spoken = true;
    speech.onDone?.();
  }

  /** Walk to a floor point (clamped into the walkbox). */
  walkTo(x: number, y: number) {
    if (this.interrupt()) return;
    this.cancel();
    this.walk([x, y]);
  }

  /** Left click on something: use it, or talk about it. */
  activate(target: Interactable) {
    if (this.interrupt()) return;
    this.cancel();
    if (target.kind === "slot") {
      this.faceRect(slotRectOf(target.item));
      this.say(target.item.look);
      return;
    }
    if (target.kind === "exit") {
      const { exit } = target;
      this.walk([exit.interactionPoint.x, exit.interactionPoint.y], {
        onArrive: () => {
          this.actor.facing = exit.interactionPoint.facing;
          this.goThrough(exit);
        },
      });
      return;
    }
    const { object } = target;
    const act = () => {
      if (object.inspection && this.host.openInspection) {
        const inspection = object.inspection;
        this.animator.startUse();
        this.rigAnimator?.startUse();
        this.host.sound?.(object.sound ?? "ui-blip");
        this.after(150, () => this.host.openInspection?.(inspection));
        return;
      }
      if (object.action) return this.useAndOpen(object.action, object);
      if (object.sound) this.host.sound?.(object.sound);
      this.say(object.use ?? object.look);
    };
    const ip = object.interactionPoint;
    if (ip) {
      this.walk([ip.x, ip.y], {
        onArrive: () => {
          this.actor.facing = ip.facing;
          act();
        },
      });
    } else {
      const rect = object.hotspot;
      if (rect) this.faceRect(rect);
      act();
    }
  }

  /** Right click: turn to it and describe it. */
  look(target: Interactable) {
    if (this.interrupt()) return;
    this.cancel();
    const rect =
      target.kind === "object"
        ? target.object.hotspot
        : target.kind === "exit"
          ? target.exit.hotspot
          : slotRectOf(target.item);
    if (rect) this.faceRect(rect);
    this.say(lookText(target));
  }

  /** Section shortcut: go to a section's object and open it. */
  goToSection(section: SectionId) {
    this.reset();
    const home = SECTIONS[section].home;
    const object = this.scenes[home].objects.find((o) => o.action === section);
    const ip = object?.interactionPoint;

    const finish = () => {
      this.reset();
      if (this.current.id !== home) {
        this.enter(home, "fromHall", { place: ip });
      } else if (ip) {
        Object.assign(this.actor, { x: ip.x, y: ip.y, facing: ip.facing });
      }
      this.useAndOpen(section, object);
    };
    this.skipFn = finish;

    if (this.current.id === home) {
      if (!ip) return finish();
      this.walk([ip.x, ip.y], { fast: true, onArrive: finish });
      return;
    }
    this.leaveToward(home, () => this.fly(home, finish));
  }

  /** Travel to a scene without opening anything. */
  travelTo(to: SceneId) {
    this.reset();
    if (to === this.current.id) {
      this.say(`We're already in ${this.current.name}.`);
      return;
    }
    const via = this.exitToward(to);
    const entry =
      to === "hall"
        ? via?.to === "hall"
          ? via.entry
          : entryFrom(this.current.id)
        : "fromHall";
    const finish = () => {
      this.reset();
      this.enter(to, entry, { arrivalLine: true });
    };
    this.skipFn = finish;
    this.leaveToward(to, () => {
      if (to === "hall") {
        this.iris(
          () => this.enter(to, entry, { arrivalLine: true }),
          () => {
            this.skipFn = null;
          },
        );
      } else {
        this.fly(to, finish);
      }
    });
  }

  /**
   * Daniele greets the visitor with the start scene's `entryLine`, once per
   * page load, when the game is first on screen. The start scene counts as
   * visited from the constructor, so `enter()` never says it. Skipped if a
   * trip is already under way or Daniele has already left the start scene.
   */
  greet() {
    if (this.greeted) return;
    this.greeted = true;
    const line = this.current.entryLine;
    if (!line || this.current.id !== this.start) return;
    if (this.skipFn || this.transition || this.speech) return;
    this.say(line);
  }

  /** Dev overlay: appear in a scene at once, at its default entry. */
  jumpTo(to: SceneId) {
    this.reset();
    this.enter(to, to === "hall" ? "start" : "fromHall");
  }

  /** Dev overlay: play the travel map to a country, then stay put. */
  previewMap(to: CountrySceneId) {
    this.reset();
    this.fly(to, () => {});
  }

  /** Held arrow keys, as a direction vector (each component -1, 0, or 1). */
  setKeyboard(dx: number, dy: number) {
    if (this.skipFn || this.transition) {
      this.keyboard = [0, 0];
      return;
    }
    if ((dx || dy) && !this.keyboardActive) {
      this.speech = null;
      this.cancel();
    }
    this.keyboard = [dx, dy];
  }

  /** The content screen closed: finish the "use" animation, shut the object. */
  contentClosed() {
    this.animator.releaseUse();
    this.rigAnimator?.releaseUse();
    if (this.opened) {
      this.states.delete(this.opened);
      this.opened = null;
    }
  }

  /** Stop walking and drop any queued action. */
  stop() {
    if (this.skipFn || this.transition?.kind === "map") {
      this.interrupt();
      return;
    }
    this.cancel();
  }

  // --- Frame update ----------------------------------------------------------

  update(dtMs: number) {
    const dt = Math.min(100, Math.max(0, dtMs));
    const before = this.clock;
    this.clock += dt;

    const due = this.timers.filter((t) => t.at <= this.clock);
    if (due.length) {
      this.timers = this.timers.filter((t) => t.at > this.clock);
      due.forEach((t) => t.fn());
    }

    this.updateTransition(dt);

    let moved = 0;
    if (this.transition?.kind !== "map") moved = this.move(dt);

    const said = this.speech;
    if (said && this.clock >= said.until) {
      if (said.held) {
        if (!said.spoken) this.finishSpeaking(said);
      } else {
        this.speech = null;
        said.onDone?.();
      }
    }

    const speech = this.speech;
    const input: AnimInput = {
      moving: moved > 0,
      distance: moved,
      scale: scaleAt(this.current.depth, this.actor.y, this.figureHeight),
      facing: this.actor.facing,
      talking: speech !== null && !speech.spoken,
      speech:
        speech && !speech.spoken
          ? { text: speech.text, elapsedMs: this.clock - speech.since }
          : undefined,
    };
    // Both keep time, so a scene change mid-reach carries on; only the
    // drawn one's feet make footsteps.
    const sheetStep = this.animator.update(dt, input);
    const rigStep = this.rigAnimator?.update(dt, {
      ...input,
      scale: this.rig
        ? scaleAt(this.current.depth, this.actor.y, this.rig.figureHeight)
        : input.scale,
    });
    const footstep = this.rigActive ? rigStep : sheetStep;
    if (footstep) this.host.sound?.(`footstep-${this.current.floor ?? "wood"}`);
    this.animationSounds(before, this.clock);

    const skippable = this.skipFn !== null || this.transition?.kind === "map";
    if (skippable !== this.wasSkippable) {
      this.wasSkippable = skippable;
      this.host.skippableChanged?.(skippable);
    }
    const flying = this.transition?.kind === "map" ? this.transition.to : null;
    if (flying !== this.wasFlying) {
      this.wasFlying = flying;
      this.host.flightChanged?.(flying);
    }
  }

  // --- Internals -------------------------------------------------------------

  /** The cuckoo calls: sounds of animation cycles that just started. */
  private animationSounds(from: number, to: number) {
    if (this.transition?.kind === "map") return;
    for (const anim of this.current.animations ?? []) {
      if (anim.sound && cycleStarted(anim, from, to)) {
        this.host.sound?.(anim.sound);
      }
    }
    for (const prop of this.current.props ?? []) {
      if (prop.sound && propPassStarted(prop, from, to)) {
        this.host.sound?.(prop.sound);
      }
    }
    for (const effect of this.current.effects ?? []) {
      if (
        effect.kind === "flutter" &&
        effect.sound &&
        effectCycleStarted(effect, from, to)
      ) {
        this.host.sound?.(effect.sound);
      }
    }
  }

  private get keyboardActive() {
    return this.keyboard[0] !== 0 || this.keyboard[1] !== 0;
  }

  private fillSlots(scene: SceneData): SlotItem[] {
    return (scene.slots ?? []).flatMap((row) => fillSlotRow(row));
  }

  private entryPoint(scene: SceneData, key: string): StandPoint {
    const ep = scene.entryPoints[key] ?? Object.values(scene.entryPoints)[0];
    if (ep) return ep;
    const [x, y] = scene.walkbox[0] ?? [160, 140];
    return { x, y, facing: "s" };
  }

  private after(ms: number, fn: () => void) {
    this.timers.push({ at: this.clock + ms, fn });
  }

  /** Drops the walk, timers, and any pending skip. */
  private cancel() {
    this.timers = [];
    this.skipFn = null;
    this.actor.path = [];
    this.actor.onArrive = null;
  }

  /** `cancel()`, plus any line and transition. For shortcuts. */
  private reset() {
    this.cancel();
    this.speech = null;
    this.transition = null;
  }

  private say(text: string, onDone?: () => void) {
    this.speech = {
      lines: wrapText(text, SPEECH_WIDTH),
      text,
      since: this.clock,
      until: this.clock + speechMs(text),
      onDone,
    };
  }

  private walk(to: Vec, opts: { fast?: boolean; onArrive?: () => void } = {}) {
    const path = findPath(
      [this.actor.x, this.actor.y],
      to,
      this.current.walkbox,
    );
    let length = 0;
    let prev: Vec = [this.actor.x, this.actor.y];
    for (const p of path) {
      length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      prev = p;
    }
    this.actor.path = path;
    // A shortcut walk speeds up just enough to take at most MAX_TRAVEL_TIME.
    // The speed varies with depth, so the time is summed over the path.
    this.actor.pace = opts.fast
      ? Math.max(
          1,
          walkTime(this.current.depth, [this.actor.x, this.actor.y], path) /
            MAX_TRAVEL_TIME,
        )
      : 1;
    this.actor.onArrive = opts.onArrive ?? null;
    if (length < 0.5) this.arrive();
  }

  private arrive() {
    const cb = this.actor.onArrive;
    this.actor.path = [];
    this.actor.onArrive = null;
    cb?.();
  }

  /**
   * Moves the actor; returns the screen distance covered this frame. The
   * walk animation advances by that, not by ground distance: its frames are
   * drawn in screen px, so the feet stay planted however slowly he goes up
   * or down the screen (walkSpeed.ts).
   */
  private move(dt: number): number {
    const a = this.actor;
    const depth = this.current.depth;
    if (this.keyboardActive && a.path.length === 0) {
      const [kx, ky] = this.keyboard;
      const len = Math.hypot(kx, ky);
      const poly = this.current.walkbox;
      // A step along the screen direction (ux, uy), if it stays on the floor.
      const attempt = (ux: number, uy: number): Vec | null => {
        const ground = (groundSpeed(depth, a.y) * dt) / 1000;
        const screen = ground / groundDistance(ux, uy);
        const nx = a.x + ux * screen;
        const ny = a.y + uy * screen;
        return pointInPolygon([nx, ny], poly) ? [nx, ny] : null;
      };
      const next =
        attempt(kx / len, ky / len) ??
        attempt(Math.sign(kx), 0) ??
        attempt(0, Math.sign(ky));
      a.facing = facingFor(kx, ky, a.facing);
      if (!next) return 0;
      const d = Math.hypot(next[0] - a.x, next[1] - a.y);
      a.x = next[0];
      a.y = next[1];
      return d;
    }
    if (a.path.length === 0) return 0;
    // Time left in this frame, in seconds. The speed is that at the feet
    // when each stretch starts, so it follows the depth from frame to frame.
    let left = dt / 1000;
    let moved = 0;
    while (left > 0 && a.path.length > 0) {
      const [tx, ty] = a.path[0];
      const dx = tx - a.x;
      const dy = ty - a.y;
      const ground = groundDistance(dx, dy);
      const speed = groundSpeed(depth, a.y) * a.pace;
      a.facing = facingFor(dx, dy, a.facing);
      if (ground <= speed * left) {
        a.x = tx;
        a.y = ty;
        a.path.shift();
        left -= ground / speed;
        moved += Math.hypot(dx, dy);
      } else {
        const f = (speed * left) / ground;
        a.x += dx * f;
        a.y += dy * f;
        moved += Math.hypot(dx, dy) * f;
        left = 0;
      }
    }
    if (a.path.length === 0) this.arrive();
    return moved;
  }

  private faceRect(rect: Rect) {
    const cx = rect.x + rect.w / 2;
    const dx = cx - this.actor.x;
    this.actor.facing =
      Math.abs(dx) > 8
        ? dx > 0
          ? "e"
          : "w"
        : rect.y + rect.h < this.actor.y
          ? "n"
          : "s";
  }

  private useAndOpen(section: SectionId, object?: SceneObject) {
    if (object?.states?.open) {
      this.states.set(object.id, "open");
      this.opened = object.id;
    }
    this.animator.startUse();
    this.rigAnimator?.startUse();
    this.host.sound?.(object?.sound ?? "ui-blip");
    this.after(150, () => this.host.openSection(section));
  }

  /** Where a trip to `to` leaves this scene. */
  private exitToward(to: SceneId): SceneExit | undefined {
    const exits = this.current.exits;
    return (
      exits.find((e) => e.to === to) ??
      (this.current.id === "hall"
        ? undefined
        : exits.find((e) => e.to === "hall"))
    );
  }

  /** Fast walk to the exit towards `to`, open its door, then `next()`. */
  private leaveToward(to: SceneId, next: () => void) {
    const exit = this.exitToward(to);
    if (!exit) return next();
    const ip = exit.interactionPoint;
    this.walk([ip.x, ip.y], {
      fast: true,
      onArrive: () => {
        this.actor.facing = ip.facing;
        this.openDoor(exit);
        next();
      },
    });
  }

  private openDoor(exit: SceneExit) {
    if (exit.states?.open) {
      this.states.set(exit.id, "open");
      this.host.sound?.("door-open");
    }
  }

  private goThrough(exit: SceneExit) {
    this.openDoor(exit);
    if (this.current.id === "hall" && isCountryScene(exit.to)) {
      this.host.sound?.("boarding-chime");
    }
    const to = exit.to;
    const enter = () => {
      this.enter(to, exit.entry, { arrivalLine: true });
      if (exit.states?.open) this.host.sound?.("door-close");
    };
    this.after(exit.states?.open ? 200 : 0, () => {
      if (this.current.id === "hall" && isCountryScene(to)) this.fly(to, enter);
      else this.iris(enter);
    });
  }

  private origin(): RouteOrigin {
    return isCountryScene(this.current.id)
      ? this.current.id
      : (this.lastCountry ?? "hall");
  }

  /**
   * Plays the travel map to `to`, then `onLanded` (which enters the scene),
   * then irises the new scene open.
   */
  private fly(to: CountrySceneId, onLanded: () => void) {
    const route = routeFor(this.map, this.origin(), to);
    this.speech = null;
    this.host.sound?.("travel-sting");
    this.host.sound?.("map-plane");
    this.transition = {
      kind: "map",
      route,
      to,
      t: 0,
      onDone: () => {
        this.transition = null;
        onLanded();
        if (!this.transition) {
          this.transition = {
            kind: "iris",
            phase: "open",
            t: 0,
            center: this.center(),
          };
        }
      },
    };
  }

  private center(): Vec {
    const s = this.scale;
    return [Math.round(this.actor.x), Math.round(this.actor.y - 30 * s)];
  }

  private iris(onClosed: () => void, onOpened?: () => void) {
    this.transition = {
      kind: "iris",
      phase: "close",
      t: 0,
      center: this.center(),
      onClosed: () => {
        onClosed();
        onOpened?.();
      },
    };
  }

  private updateTransition(dt: number) {
    const tr = this.transition;
    if (!tr) return;
    tr.t += dt;
    if (tr.kind === "map") {
      if (tr.t >= FLIGHT_MS + LANDED_MS) tr.onDone();
      return;
    }
    if (tr.phase === "close" && tr.t >= IRIS_MS + IRIS_HOLD_MS) {
      const cb = tr.onClosed;
      tr.onClosed = undefined;
      cb?.();
      this.transition = {
        kind: "iris",
        phase: "open",
        t: 0,
        center: this.center(),
      };
    } else if (tr.phase === "open" && tr.t >= IRIS_MS) {
      this.transition = null;
    }
  }

  private enter(
    id: SceneId,
    entryKey: string,
    opts: { arrivalLine?: boolean; place?: StandPoint } = {},
  ) {
    const scene = this.scenes[id];
    this.current = scene;
    this.states.clear();
    this.opened = null;
    this.slotItems = this.fillSlots(scene);
    const ep = opts.place ?? this.entryPoint(scene, entryKey);
    const [x, y] = clampToPolygon([ep.x, ep.y], scene.walkbox);
    Object.assign(this.actor, {
      x,
      y,
      facing: ep.facing,
      path: [],
      onArrive: null,
    });
    if (isCountryScene(id)) this.lastCountry = id;
    this.host.sceneChanged(id);
    if (opts.arrivalLine && scene.entryLine && !this.visited.has(id)) {
      this.say(scene.entryLine);
    }
    this.visited.add(id);
  }
}

export interface Hit {
  target: Interactable;
  rect: Rect;
  /** Status-line text. */
  text: string;
  /** 0 for the main hotspot, 1 and up for an exit's `extraHotspots`. */
  part: number;
}

/**
 * Everything clickable in a scene, topmost last: objects, slot items, then
 * exits. Pure, so React can derive hotspots from the scene data directly.
 */
export function interactablesFor(scene: SceneData, info: SpriteInfo): Hit[] {
  const out: Hit[] = [];
  const push = (target: Interactable, rect: Rect | undefined, part = 0) => {
    if (rect) out.push({ target, rect, text: hoverText(target), part });
  };
  for (const object of scene.objects) {
    push({ kind: "object", object }, object.hotspot ?? spriteBox(object, info));
  }
  for (const row of scene.slots ?? []) {
    for (const item of fillSlotRow(row)) {
      const size = info(slotUrlKey(item.sprite));
      push(
        { kind: "slot", item },
        { x: item.x, y: item.y, w: size?.w ?? 8, h: size?.h ?? 8 },
      );
    }
  }
  for (const exit of scene.exits) {
    const target = { kind: "exit", exit } as const;
    push(target, exit.hotspot);
    exit.extraHotspots?.forEach((rect, i) => push(target, rect, i + 1));
  }
  return out;
}

function spriteBox(object: SceneObject, info: SpriteInfo): Rect | undefined {
  if (!object.sprite || object.x === undefined || object.y === undefined)
    return;
  const size = info(object.sprite);
  if (!size) return;
  const { bbox } = size;
  return { x: object.x + bbox.x, y: object.y + bbox.y, w: bbox.w, h: bbox.h };
}

function slotRectOf(item: SlotItem): Rect {
  return { x: item.x, y: item.y, w: 8, h: 8 };
}

/** Slot sprites are looked up by id; the asset store maps ids to URLs. */
const slotUrlKey = (id: string) => `slot:${id}`;
