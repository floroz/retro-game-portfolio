/**
 * The adventure engine's logic: where Daniele is, what he's doing, what he's
 * saying, and which transition is playing. It has no DOM and no timers of
 * its own; the host calls `update(dtMs)` every frame and draws the result,
 * so every rule here is unit-testable.
 *
 * Routing (docs/expansion-plan.md, "Moving between scenes" and "Verb
 * shortcuts"):
 * - country to country only through the Hall: a country's exits lead to
 *   the Hall, and the Hall's gates lead to the countries;
 * - Hall gates play the travel map; doors back to the Hall use an iris;
 * - a section shortcut walks to the nearest exit (at most MAX_TRAVEL_TIME),
 *   flies, and opens the content on arrival. A click skips to the content.
 */
import { SECTIONS, isCountryScene } from "../config/sections";
import { cycleStarted } from "./animation";
import {
  CharacterAnimator,
  facingFor,
  type CharacterSheet,
  type Pose,
} from "./character";
import {
  IRIS_HOLD_MS,
  IRIS_MS,
  MAX_TRAVEL_TIME,
  SPEECH_WIDTH,
  WALK_SPEED,
  speechMs,
} from "./constants";
import { wrapText } from "./font";
import { clampToPolygon, findPath, pointInPolygon, scaleAt } from "./geometry";
import { hoverText, lookText } from "./hover";
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
  sceneChanged(scene: SceneId): void;
  sound?(name: SoundName): void;
  /** A click would now skip something (a trip, or the travel map), or not. */
  skippableChanged?(skippable: boolean): void;
}

/** Size and alpha bounding box of a loaded sprite, for default hotspots. */
export type SpriteInfo = (
  url: string,
) => { w: number; h: number; bbox: Rect } | undefined;

export interface Speech {
  lines: string[];
  until: number;
  onDone?: () => void;
}

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
  speed: number;
  onArrive: (() => void) | null;
}

interface Timer {
  at: number;
  fn: () => void;
}

export interface EngineOptions {
  scenes: SceneRegistry;
  travelMap: TravelMapData;
  sheet: CharacterSheet;
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
  speech: Speech | null = null;
  transition: Transition | null = null;

  constructor(opts: EngineOptions) {
    this.scenes = opts.scenes;
    this.map = opts.travelMap;
    this.host = opts.host;
    this.animator = new CharacterAnimator(opts.sheet, opts.rng);
    const start = opts.start ?? "hall";
    this.current = this.scenes[start];
    const ep = this.entryPoint(this.current, "start");
    this.actor = { ...ep, path: [], speed: WALK_SPEED, onArrive: null };
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

  get scale(): number {
    return scaleAt(this.current.depth, this.actor.y);
  }

  pose(): Pose {
    return this.animator.pose();
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
    if (this.speech) {
      const done = this.speech.onDone;
      this.speech = null;
      if (done) {
        done();
        return true;
      }
    }
    return false;
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

  /** Toolbar and terminal shortcut: go to a section's object and open it. */
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

  /** Terminal `fly` and the dev overlay: travel to a scene without opening anything. */
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
    if (this.opened) {
      this.states.delete(this.opened);
      this.opened = null;
    }
  }

  /** Stop walking and drop any queued action. */
  stop() {
    if (this.skipFn) {
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

    if (this.speech && this.clock >= this.speech.until) {
      const done = this.speech.onDone;
      this.speech = null;
      done?.();
    }

    const footstep = this.animator.update(dt, {
      moving: moved > 0,
      distance: moved,
      scale: this.scale,
      facing: this.actor.facing,
      talking: this.speech !== null,
    });
    if (footstep) this.host.sound?.(`footstep-${this.current.floor ?? "wood"}`);
    this.animationSounds(before, this.clock);

    const skippable = this.skipFn !== null || this.transition?.kind === "map";
    if (skippable !== this.wasSkippable) {
      this.wasSkippable = skippable;
      this.host.skippableChanged?.(skippable);
    }
  }

  // --- Internals -------------------------------------------------------------

  /** The cuckoo calls, the board flips: sounds of cycles that just started. */
  private animationSounds(from: number, to: number) {
    if (this.transition?.kind === "map") return;
    for (const anim of this.current.animations ?? []) {
      if (anim.sound && cycleStarted(anim, from, to)) {
        this.host.sound?.(anim.sound);
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
    this.actor.speed = opts.fast
      ? Math.max(WALK_SPEED, length / MAX_TRAVEL_TIME)
      : WALK_SPEED;
    this.actor.onArrive = opts.onArrive ?? null;
    if (length < 0.5) this.arrive();
  }

  private arrive() {
    const cb = this.actor.onArrive;
    this.actor.path = [];
    this.actor.onArrive = null;
    cb?.();
  }

  /** Moves the actor; returns the distance covered this frame. */
  private move(dt: number): number {
    const a = this.actor;
    if (this.keyboardActive && a.path.length === 0) {
      const [kx, ky] = this.keyboard;
      const len = Math.hypot(kx, ky);
      const step = (WALK_SPEED * dt) / 1000;
      const poly = this.current.walkbox;
      const tryMove = (nx: number, ny: number) =>
        pointInPolygon([nx, ny], poly) ? ([nx, ny] as Vec) : null;
      const next =
        tryMove(a.x + (kx / len) * step, a.y + (ky / len) * step) ??
        tryMove(a.x + Math.sign(kx) * step, a.y) ??
        tryMove(a.x, a.y + Math.sign(ky) * step);
      a.facing = facingFor(kx, ky, a.facing);
      if (!next) return 0;
      const d = Math.hypot(next[0] - a.x, next[1] - a.y);
      a.x = next[0];
      a.y = next[1];
      return d;
    }
    if (a.path.length === 0) return 0;
    let budget = (a.speed * dt) / 1000;
    let moved = 0;
    while (budget > 0 && a.path.length > 0) {
      const [tx, ty] = a.path[0];
      const dx = tx - a.x;
      const dy = ty - a.y;
      const d = Math.hypot(dx, dy);
      a.facing = facingFor(dx, dy, a.facing);
      if (d <= budget) {
        a.x = tx;
        a.y = ty;
        a.path.shift();
        budget -= d;
        moved += d;
      } else {
        a.x += (dx / d) * budget;
        a.y += (dy / d) * budget;
        moved += budget;
        budget = 0;
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
}

/**
 * Everything clickable in a scene, topmost last: objects, slot items, then
 * exits. Pure, so React can derive hotspots from the scene data directly.
 */
export function interactablesFor(scene: SceneData, info: SpriteInfo): Hit[] {
  const out: Hit[] = [];
  const push = (target: Interactable, rect: Rect | undefined) => {
    if (rect) out.push({ target, rect, text: hoverText(target) });
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
  for (const exit of scene.exits) push({ kind: "exit", exit }, exit.hotspot);
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
