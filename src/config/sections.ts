/**
 * Where each section lives in the world. The toolbar, gate signs,
 * the travel map, and the router all read this one table.
 */
import type {
  CountrySceneId,
  JobCountry,
  SceneId,
  SectionId,
} from "../engine/types";

interface SectionInfo {
  label: string;
  /** The country scene whose primary object opens it. */
  home: CountrySceneId;
}

export const SECTIONS: Record<SectionId, SectionInfo> = {
  skills: { label: "Skills", home: "london" },
  experience: { label: "Experience", home: "zurich" },
  resume: { label: "Resume", home: "zurich" },
  about: { label: "About", home: "sorrento" },
  contact: { label: "Contact", home: "sorrento" },
};

/** Toolbar order. */
const SECTION_ORDER: SectionId[] = [
  "experience",
  "skills",
  "about",
  "contact",
  "resume",
];

interface CountryInfo {
  /** City name, used on signs and the map. */
  name: string;
  /** Country name, for "Fly to" hover text. */
  country: string;
  /** Jobs with this `country` in profile.ts leave their memento here. */
  jobCountry: JobCountry;
  gate: number;
}

export const COUNTRIES: Record<CountrySceneId, CountryInfo> = {
  london: { name: "London", country: "England", jobCountry: "london", gate: 2 },
  zurich: {
    name: "Zürich",
    country: "Switzerland",
    jobCountry: "switzerland",
    gate: 3,
  },
  sorrento: {
    name: "Sorrento",
    country: "Italy",
    jobCountry: "italy",
    gate: 1,
  },
};

export const COUNTRY_ORDER: CountrySceneId[] = ["sorrento", "london", "zurich"];

export function isCountryScene(id: SceneId): id is CountrySceneId {
  return id !== "hall";
}

/** Sections whose primary object is in this country, in toolbar order. */
function sectionsIn(country: CountrySceneId): SectionId[] {
  return SECTION_ORDER.filter((s) => SECTIONS[s].home === country);
}

/** "Skills, in London": a toolbar button's hover and status text. */
export function sectionWhere(section: SectionId): string {
  return `${SECTIONS[section].label}, in ${COUNTRIES[SECTIONS[section].home].name}`;
}

/** "Skills" or "Experience, Resume". */
export function sectionList(country: CountrySceneId): string {
  return sectionsIn(country)
    .map((s) => SECTIONS[s].label)
    .join(", ");
}
