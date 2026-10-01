/**
 * Image loading for the canvas renderer. Everything is preloaded up front
 * (preload.ts), so scene changes and the travel map never flash an
 * unloaded image. The store also works out each image's density
 * (density.ts) and reports sizes in logical px.
 */
import sheetJson from "../assets/character/daniele.json";
import sheetUrl from "../assets/character/daniele.png";
import { parseSheet, type CharacterSheet } from "./character";
import { placeholderAtlas, placeholderRig } from "./rig/placeholder";
import { parseRig, type Rig } from "./rig/rig";
import { NATIVE_H, NATIVE_W } from "./constants";
import {
  SHARED_LOGICAL_SIZES,
  detectDensity,
  type Density,
  type Size,
} from "./density";
import type { SpriteInfo } from "./SceneEngine";
import type { Rect, SceneData, TravelMapData } from "./types";
import { remasterArtwork } from "./artwork";

const SHARED_SPRITES = import.meta.glob<string>("../assets/shared/**/*.png", {
  eager: true,
  import: "default",
});
const SLOTS_DIR = "../assets/shared/slots/";

/** Slot sprite URL by id ("slot-tap", "slot-tap-more"). */
export function slotSpriteUrl(id: string): string | undefined {
  const url = SHARED_SPRITES[`${SLOTS_DIR}${id}.png`];
  return url && remasterArtwork(url);
}

/** Every slot sprite id that exists. */
export function slotSpriteIds(): string[] {
  return Object.keys(SHARED_SPRITES)
    .filter((path) => path.startsWith(SLOTS_DIR))
    .map((path) => path.slice(SLOTS_DIR.length, -".png".length));
}

/** Logical size of a shared sprite, by URL, from its density-1 original. */
function sharedLogicalSize(url: string): Size | undefined {
  for (const [path, u] of Object.entries(SHARED_SPRITES)) {
    if (u !== url && remasterArtwork(u) !== url) continue;
    const id = path.slice(path.lastIndexOf("/") + 1, -".png".length);
    return SHARED_LOGICAL_SIZES[id];
  }
  return undefined;
}

export const CHARACTER_SHEET: CharacterSheet = parseSheet(sheetJson, sheetUrl);

/** The packed rig (`npm run assets:rig`), once HB7 has shipped it. */
const RIG_JSON = import.meta.glob<unknown>(
  "../assets/character/daniele-rig.json",
  { eager: true, import: "default" },
);
const RIG_PNG = import.meta.glob<string>(
  "../assets/character/daniele-rig.png",
  {
    eager: true,
    import: "default",
  },
);

/** `?rig=placeholder` under `npm run dev`: the rectangle rig (rig/placeholder.ts). */
const PLACEHOLDER_RIG =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("rig") === "placeholder";

/**
 * Daniele as a cut-out rig (rig/), or null until `daniele-rig.json` and its
 * atlas exist, when the sprite sheet stays in use everywhere.
 */
export const CHARACTER_RIG: Rig | null = (() => {
  if (PLACEHOLDER_RIG) {
    return parseRig(placeholderRig().json, placeholderAtlas());
  }
  const json = Object.values(RIG_JSON)[0];
  const png = Object.values(RIG_PNG)[0];
  return json && png ? parseRig(json, png) : null;
})();

interface Entry {
  img: HTMLImageElement;
  bbox: Rect | null;
}

/**
 * How the store finds an image's density: from its logical size, from
 * another image (a scene's sprites follow its background), or stated.
 */
export type DensityRule =
  | { size: Size }
  | { like: string }
  | { density: Density };

const SCENE_SIZE: Size = { w: NATIVE_W, h: NATIVE_H };

/**
 * Density rules for every image in the game, by URL (density.ts). An image
 * with no rule is density 1.
 */
export function densityRules(
  scenes: SceneData[],
  map: TravelMapData,
  sheet: CharacterSheet,
): Map<string, DensityRule> {
  const rules = new Map<string, DensityRule>();
  const set = (url: string, rule: DensityRule) => {
    if (!rules.has(url)) rules.set(url, rule);
  };
  const sprite = (url: string, like: string) =>
    set(url, sharedRule(url) ?? { like });
  set(sheet.image, { density: sheet.density });
  for (const scene of scenes) {
    set(scene.background, { size: SCENE_SIZE });
    if (scene.foreground) set(scene.foreground, { size: SCENE_SIZE });
    for (const url of sceneImages(scene)) sprite(url, scene.background);
  }
  set(map.background, { size: SCENE_SIZE });
  for (const url of travelMapImages(map)) sprite(url, map.background);
  return rules;
}

/**
 * An image's density under `rules`, given the pixel size of each loaded
 * image. Density 1 while the image its rule measures hasn't loaded, and for
 * an image with no rule.
 */
export function resolveDensity(
  url: string,
  rules: ReadonlyMap<string, DensityRule>,
  pixelSize: (url: string) => Size | undefined,
): Density {
  let from = url;
  let rule = rules.get(url);
  if (rule && "like" in rule) {
    from = rule.like;
    rule = rules.get(from);
  }
  if (!rule || "like" in rule) return 1;
  if ("density" in rule) return rule.density;
  const pixels = pixelSize(from);
  return pixels ? detectDensity(pixels, rule.size) : 1;
}

function sharedRule(url: string): DensityRule | undefined {
  const size = sharedLogicalSize(url);
  return size ? { size } : undefined;
}

/** Every image a scene needs, for preloading. */
export function sceneImages(scene: SceneData): string[] {
  const urls = [scene.background];
  if (scene.foreground) urls.push(scene.foreground);
  for (const o of [...scene.objects, ...scene.exits]) {
    if (o.sprite) urls.push(o.sprite);
    urls.push(...Object.values(o.states ?? {}));
  }
  for (const a of scene.animations ?? []) urls.push(a.strip);
  for (const p of scene.props ?? []) urls.push(p.sprite);
  for (const row of scene.slots ?? []) {
    for (const id of [`slot-${row.kind}`, row.fold]) {
      const url = slotSpriteUrl(id);
      if (url) urls.push(url);
    }
  }
  return urls;
}

export function travelMapImages(map: TravelMapData): string[] {
  const urls = [map.background];
  if (map.plane) urls.push(map.plane.strip);
  if (map.marker) urls.push(map.marker);
  return urls;
}

function alphaBox(img: HTMLImageElement): Rect | null {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, width, height);
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export class ImageStore {
  private entries = new Map<string, Entry>();
  private pending = new Map<string, Promise<void>>();
  private failed = new Set<string>();
  private listeners = new Set<() => void>();
  private readonly rules: ReadonlyMap<string, DensityRule>;

  constructor(rules: ReadonlyMap<string, DensityRule> = new Map()) {
    this.rules = rules;
  }

  /** The image, once it has loaded. */
  get(url: string): HTMLImageElement | undefined {
    return this.entries.get(url)?.img;
  }

  /**
   * Image pixels per logical px (density.ts). Density 1 until the image,
   * or the image its rule follows, has loaded.
   */
  density(url: string): Density {
    return resolveDensity(url, this.rules, (u) => {
      const img = this.entries.get(u)?.img;
      return img ? { w: img.naturalWidth, h: img.naturalHeight } : undefined;
    });
  }

  /**
   * Fetches and decodes the image. `priority` is a hint for the browser,
   * so the art the visitor sees first isn't queued behind the rest.
   */
  load(url: string, priority: "high" | "low" | "auto" = "auto"): Promise<void> {
    if (this.entries.has(url)) return Promise.resolve();
    const existing = this.pending.get(url);
    if (existing) return existing;
    const promise = new Promise<void>((resolve) => {
      const img = new Image();
      img.fetchPriority = priority;
      // Decoded before it counts as loaded, so its first frame doesn't
      // stall on a decode.
      const decoded = () =>
        typeof img.decode === "function"
          ? img.decode().catch(() => undefined)
          : Promise.resolve();
      img.onload = () =>
        void decoded().then(() => {
          let bbox: Rect | null = null;
          try {
            bbox = alphaBox(img);
          } catch {
            bbox = null;
          }
          this.entries.set(url, { img, bbox });
          this.pending.delete(url);
          this.info = this.makeInfo();
          this.listeners.forEach((l) => l());
          resolve();
        });
      img.onerror = () => {
        this.pending.delete(url);
        this.failed.add(url);
        console.warn(`Couldn't load ${url}`);
        // A failed image counts as ready (`ready`), so whoever waits on the
        // store hears about it too.
        this.listeners.forEach((l) => l());
        resolve();
      };
      img.src = url;
    });
    this.pending.set(url, promise);
    return promise;
  }

  /**
   * True once every URL has loaded (or failed, so a missing file never
   * freezes the game). The renderer holds its last frame until then, so a
   * scene or the travel map never shows up half drawn.
   */
  ready(urls: readonly string[]): boolean {
    return urls.every((u) => this.entries.has(u) || this.failed.has(u));
  }

  /** How many of `urls` have loaded or failed. */
  settled(urls: readonly string[]): number {
    return urls.filter((u) => this.entries.has(u) || this.failed.has(u)).length;
  }

  loadAll(
    urls: readonly string[],
    priority?: "high" | "low" | "auto",
  ): Promise<void> {
    return Promise.all(urls.map((u) => this.load(u, priority))).then(
      () => undefined,
    );
  }

  /** Notified whenever an image finishes loading. Returns an unsubscribe. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Size and alpha bounding box in logical px, for the engine's default
   * hotspots. A new function after every load, so React can subscribe to it
   * as a snapshot (`useSyncExternalStore(images.subscribe, images.getInfo)`).
   */
  info: SpriteInfo = this.makeInfo();

  getInfo = (): SpriteInfo => this.info;

  private makeInfo(): SpriteInfo {
    const entries = this.entries;
    return (key) => {
      const url = key.startsWith("slot:") ? slotSpriteUrl(key.slice(5)) : key;
      const entry = url ? entries.get(url) : undefined;
      if (!url || !entry) return undefined;
      const w = entry.img.naturalWidth;
      const h = entry.img.naturalHeight;
      const d = this.density(url);
      return {
        w: w / d,
        h: h / d,
        bbox: logicalBox(entry.bbox ?? { x: 0, y: 0, w, h }, d),
      };
    };
  }
}

/**
 * A box in image pixels, in logical px: grown outwards to whole logical
 * px, so a hotspot never loses an edge pixel at density 2.
 */
export function logicalBox(r: Rect, d: Density): Rect {
  const x = Math.floor(r.x / d);
  const y = Math.floor(r.y / d);
  return {
    x,
    y,
    w: Math.ceil((r.x + r.w) / d) - x,
    h: Math.ceil((r.y + r.h) / d) - y,
  };
}
