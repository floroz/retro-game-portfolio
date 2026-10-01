import type { SectionId } from "../engine/types";
import { PROFILE } from "./profile";

/** Positions are percentages of the uncropped 2:3 portrait painting. */
export const POCKET_HOTSPOTS: {
  section: SectionId;
  label: string;
  x: number;
  y: number;
}[] = [
  { section: "about", label: "Postcards · About", x: 14, y: 35 },
  { section: "contact", label: "Telephone · Contact", x: 89, y: 39 },
  { section: "experience", label: "Career album · Experience", x: 49, y: 60 },
  { section: "resume", label: "Document folder · Resume", x: 74, y: 61 },
  { section: "skills", label: "Backpack and laptop · Skills", x: 12, y: 80 },
];

export const POCKET_SECTIONS: { id: SectionId; label: string }[] = [
  { id: "experience", label: "Experience" },
  { id: "resume", label: "Resume" },
  { id: "contact", label: "Contact" },
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
];

export const POCKET_CONVERSATION = {
  greeting:
    "Make yourself at home. The coffee is real. The kitchen is mostly pixels.",
  coffee:
    "A proper moka takes its time. Fortunately, my resume opens immediately.",
  work: `The short version? ${PROFILE.experienceSummary.split("\n\n")[0]}`,
};
