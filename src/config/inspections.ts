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
        subtitle: "London calling. Skills answering.",
        art: skillsArt,
        artAlt:
          "A crooked red London phone booth stands in its own rainstorm beneath an inside-out umbrella, beside Big Ben and a blank noticeboard",
        paperInsets: { top: 22, right: 8, bottom: 26, left: 57 },
        paragraphs: [],
        pages: Object.entries(PROFILE.skills).map(([group, skills]) => ({
          title: PROFILE.skillGroupLabels[group as keyof typeof PROFILE.skills],
          paragraphs: [skills.join(" · ")],
        })),
      };
    case "experience":
      return {
        title: "Experience",
        subtitle: "All aboard the Swiss career express",
        art: experienceArt,
        artAlt:
          "A lanky driver takes a red Swiss train full of suitcases and a bored cow up an Alpine viaduct beside a timetable board",
        paperInsets: { top: 20, right: 8, bottom: 30, left: 54 },
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
        subtitle: "One small document. Swiss-sized paper trail.",
        art: resumeArt,
        artAlt:
          "A Swiss ticket machine buries an exhausted, lanky station clerk in an endlessly unrolling paper ticket",
        paperInsets: { top: 16, right: 8, bottom: 18, left: 48 },
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
