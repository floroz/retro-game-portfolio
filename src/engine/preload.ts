/**
 * Loads the game's art in the order the visitor meets it: the title card's
 * boarding pass, then Daniele and the first scene (the Hall), then the
 * other scenes and the travel map, then the inspection cards. Each tier
 * starts once the one before it has finished, so the art on screen next
 * never shares bandwidth with art the visitor can't reach yet. The launch
 * dialog's progress bar follows the first two tiers.
 *
 * Canvas art is listed from the scene configs, so a new scene, sprite or
 * animation needs nothing here. Art drawn as a plain `<img>` (the boarding
 * pass, the inspection cards) is listed by hand: add any new one below.
 */
import boardingPass from "../assets/remaster/title/boarding-pass.webp";
import { sectionInspection } from "../config/inspections";
import {
  CHARACTER_RIG,
  CHARACTER_SHEET,
  sceneImages,
  travelMapImages,
} from "./assets";
import { images } from "./runtime";
import { START_SCENE } from "./SceneEngine";
import { SCENES, TRAVEL_MAP_DATA } from "./scenes";
import type { SectionId } from "./types";

const SECTIONS = Object.keys({
  about: true,
  skills: true,
  experience: true,
  contact: true,
  resume: true,
} satisfies Record<SectionId, true>) as SectionId[];

export interface PreloadTier {
  urls: string[];
  priority: "high" | "low";
  /**
   * Art the canvas draws goes in the image store. The rest (the inspection
   * cards, plain `<img>`s) only needs to be in the browser's cache.
   */
  canvas: boolean;
}

/** Every image the game shows, each in the first tier that needs it. */
export function preloadTiers(): PreloadTier[] {
  const seen = new Set<string>();
  const tier = (
    urls: string[],
    priority: PreloadTier["priority"],
    canvas = true,
  ): PreloadTier => {
    const fresh = [...new Set(urls)].filter((url) => !seen.has(url));
    fresh.forEach((url) => seen.add(url));
    return { urls: fresh, priority, canvas };
  };
  return [
    tier([boardingPass], "high"),
    tier(
      [
        CHARACTER_SHEET.image,
        ...(CHARACTER_RIG ? [CHARACTER_RIG.image] : []),
        ...sceneImages(SCENES[START_SCENE]),
      ],
      "high",
    ),
    tier(
      [
        ...Object.values(SCENES).flatMap(sceneImages),
        ...travelMapImages(TRAVEL_MAP_DATA),
      ],
      "low",
    ),
    tier(
      SECTIONS.map((section) => sectionInspection(section).art),
      "low",
      false,
    ),
  ];
}

const TIERS = preloadTiers();

/** What the launch dialog waits for: the title card and the first scene. */
const LAUNCH_IMAGES = TIERS.slice(0, 2).flatMap((tier) => tier.urls);

/** Fetches an image into the browser's cache, then lets it go. */
function warm(url: string, priority: PreloadTier["priority"]): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.fetchPriority = priority;
    img.onload = img.onerror = () => resolve();
    img.src = url;
  });
}

let started = false;

/** Starts loading every tier in turn. Safe to call more than once. */
export function startPreload(): void {
  if (started) return;
  started = true;
  void TIERS.reduce<Promise<void>>(
    (previous, { urls, priority, canvas }) =>
      previous.then(() =>
        canvas
          ? images.loadAll(urls, priority)
          : Promise.all(urls.map((url) => warm(url, priority))).then(
              () => undefined,
            ),
      ),
    Promise.resolve(),
  );
}

/** Share of the launch art loaded (or failed), from 0 to 1. */
export const launchProgress = (): number =>
  images.settled(LAUNCH_IMAGES) / LAUNCH_IMAGES.length;

/** Notified as each image loads. Returns an unsubscribe. */
export const subscribeProgress = images.subscribe;
