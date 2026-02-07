import type { ActionType } from "../types/game";
import { PROFILE } from "./profile";

interface TerminalScreenPage {
  /** Pre-formatted text content for this page */
  content: string;
}

export interface TerminalScreenSection {
  /** Boot filename shown in loading sequence, e.g. "SKILLS.DAT" */
  filename: string;
  /** Section title displayed after boot, e.g. "TECHNICAL SKILLS" */
  title: string;
  /** Paginated content */
  pages: TerminalScreenPage[];
}

/**
 * Maximum lines of content per page.
 *
 * Derived from the available vertical space inside the terminal screen:
 *   Game canvas height ≈ 800px
 *   − body padding (32 top + 32 bottom = 64)
 *   − boot line (~40px)
 *   − separator + title (~48px)
 *   − footer (separator + pagination + nav hints ≈ 70px)
 *   Available ≈ 578px
 *   Content line height: 20px × 1.5 = 30px → ~19 lines
 *
 * Use 18 to leave comfortable margin.
 */
const MAX_LINES_PER_PAGE = 18;

const SEPARATOR = "─".repeat(50);

/**
 * Split a multi-line content string into pages of at most `maxLines` lines.
 * Tries to break at blank lines (paragraph boundaries) when possible so
 * sections aren't split mid-paragraph.
 */
function paginateContent(
  text: string,
  maxLines: number = MAX_LINES_PER_PAGE,
): TerminalScreenPage[] {
  const lines = text.split("\n");

  if (lines.length <= maxLines) {
    return [{ content: text }];
  }

  const pages: TerminalScreenPage[] = [];
  let start = 0;

  while (start < lines.length) {
    const end = start + maxLines;

    if (end >= lines.length) {
      // Last page — take everything remaining
      pages.push({ content: lines.slice(start).join("\n") });
      break;
    }

    // Try to find a blank-line break point within the last quarter of the page
    // to avoid splitting mid-paragraph
    let breakAt = -1;
    const searchStart = Math.max(start + Math.floor(maxLines * 0.6), start);
    for (let i = end - 1; i >= searchStart; i--) {
      if (lines[i].trim() === "") {
        breakAt = i;
        break;
      }
    }

    if (breakAt > start) {
      // Break at blank line — include lines up to (but not including) the blank line
      pages.push({ content: lines.slice(start, breakAt).join("\n") });
      // Skip the blank line itself so the next page starts with content
      start = breakAt + 1;
    } else {
      // No good break point — hard cut at maxLines
      pages.push({ content: lines.slice(start, end).join("\n") });
      start = end;
    }
  }

  return pages;
}

function buildSkillsSection(): TerminalScreenSection {
  const content = [
    `Frontend`,
    SEPARATOR,
    ...PROFILE.skills.frontend.map((s) => `  * ${s}`),
    "",
    `Backend`,
    SEPARATOR,
    ...PROFILE.skills.backend.map((s) => `  * ${s}`),
    "",
    `AI & Developer Tools`,
    SEPARATOR,
    ...PROFILE.skills.ai.map((s) => `  * ${s}`),
    "",
    `Cloud & DevOps`,
    SEPARATOR,
    ...PROFILE.skills.cloud.map((s) => `  * ${s}`),
    "",
    `Data & Infrastructure`,
    SEPARATOR,
    ...PROFILE.skills.data.map((s) => `  * ${s}`),
    "",
    `Testing`,
    SEPARATOR,
    ...PROFILE.skills.testing.map((s) => `  * ${s}`),
    "",
    `Leadership & Process`,
    SEPARATOR,
    ...PROFILE.skills.leadership.map((s) => `  * ${s}`),
  ].join("\n");

  return {
    filename: "SKILLS.DAT",
    title: "TECHNICAL SKILLS",
    pages: paginateContent(content),
  };
}

function buildExperienceSection(): TerminalScreenSection {
  const workEntries = PROFILE.workExperience.map(
    (w) => `  ${w.role} @ ${w.company}\n  ${w.period}`,
  );

  const content = [
    PROFILE.experienceSummary,
    "",
    `Work History`,
    SEPARATOR,
    "",
    ...workEntries.flatMap((entry, i) => [
      entry,
      i < workEntries.length - 1 ? "" : "",
    ]),
  ].join("\n");

  return {
    filename: "CAREER.DAT",
    title: "WORK EXPERIENCE",
    pages: paginateContent(content),
  };
}

function buildAboutSection(): TerminalScreenSection {
  return {
    filename: "ABOUT.DAT",
    title: `ABOUT ${PROFILE.name.split(" ")[0].toUpperCase()}`,
    pages: paginateContent(PROFILE.bio),
  };
}

function buildContactSection(): TerminalScreenSection {
  const interests = PROFILE.contactInterests.map((i) => `  * ${i}`).join("\n");

  const content = [
    `Let's connect!`,
    "",
    `  Email:    ${PROFILE.email}`,
    `  LinkedIn: ${PROFILE.social.linkedin}`,
    `  GitHub:   ${PROFILE.social.github}`,
    `  Location: ${PROFILE.location}`,
    "",
    `I'm always open to discussing:`,
    interests,
  ].join("\n");

  return {
    filename: "CONTACT.DAT",
    title: "CONTACT",
    pages: paginateContent(content),
  };
}

function buildResumeSection(): TerminalScreenSection {
  const content = [
    `${PROFILE.name}`,
    `${PROFILE.title}`,
    `${PROFILE.location}`,
    "",
    SEPARATOR,
    "",
    `Download my resume for full details:`,
    "",
    `  > <a style="color: inherit; text-decoration: underline;" href="${PROFILE.resumeUrl}" target="_blank" rel="noopener noreferrer">${PROFILE.resumeUrl}</a>`,
    "",
    SEPARATOR,
    "",
    `GitHub Projects:`,
    "",
    `> <a style="color: inherit; text-decoration: underline;" href="${PROFILE.social.github}/floroz" target="_blank" rel="noopener noreferrer">${PROFILE.social.github}/floroz</a>`,
  ].join("\n");

  return {
    filename: "RESUME.DAT",
    title: "RESUME",
    pages: paginateContent(content),
  };
}

/**
 * Get structured terminal screen content for a given action.
 * Returns null for "talk" action which uses the dialog system instead.
 */
export function getTerminalScreenContent(
  action: ActionType,
): TerminalScreenSection | null {
  switch (action) {
    case "skills":
      return buildSkillsSection();
    case "experience":
      return buildExperienceSection();
    case "about":
      return buildAboutSection();
    case "contact":
      return buildContactSection();
    case "resume":
      return buildResumeSection();
    case "talk":
      return null;
  }
}
