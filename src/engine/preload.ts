/**
 * Loads the game's art in the order the visitor meets it: the title card's
 * boarding pass, then Daniele and the Hall, then the other scenes and the
 * travel map, then the inspection cards. Each tier starts once the one
 * before it has finished, so the art on screen next never shares bandwidth
 * with art the visitor can't reach yet. The launch dialog's progress bar
 * follows the first two tiers.
 */
import boardingPass from "../assets/remaster/title/boarding-pass.webp";
import { sectionInspection } from "../config/inspections";
import { SOUVENIRS } from "../config/souvenirs";
import {
  CHARACTER_RIG,
  CHARACTER_SHEET,
  sceneImages,
  travelMapImages,
} from "./assets";
import { images } from "./runtime";
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
}

/** Every image the game shows, each in the first tier that needs it. */
export function preloadTiers(): PreloadTier[] {
  const seen = new Set<string>();
  const tier = (urls: string[], priority: PreloadTier["priority"]) => {
    const fresh = [...new Set(urls)].filter((url) => !seen.has(url));
    fresh.forEach((url) => seen.add(url));
    return { urls: fresh, priority };
  };
  return [
    tier([boardingPass], "high"),
    // The game opens in the Hall (SceneEngine's default start).
    tier(
      [
        CHARACTER_SHEET.image,
        ...(CHARACTER_RIG ? [CHARACTER_RIG.image] : []),
        ...sceneImages(SCENES.hall),
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
      [
        ...SECTIONS.map((section) => sectionInspection(section).art),
        ...Object.values(SOUVENIRS).map((souvenir) => souvenir.art),
      ],
      "low",
    ),
  ];
}

const TIERS = preloadTiers();

/** What the launch dialog waits for: the title card and the Hall. */
const LAUNCH_IMAGES = TIERS.slice(0, 2).flatMap((tier) => tier.urls);

let started = false;

/** Starts loading every tier in turn. Safe to call more than once. */
export function startPreload(): void {
  if (started) return;
  started = true;
  void TIERS.reduce<Promise<void>>(
    (previous, { urls, priority }) =>
      previous.then(() => images.loadAll(urls, priority)),
    Promise.resolve(),
  );
}

/** Share of the launch art loaded (or failed), from 0 to 1. */
export const launchProgress = (): number =>
  images.settled(LAUNCH_IMAGES) / LAUNCH_IMAGES.length;

/** Notified as each image loads. Returns an unsubscribe. */
export const subscribeProgress = images.subscribe;
