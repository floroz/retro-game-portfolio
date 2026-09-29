/**
 * Image loading for the canvas renderer. Everything is preloaded up front
 * (the art is tiny at 320x160), so scene changes and the travel map never
 * flash an unloaded image.
 */
import sheetJson from "../assets/character/daniele.json";
import sheetUrl from "../assets/character/daniele.png";
import { parseSheet, type CharacterSheet } from "./character";
import type { SpriteInfo } from "./SceneEngine";
import type { Rect, SceneData, TravelMapData } from "./types";

const SLOT_SPRITES = import.meta.glob<string>("../assets/shared/slots/*.png", {
  eager: true,
  import: "default",
});

/** Slot sprite URL by id ("slot-tap", "slot-tap-more"). */
export function slotSpriteUrl(id: string): string | undefined {
  return SLOT_SPRITES[`../assets/shared/slots/${id}.png`];
}

/** Every slot sprite id that exists. */
export function slotSpriteIds(): string[] {
  return Object.keys(SLOT_SPRITES).map((path) =>
    path.slice(path.lastIndexOf("/") + 1, -".png".length),
  );
}

export const CHARACTER_SHEET: CharacterSheet = parseSheet(sheetJson, sheetUrl);

interface Entry {
  img: HTMLImageElement;
  bbox: Rect | null;
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
  private listeners = new Set<() => void>();

  /** The image, once it has loaded. */
  get(url: string): HTMLImageElement | undefined {
    return this.entries.get(url)?.img;
  }

  load(url: string): Promise<void> {
    if (this.entries.has(url)) return Promise.resolve();
    const existing = this.pending.get(url);
    if (existing) return existing;
    const promise = new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
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
      };
      img.onerror = () => {
        this.pending.delete(url);
        console.warn(`Couldn't load ${url}`);
        resolve();
      };
      img.src = url;
    });
    this.pending.set(url, promise);
    return promise;
  }

  loadAll(urls: string[]): Promise<void> {
    return Promise.all(urls.map((u) => this.load(u))).then(() => undefined);
  }

  /** Notified whenever an image finishes loading. Returns an unsubscribe. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Size and alpha bounding box, for the engine's default hotspots. A new
   * function after every load, so React can subscribe to it as a snapshot
   * (`useSyncExternalStore(images.subscribe, images.getInfo)`).
   */
  info: SpriteInfo = this.makeInfo();

  getInfo = (): SpriteInfo => this.info;

  private makeInfo(): SpriteInfo {
    const entries = this.entries;
    return (key) => {
      const url = key.startsWith("slot:") ? slotSpriteUrl(key.slice(5)) : key;
      const entry = url ? entries.get(url) : undefined;
      if (!entry) return undefined;
      const w = entry.img.naturalWidth;
      const h = entry.img.naturalHeight;
      return { w, h, bbox: entry.bbox ?? { x: 0, y: 0, w, h } };
    };
  }
}
