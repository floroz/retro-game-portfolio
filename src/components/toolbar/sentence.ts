/**
 * The sentence line, as in SCUMM: it names whatever the pointer (or the
 * keyboard focus) is over, "Walk to" when it's over nothing, and during a
 * trip where it's going and how to skip it.
 */
import { COUNTRIES, sectionList, sectionWhere } from "../../config/sections";
import type { CountrySceneId, SectionId } from "../../engine/types";
import type { UtilityId } from "./layout";

export const IDLE_SENTENCE = "Walk to";

/** What a panel control says on hover and to screen readers. */
export function controlSentence(
  control: SectionId | UtilityId,
  soundEnabled = false,
): string {
  switch (control) {
    case "talk":
      return "Talk to Daniele";
    case "sound":
      return soundEnabled ? "Turn off the sound" : "Turn on the sound";
    case "github":
      return "Visit GitHub profile";
    case "linkedin":
      return "Visit LinkedIn profile";
    default:
      // "Skills, in London": the section and where it lives.
      return sectionWhere(control);
  }
}

interface SentenceState {
  hoveredObject: string | null;
  skippable: boolean;
  flyingTo: CountrySceneId | null;
}

export function sentenceText({
  hoveredObject,
  skippable,
  flyingTo,
}: SentenceState): string {
  // The travel map labels only the city; the sentence line names its
  // sections.
  if (flyingTo) {
    return `Off to ${COUNTRIES[flyingTo].name}: ${sectionList(flyingTo)}`;
  }
  if (skippable) return "Click to skip";
  return hoveredObject ?? IDLE_SENTENCE;
}
