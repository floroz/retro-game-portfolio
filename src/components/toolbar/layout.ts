/**
 * Where everything sits on the controls panel: the travel trunk under the
 * scene (docs/expansion-plan.md, "How visitors know where each section
 * is"). The panel is painted on the scenes' own grid: 640x80 art px, shown
 * at 2x nearest-neighbour under the 1280x640 scene.
 *
 * - The **sentence line** runs along the top, as in SCUMM ("Walk to").
 * - One **boarding pass** per country, in journey order: its stub carries
 *   the city's emblem, its header the city's name, and its body one row per
 *   section that lives there. Grouping the sections on their city's ticket
 *   is what teaches the mapping; nothing in the scene has to.
 * - Four **brass fittings** on the right, two by two: Talk, Sound, GitHub,
 *   and LinkedIn.
 *
 * Every rect is in art px with a top-left origin.
 */
import { COUNTRY_ORDER, SECTIONS } from "../../config/sections";
import type { CountrySceneId, Rect, SectionId } from "../../engine/types";

export const PANEL_W = 640;
export const PANEL_H = 80;

export type UtilityId = "talk" | "sound" | "github" | "linkedin";

export interface TicketLayout {
  country: CountrySceneId;
  rect: Rect;
  /** The tear-off stub with the city's emblem. */
  stub: Rect;
  /** The coloured header with the city's name. */
  header: Rect;
  /** One clickable row per section, top to bottom. */
  rows: { section: SectionId; rect: Rect }[];
}

interface PanelLayout {
  sentence: Rect;
  tickets: TicketLayout[];
  utilities: { id: UtilityId; rect: Rect }[];
}

const MARGIN = 6;
const TICKET_GAP = 6;
const TICKET_TOP = 25;
const TICKET_H = 52;
const STUB_W = 32;
const HEADER_H = 14;
/** Art px of ticket border and padding around the rows. */
const ROW_INSET = 2;

/** The fittings sit two by two, 24 art px across. */
const UTILITY = 24;
const UTILITY_GAP = 4;
const UTILITY_COLS = 2;
const UTILITY_ORDER: UtilityId[] = ["talk", "sound", "github", "linkedin"];

/** Section order on each ticket: the toolbar's order since v1. */
const ROW_ORDER: SectionId[] = [
  "experience",
  "resume",
  "skills",
  "about",
  "contact",
];

function buildLayout(): PanelLayout {
  const utilitiesW = UTILITY_COLS * UTILITY + (UTILITY_COLS - 1) * UTILITY_GAP;
  const ticketsW = PANEL_W - MARGIN * 2 - utilitiesW - TICKET_GAP * 2;
  const ticketW = Math.floor(
    (ticketsW - TICKET_GAP * (COUNTRY_ORDER.length - 1)) / COUNTRY_ORDER.length,
  );

  const tickets = COUNTRY_ORDER.map((country, i): TicketLayout => {
    const x = MARGIN + i * (ticketW + TICKET_GAP);
    const rect = { x, y: TICKET_TOP, w: ticketW, h: TICKET_H };
    const bodyX = x + STUB_W;
    const bodyW = ticketW - STUB_W;
    const sections = ROW_ORDER.filter((s) => SECTIONS[s].home === country);
    const rowsTop = TICKET_TOP + HEADER_H;
    const rowsH = TICKET_H - HEADER_H - ROW_INSET;
    const rowH = Math.floor(rowsH / sections.length);
    return {
      country,
      rect,
      stub: { x, y: TICKET_TOP, w: STUB_W, h: TICKET_H },
      header: { x: bodyX, y: TICKET_TOP, w: bodyW, h: HEADER_H },
      rows: sections.map((section, r) => ({
        section,
        rect: {
          x: bodyX + ROW_INSET,
          y: rowsTop + r * rowH,
          w: bodyW - ROW_INSET * 2,
          h: rowH,
        },
      })),
    };
  });

  const utilitiesX = PANEL_W - MARGIN - utilitiesW;
  const utilities = UTILITY_ORDER.map((id, i) => ({
    id,
    rect: {
      x: utilitiesX + (i % UTILITY_COLS) * (UTILITY + UTILITY_GAP),
      y: TICKET_TOP + Math.floor(i / UTILITY_COLS) * (UTILITY + UTILITY_GAP),
      w: UTILITY,
      h: UTILITY,
    },
  }));

  return {
    sentence: { x: MARGIN, y: 3, w: PANEL_W - MARGIN * 2, h: 19 },
    tickets,
    utilities,
  };
}

export const PANEL_LAYOUT: PanelLayout = buildLayout();

/** A rect as percentages of the panel, for the HTML controls over it. */
export function panelPct(r: Rect) {
  return {
    left: `${(r.x / PANEL_W) * 100}%`,
    top: `${(r.y / PANEL_H) * 100}%`,
    width: `${(r.w / PANEL_W) * 100}%`,
    height: `${(r.h / PANEL_H) * 100}%`,
  };
}
