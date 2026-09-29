/**
 * Paints the controls panel (layout.ts) on a 1280x160 canvas: 2 canvas px
 * per art px, so the 640x80 panel lines up with the scene's 640x320 grid
 * when both are shown at 2x. Art is whole art-px rects, never smoothed;
 * text goes through the engine's font (font.ts), like every sign and line
 * in the scene.
 *
 * The static trunk (wood, brass, paper, emblems) is painted once and
 * cached; the live layer (hover, the stamp, the sentence, text) is painted
 * over it whenever the panel's state changes.
 */
import { COUNTRIES, SECTIONS } from "../../config/sections";
import {
  capHeight,
  drawText,
  measureText,
  type TextLayer,
} from "../../engine/font";
import { iconRows } from "../../engine/icons";
import type { CountrySceneId, Rect, SectionId } from "../../engine/types";
import {
  PANEL_H,
  PANEL_LAYOUT,
  PANEL_W,
  type TicketLayout,
  type UtilityId,
} from "./layout";
import { EMBLEM, ICON, INK, Sprite, emblem, fittingIcon } from "./sprites";

/** Canvas px per art px. */
const ART = 2;
export const CANVAS_PANEL_W = PANEL_W * ART;
export const CANVAS_PANEL_H = PANEL_H * ART;

/** Art px per logical px (the font's layout unit). */
const LOGICAL = 2;

export type ControlId = SectionId | UtilityId;

export interface PanelView {
  /** The country whose ticket is stamped: the current scene, or the trip's. */
  here: CountrySceneId | null;
  hovered: ControlId | null;
  pressed: ControlId | null;
  sentence: string;
  /** The sentence line is idle ("Walk to"), so it's drawn dimmer. */
  idle: boolean;
  soundEnabled: boolean;
}

// --- Colours -----------------------------------------------------------------

const WOOD = ["#2a1812", "#3a2219", "#4a2d20", "#5a3726", "#6b4330"];
const BRASS = {
  dark: "#7a5518",
  mid: "#b8862a",
  light: "#e2b54a",
  hi: "#f7de8a",
};
const PAPER = {
  light: "#efe3c4",
  mid: "#e2d2ac",
  shade: "#c9b58a",
  edge: "#9c855e",
};
const LEATHER = "#2e1712";
const STAMP = "#c0281f";
const SENTENCE = "#f4ecd8";
const SENTENCE_IDLE = "#bba882";
const LABEL = "#3a2219";

/** Each city's ticket colour: the journey from grey to cool to warm. */
const COUNTRY_INK: Record<CountrySceneId, { mid: string; dark: string }> = {
  london: { mid: "#44567a", dark: "#28344d" },
  zurich: { mid: "#5f3163", dark: "#3b1d3e" },
  sorrento: { mid: "#b5542f", dark: "#7a3218" },
};

// --- Drawing helpers -----------------------------------------------------------

type Ctx = CanvasRenderingContext2D;

function fill(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x * ART, y * ART, w * ART, h * ART);
}

function blit(ctx: Ctx, s: Sprite, x: number, y: number) {
  for (let j = 0; j < s.h; j++) {
    for (let i = 0; i < s.w; i++) {
      const c = s.get(i, j);
      if (c) fill(ctx, x + i, y + j, 1, 1, c);
    }
  }
}

/** A deterministic hash in [0, 1), so the grain is the same every time. */
function noise(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// --- The static trunk ----------------------------------------------------------

function paintWood(ctx: Ctx) {
  // Horizontal planks with dark seams, streaky grain, and the odd knot.
  const planks = [0, 22, 50, 80];
  for (let p = 0; p < planks.length - 1; p++) {
    const top = planks[p];
    const bottom = planks[p + 1];
    fill(ctx, 0, top, PANEL_W, bottom - top, WOOD[2]);
    for (let y = top + 1; y < bottom - 1; y++) {
      let x = 0;
      while (x < PANEL_W) {
        const n = noise(x, y, p);
        const len = 6 + Math.floor(noise(y, x, p + 7) * 40);
        const tone = n < 0.18 ? WOOD[1] : n > 0.86 ? WOOD[3] : null;
        if (tone) fill(ctx, x, y, Math.min(len, PANEL_W - x), 1, tone);
        x += len;
      }
    }
    // The lit top edge and the dark seam under each plank.
    fill(ctx, 0, top, PANEL_W, 1, WOOD[3]);
    fill(ctx, 0, bottom - 1, PANEL_W, 1, WOOD[0]);
    const knotX = 40 + Math.floor(noise(p, 3) * 560);
    const knotY = top + Math.floor((bottom - top) / 2);
    fill(ctx, knotX - 2, knotY, 5, 1, WOOD[1]);
    fill(ctx, knotX - 1, knotY - 1, 3, 3, WOOD[0]);
  }
}

function paintBrassStrip(ctx: Ctx) {
  // The trunk's top edge: an ink line, then a brass band.
  fill(ctx, 0, 0, PANEL_W, 1, INK);
  fill(ctx, 0, 1, PANEL_W, 1, BRASS.light);
  fill(ctx, 0, 2, PANEL_W, 1, BRASS.dark);
}

function rivet(ctx: Ctx, x: number, y: number) {
  fill(ctx, x - 1, y - 1, 3, 3, INK);
  fill(ctx, x, y - 1, 2, 2, BRASS.mid);
  fill(ctx, x, y - 1, 1, 1, BRASS.hi);
}

function paintSentenceGroove(ctx: Ctx) {
  const { x, y, w, h } = PANEL_LAYOUT.sentence;
  // A dark recessed groove, like the black band of the SCUMM sentence line.
  fill(ctx, x, y, w, h, "#140c09");
  fill(ctx, x, y, w, 1, "#0a0605");
  fill(ctx, x, y + h, w, 1, WOOD[4]);
  fill(ctx, x - 1, y, 1, h, "#0a0605");
  fill(ctx, x + w, y, 1, h + 1, WOOD[3]);
  rivet(ctx, 2, y + Math.floor(h / 2));
  rivet(ctx, PANEL_W - 3, y + Math.floor(h / 2));
}

/** Whether art px `x`,`y` of a ticket is paper: notched at the perforation. */
function onTicket(t: TicketLayout, x: number, y: number): boolean {
  const { rect } = t;
  const px = x - rect.x;
  const py = y - rect.y;
  if (px < 0 || py < 0 || px >= rect.w || py >= rect.h) return false;
  // Clipped corners.
  const corner = (a: number, b: number) => a + b < 2;
  if (
    corner(px, py) ||
    corner(rect.w - 1 - px, py) ||
    corner(px, rect.h - 1 - py) ||
    corner(rect.w - 1 - px, rect.h - 1 - py)
  ) {
    return false;
  }
  // Half-round notches top and bottom where the stub tears off.
  const nx = px - t.stub.w;
  for (const ny of [py, rect.h - 1 - py]) {
    if (nx * nx + ny * ny <= 9) return false;
  }
  return true;
}

function paintTicket(ctx: Ctx, t: TicketLayout) {
  const { rect, stub, header, country } = t;
  const inkColor = COUNTRY_INK[country];
  // Drop shadow, then the paper with its ink rim.
  for (let y = rect.y - 1; y <= rect.y + rect.h + 1; y++) {
    for (let x = rect.x - 1; x <= rect.x + rect.w + 1; x++) {
      if (onTicket(t, x, y)) {
        const inStub = x < stub.x + stub.w;
        const speck = noise(x, y, 11) < 0.08;
        fill(
          ctx,
          x,
          y,
          1,
          1,
          speck ? PAPER.shade : inStub ? PAPER.mid : PAPER.light,
        );
      } else if (onTicket(t, x - 1, y - 1) && !onTicket(t, x, y)) {
        fill(ctx, x, y, 1, 1, WOOD[0]);
      }
    }
  }
  for (let y = rect.y - 1; y <= rect.y + rect.h; y++) {
    for (let x = rect.x - 1; x <= rect.x + rect.w; x++) {
      if (onTicket(t, x, y)) continue;
      if (
        onTicket(t, x - 1, y) ||
        onTicket(t, x + 1, y) ||
        onTicket(t, x, y - 1) ||
        onTicket(t, x, y + 1)
      ) {
        fill(ctx, x, y, 1, 1, INK);
      }
    }
  }
  // The header band in the city's colour.
  for (let x = header.x + 1; x < header.x + header.w - 1; x++) {
    for (let y = header.y + 1; y < header.y + header.h; y++) {
      if (onTicket(t, x, y)) fill(ctx, x, y, 1, 1, inkColor.mid);
    }
  }
  fill(
    ctx,
    header.x + 3,
    header.y + header.h - 1,
    header.w - 4,
    1,
    inkColor.dark,
  );
  // Perforation between stub and body.
  const perf = stub.x + stub.w;
  for (let y = rect.y + 4; y < rect.y + rect.h - 4; y += 2) {
    fill(ctx, perf, y, 1, 1, PAPER.edge);
  }
  // Dashed rules between the rows.
  t.rows.slice(1).forEach(({ rect: r }) => {
    for (let x = r.x + 2; x < r.x + r.w - 2; x += 3) {
      fill(ctx, x, r.y, 2, 1, PAPER.shade);
    }
  });
  // The emblem, and a brass tack pinning the ticket to the trunk.
  const ex = stub.x + Math.floor((stub.w - EMBLEM) / 2);
  const ey = stub.y + Math.floor((stub.h - EMBLEM) / 2) + 2;
  blit(ctx, emblem(country), ex, ey);
  rivet(ctx, stub.x + Math.floor(stub.w / 2), stub.y + 3);
}

/** A round brass fitting, lit from the top left. */
function paintFitting(ctx: Ctx, r: Rect, lit: boolean, dim: boolean) {
  const cx = r.x + r.w / 2 - 0.5;
  const cy = r.y + r.h / 2 - 0.5;
  const outer = r.w / 2;
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > outer) continue;
      let c: string;
      if (d > outer - 1) c = INK;
      else if (d > outer - 3) {
        const light = -(dx + dy) / (d || 1);
        c =
          light > 0.55
            ? lit
              ? BRASS.hi
              : BRASS.light
            : light < -0.45
              ? BRASS.dark
              : lit
                ? BRASS.light
                : BRASS.mid;
      } else if (d > outer - 4) c = INK;
      else c = dim ? "#1f0f0c" : LEATHER;
      fill(ctx, x, y, 1, 1, c);
    }
  }
}

let trunk: HTMLCanvasElement | null = null;

function staticTrunk(): HTMLCanvasElement | null {
  if (trunk) return trunk;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_PANEL_W;
  canvas.height = CANVAS_PANEL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  paintWood(ctx);
  paintBrassStrip(ctx);
  paintSentenceGroove(ctx);
  PANEL_LAYOUT.tickets.forEach((t) => paintTicket(ctx, t));
  trunk = canvas;
  return trunk;
}

// --- The live layer --------------------------------------------------------------

/**
 * A passport entry stamp in red ink at the ticket's far end, "you are
 * here": a double ring round a little plane, worn in places.
 */
const PLANE = [
  ".....##....",
  "......##...",
  "#......##..",
  "##########.",
  ".##########",
  "##########.",
  "#......##..",
  "......##...",
  ".....##....",
];

/** A gold rim just outside the ticket's ink: lit, like a selected verb. */
function paintLit(ctx: Ctx, t: TicketLayout) {
  const { rect } = t;
  for (let y = rect.y - 2; y <= rect.y + rect.h + 1; y++) {
    for (let x = rect.x - 2; x <= rect.x + rect.w + 1; x++) {
      if (onTicket(t, x, y) || nearTicket(t, x, y, 1)) continue;
      if (nearTicket(t, x, y, 2)) fill(ctx, x, y, 1, 1, BRASS.hi);
    }
  }
}

/** Whether a pixel is within `r` px (Chebyshev) of the ticket's paper. */
function nearTicket(t: TicketLayout, x: number, y: number, r: number) {
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      if (onTicket(t, x + i, y + j)) return true;
    }
  }
  return false;
}

function paintStamp(ctx: Ctx, t: TicketLayout) {
  const cx = t.rect.x + t.rect.w - 13.5;
  const cy = t.rect.y + 22.5;
  for (let y = Math.floor(cy - 12); y <= cy + 12; y++) {
    for (let x = Math.floor(cx - 12); x <= cx + 12; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const ring = (d > 9.6 && d <= 11.6) || (d > 7.6 && d <= 8.5);
      if (ring && noise(x, y, 5) > 0.1 && onTicket(t, x, y)) {
        fill(ctx, x, y, 1, 1, STAMP);
      }
    }
  }
  const px = Math.round(cx - 5);
  const py = Math.round(cy - 4);
  PLANE.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === "#" && noise(px + i, py + j, 9) > 0.1) {
        fill(ctx, px + i, py + j, 1, 1, STAMP);
      }
    }
  });
}

function text(
  layer: TextLayer,
  s: string,
  artX: number,
  artY: number,
  font: "regular" | "small",
  color: string,
  outline: string | false,
) {
  drawText(layer, s, artX / LOGICAL, artY / LOGICAL, {
    font,
    color,
    outline,
    shadow: false,
  });
}

/** A font's cap height in art px, for vertical centring. */
const cap = (font: "regular" | "small") => capHeight(font) * LOGICAL;

function paintSectionRow(
  ctx: Ctx,
  layer: TextLayer,
  country: CountrySceneId,
  section: SectionId,
  r: Rect,
  view: PanelView,
) {
  const hovered = view.hovered === section;
  const down = view.pressed === section ? 1 : 0;
  const colors = COUNTRY_INK[country];
  if (hovered) fill(ctx, r.x, r.y + 1, r.w, r.h - 1, PAPER.mid);
  const color = hovered ? colors.mid : LABEL;
  // The section's icon, then its name.
  const rows = iconRows(section);
  const iy = r.y + Math.floor((r.h - ICON) / 2) + down;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === "#") fill(ctx, r.x + 3 + i, iy + j, 1, 1, color);
    }
  });
  const label = SECTIONS[section].label.toUpperCase();
  const ty = r.y + Math.round((r.h - cap("small")) / 2) + down;
  text(layer, label, r.x + 3 + ICON + 5, ty, "small", color, false);
}

function paintTicketText(
  ctx: Ctx,
  layer: TextLayer,
  t: TicketLayout,
  view: PanelView,
) {
  const { header, country } = t;
  const name = COUNTRIES[country].name.toUpperCase();
  const ty = header.y + Math.round((header.h - cap("small")) / 2);
  text(layer, name, header.x + 5, ty, "small", PAPER.light, INK);
  t.rows.forEach(({ section, rect }) =>
    paintSectionRow(ctx, layer, country, section, rect, view),
  );
}

function paintSentence(layer: TextLayer, view: PanelView) {
  const { sentence } = PANEL_LAYOUT;
  const w = measureText(view.sentence, "regular") * LOGICAL;
  const x = Math.round(sentence.x + (sentence.w - w) / 2);
  const y = sentence.y + Math.round((sentence.h - cap("regular")) / 2);
  text(
    layer,
    view.sentence,
    x,
    y,
    "regular",
    view.idle ? SENTENCE_IDLE : SENTENCE,
    INK,
  );
}

export function paintPanel(ctx: Ctx, view: PanelView) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CANVAS_PANEL_W, CANVAS_PANEL_H);
  const base = staticTrunk();
  if (base) ctx.drawImage(base, 0, 0);
  const layer: TextLayer = { ctx, scale: ART * LOGICAL };

  for (const t of PANEL_LAYOUT.tickets) {
    paintTicketText(ctx, layer, t, view);
    if (t.country === view.here) {
      paintLit(ctx, t);
      paintStamp(ctx, t);
    }
  }

  for (const { id, rect } of PANEL_LAYOUT.utilities) {
    const lit = view.hovered === id;
    const dim = id === "sound" && !view.soundEnabled;
    const down = view.pressed === id ? 1 : 0;
    const r = { ...rect, y: rect.y + down };
    paintFitting(ctx, r, lit, dim);
    const color = lit ? "#fff8e0" : dim ? PAPER.shade : PAPER.light;
    const icon = fittingIcon(id, color, view.soundEnabled);
    blit(
      ctx,
      icon,
      r.x + Math.floor((r.w - ICON) / 2),
      r.y + Math.floor((r.h - ICON) / 2),
    );
  }

  paintSentence(layer, view);
}
