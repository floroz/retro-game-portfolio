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
import { iconToken } from "./font";
import type { CountrySceneId, LabelSource, SceneId } from "./types";

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
