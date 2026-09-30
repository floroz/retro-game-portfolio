import { PROFILE } from "./profile";
import type { ObjectInspection, SectionId } from "../engine/types";
import aboutArt from "../assets/remaster/inspections/about.webp";
import contactArt from "../assets/remaster/inspections/contact.webp";
import experienceArt from "../assets/remaster/inspections/experience.webp";
import resumeArt from "../assets/remaster/inspections/resume.webp";
import skillsArt from "../assets/remaster/inspections/skills.webp";

interface ReadingPage {
  title: string;
  paragraphs: string[];
  links?: { label: string; href: string }[];
}

export interface InspectionReading extends ObjectInspection {
  pages?: ReadingPage[];
}

/** Every word of professional content comes from the shared profile. */
export function sectionInspection(section: SectionId): InspectionReading {
  switch (section) {
    case "about":
      return {
        title: `About ${PROFILE.name.split(" ")[0]}`,
        subtitle: "A postcard from home",
        art: aboutArt,
        artAlt: "A postcard album on a Sorrento kitchen table",
        paragraphs: [],
        pages: PROFILE.bio.split("\n\n").map((paragraph) => ({
          title: PROFILE.name,
          paragraphs: [paragraph],
        })),
      };
    case "skills":
      return {
        title: "Skills",
        subtitle: "The working kit",
        art: skillsArt,
        artAlt:
          "A leather tool roll, notebook and brass instruments on an oak table",
        paragraphs: [],
        pages: Object.entries(PROFILE.skills).map(([group, skills]) => ({
          title: PROFILE.skillGroupLabels[group as keyof typeof PROFILE.skills],
          paragraphs: [skills.join(" · ")],
        })),
      };
    case "experience":
      return {
        title: "Experience",
        subtitle: "A career in mementos",
        art: experienceArt,
        artAlt: "A career album and mementos on a chalet desk",
        paragraphs: [],
        pages: [
          ...PROFILE.experienceSummary.split("\n\n").map((paragraph) => ({
            title: "From the career album",
            paragraphs: [paragraph],
          })),
          ...PROFILE.workExperience.map((job) => ({
            title: job.company,
            paragraphs: [job.role, job.period],
          })),
        ],
      };
    case "contact":
      return {
        title: "Contact",
        subtitle: "The address book",
        art: contactArt,
        artAlt: "A telephone and open address book in Sorrento",
        paragraphs: [],
        pages: [
          {
            title: "Let's connect",
            paragraphs: [PROFILE.name, PROFILE.location],
            links: [
              { label: PROFILE.email, href: `mailto:${PROFILE.email}` },
              { label: "LinkedIn", href: PROFILE.social.linkedin },
              { label: "GitHub", href: PROFILE.social.github },
            ],
          },
          {
            title: "Always open to discussing",
            paragraphs: [...PROFILE.contactInterests],
          },
        ],
      };
    case "resume":
      return {
        title: "Resume",
        subtitle: "The document folder",
        art: resumeArt,
        artAlt: "A resume folio and papers on a wooden desk",
        paragraphs: [],
        pages: [
          {
            title: PROFILE.name,
            paragraphs: [PROFILE.title, PROFILE.location],
            links: [
              {
                label: "Read or download my resume (PDF)",
                href: PROFILE.resumeUrl,
              },
              {
                label: "Browse my projects on GitHub",
                href: PROFILE.social.github,
              },
            ],
          },
        ],
      };
  }
}
