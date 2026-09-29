/**
 * Text for engine-drawn labels, resolved from config so renaming a section,
 * a skill group, or a country never touches an image.
 */
import { PROFILE } from "../config/profile";
import {
  COUNTRIES,
  COUNTRY_ORDER,
  SECTIONS,
  sectionsIn,
} from "../config/sections";
import { iconToken } from "./icons";
import type { CountrySceneId, LabelSource, Rect, SceneId } from "./types";

const SCENE_NAMES: Record<SceneId, string> = {
  hall: "Airport",
  london: COUNTRIES.london.name,
  zurich: COUNTRIES.zurich.name,
  sorrento: COUNTRIES.sorrento.name,
};

/** "{skills} Skills", one per section of the country. */
function sectionLines(country: CountrySceneId): string[] {
  return sectionsIn(country).map((s) => `${iconToken(s)} ${SECTIONS[s].label}`);
}

/** Lines of text for a label source. */
export function resolveLabel(source: LabelSource): string[] {
  const [kind, ...rest] = source.split(":");
  const arg = rest.join(":");
  switch (kind) {
    case "section":
      if (arg in SECTIONS)
        return [SECTIONS[arg as keyof typeof SECTIONS].label];
      break;
    case "scene":
      if (arg in SCENE_NAMES) return [SCENE_NAMES[arg as SceneId]];
      break;
    case "gate":
      if (arg in COUNTRIES) {
        const c = arg as CountrySceneId;
        return [
          `Gate ${COUNTRIES[c].gate}`,
          COUNTRIES[c].name,
          ...sectionLines(c),
        ];
      }
      break;
    case "departures":
      return COUNTRY_ORDER.map(
        (c) =>
          `${COUNTRIES[c].gate} ${COUNTRIES[c].name} ${sectionLines(c).join(" ")}`,
      );
    case "skills":
      if (arg === "menu") {
        return [
          "On tap",
          ...(
            Object.keys(PROFILE.skills) as (keyof typeof PROFILE.skills)[]
          ).map((g) => PROFILE.skillGroupLabels[g]),
        ];
      }
      break;
    case "text":
      return arg.split("\n");
  }
  return [source];
}

/** Blank px between the end of a marquee's text and its next pass. */
export const MARQUEE_GAP = 8;

/**
 * Left edge of a marquee's text at `nowMs`: it enters at the clip's right
 * edge, leaves past its left edge, and starts again after a short gap.
 */
export function marqueeX(
  marquee: { clip: Rect; pxPerSec: number },
  textWidth: number,
  nowMs: number,
): number {
  const { clip, pxPerSec } = marquee;
  const cycle = clip.w + textWidth + MARQUEE_GAP;
  const travelled = Math.floor((nowMs * pxPerSec) / 1000) % cycle;
  return clip.x + clip.w - travelled;
}
