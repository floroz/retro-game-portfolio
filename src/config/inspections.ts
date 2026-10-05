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
  readingSurface?: "chalkboard";
}

/** Every word of professional content comes from the shared profile. */
export function sectionInspection(section: SectionId): InspectionReading {
  switch (section) {
    case "about":
      return {
        title: `About ${PROFILE.name.split(" ")[0]}`,
        subtitle: "Excess baggage, Sorrento edition",
        art: aboutArt,
        artAlt:
          "Daniele tries to close a suitcase full of lemons, hiking boots and a handheld console on a Sorrento terrace",
        paperInsets: { top: 16, right: 8, bottom: 18, left: 57 },
        paragraphs: [],
        pages: PROFILE.bio.split("\n\n").map((paragraph) => ({
          title: PROFILE.name,
          paragraphs: [paragraph],
        })),
      };
    case "skills":
      return {
        title: "Skills",
        subtitle: "The house specialties. All on tap.",
        art: skillsArt,
        artAlt:
          "An empty oak-framed chalkboard above brass beer pumps and an amber pint in a London pub, with rainy St Paul's through the window",
        paperInsets: { top: 18, right: 8, bottom: 22, left: 47 },
        readingSurface: "chalkboard",
        paragraphs: [],
        pages: Object.entries(PROFILE.skills).map(([group, skills]) => ({
          title: PROFILE.skillGroupLabels[group as keyof typeof PROFILE.skills],
          paragraphs: [skills.join(" · ")],
        })),
      };
    case "experience":
      return {
        title: "Experience",
        subtitle: "A few places. Quite a few chapters.",
        art: experienceArt,
        artAlt:
          "An open burgundy travel album on a chalet table, with mementos from Sorrento, London and Zürich beside a cream reading page",
        paperInsets: { top: 23, right: 8, bottom: 24, left: 54 },
        paragraphs: [],
        pages: [
          ...PROFILE.experienceSummary.split("\n\n").map((paragraph) => ({
            title: "The journey so far",
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
        subtitle: "A direct line from Sorrento",
        art: contactArt,
        artAlt:
          "A red telephone connects to tin cans on a tiled Sorrento terrace, with lemons and the Bay of Naples behind it",
        paperInsets: { top: 14, right: 8, bottom: 24, left: 57 },
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
        subtitle: "The journey, neatly packed.",
        art: resumeArt,
        artAlt:
          "An open leather satchel beside an upright cream resume folio held by a brass clip on a sunny chalet table",
        paperInsets: { top: 22, right: 9, bottom: 24, left: 44 },
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
