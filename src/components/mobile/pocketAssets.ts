import day from "../../assets/mobile/coffee-likeness-day.png";
import night from "../../assets/mobile/coffee-likeness-night.png";
import restDay from "../../assets/mobile/coffee-rest-day.png";
import restNight from "../../assets/mobile/coffee-rest-night.png";
import raisedDay from "../../assets/mobile/coffee-wide-day.png";
import raisedNight from "../../assets/mobile/coffee-wide-moonlight.png";
import ferry from "../../assets/mobile/ferry.webp";
import boat from "../../assets/mobile/gozzo-boat.png";
import { sectionInspection } from "../../config/inspections";
import { POCKET_SECTIONS } from "../../config/pocketAdventure";

export const POCKET_ART = {
  day,
  night,
  restDay,
  restNight,
  raisedDay,
  raisedNight,
  ferry,
  boat,
};
export type PocketImages = Record<keyof typeof POCKET_ART, HTMLImageElement>;
const cache = new Map<string, Promise<HTMLImageElement>>();

function decode(url: string, priority: "high" | "low") {
  const cached = cache.get(url);
  if (cached) return cached;
  const image = new Image();
  image.fetchPriority = priority;
  image.src = url;
  const pending = image
    .decode()
    .then(() => image)
    .catch((error: unknown) => {
      cache.delete(url);
      throw error;
    });
  cache.set(url, pending);
  return pending;
}

/** Mobile owns its load order; the desktop's image store is never started. */
export async function loadPocketArt(): Promise<PocketImages> {
  await Promise.all([decode(day, "high"), decode(restDay, "high")]);
  const entries = await Promise.all(
    Object.entries(POCKET_ART).map(
      async ([key, url]) => [key, await decode(url, "low")] as const,
    ),
  );
  return Object.fromEntries(entries) as PocketImages;
}

export function preloadPocketReading() {
  for (const { id } of POCKET_SECTIONS)
    void decode(sectionInspection(id).art, "low").catch(() => {});
}
