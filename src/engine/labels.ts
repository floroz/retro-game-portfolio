/**
 * Text for engine-drawn labels, resolved from config so renaming a section
 * or a country never touches an image.
 *
 * In-world labels are minimal: a gate sign is its number and city, and a
 * primary object carries one word. The status line and the toolbar say which
 * sections are where. The animated flight timetable has its own renderer.
 */
import { PROFILE } from "../config/profile";
import { COUNTRIES, SECTIONS } from "../config/sections";
import type { CountrySceneId, LabelSource, Rect, SceneId } from "./types";

type SkillGroup = keyof typeof PROFILE.skills;

const SCENE_NAMES: Record<SceneId, string> = {
  hall: "Airport",
  london: COUNTRIES.london.name,
  zurich: COUNTRIES.zurich.name,
  sorrento: COUNTRIES.sorrento.name,
};

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
        // Separate the gate header and destination while sharing country data.
        return [`Gate ${COUNTRIES[c].gate}`, COUNTRIES[c].name];
      }
      break;
    case "skills":
      if (arg === "groups") {
        return (Object.keys(PROFILE.skills) as SkillGroup[]).map(
          (g) => PROFILE.skillGroupLabels[g],
        );
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
