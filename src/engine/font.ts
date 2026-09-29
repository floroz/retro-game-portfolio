/**
 * Engine-drawn pixel fonts. Art never contains text (docs/expansion-plan.md,
 * Extensibility), so every sign, label, and speech line goes through here.
 *
 * Both fonts are drawn at canvas resolution, two pixels per logical px
 * (RENDER_SCALE), so text stays crisp over art of either density. Their
 * metrics are in logical px, the same as the 1x fonts they replace, so
 * every label wraps and fits exactly where it did:
 *
 * - `regular`: proportional, 5 px capitals, 7 px tall, 2 px descenders.
 *   For speech and anything longer than a word or two.
 * - `small`: 3x5 capitals, for signs, boards, and captions.
 *
 * The glyphs are in glyphs.ts. Section icons are written as `{skills}` etc.
 */
import { RENDER_SCALE } from "./constants";
import { REGULAR_GLYPHS, SMALL_GLYPHS } from "./glyphs";
import type { SectionId } from "./types";

export type FontId = "regular" | "small";

interface Glyph {
  /** Width in canvas pixels. */
  w: number;
  rows: string[];
}

interface Font {
  glyphs: Map<string, Glyph>;
  /** Logical px from the top of a line to the bottom of the lowest glyph. */
  height: number;
  lineHeight: number;
  /** Logical px between glyphs. */
  spacing: number;
  upperOnly: boolean;
}

/** Parses glyphs.ts's format, for a font `height` logical px tall. */
export function parseGlyphs(defs: string, height: number): Map<string, Glyph> {
  const map = new Map<string, Glyph>();
  const rowsTall = height * RENDER_SCALE;
  for (const block of defs.trim().split(/\n\s*\n/)) {
    const [header, ...lines] = block.split("\n");
    const cut = header.lastIndexOf(" ");
    const name = header.slice(0, cut);
    const w = Number(header.slice(cut + 1));
    if (!name || !Number.isInteger(w) || w % RENDER_SCALE !== 0) {
      throw new Error(`Bad glyph header "${header}"`);
    }
    if (lines.length > rowsTall || lines.some((r) => r.length > w)) {
      throw new Error(`Glyph "${name}" is bigger than ${w}x${rowsTall}`);
    }
    const rows = Array.from({ length: rowsTall }, (_, i) =>
      (lines[i] ?? "").padEnd(w, "."),
    );
    map.set(name === "space" ? " " : name, { w, rows });
  }
  return map;
}

const REGULAR = parseGlyphs(REGULAR_GLYPHS, 9);
const SMALL = parseGlyphs(SMALL_GLYPHS, 5);

const FONTS: Record<FontId, Font> = {
  regular: {
    glyphs: REGULAR,
    height: 9,
    lineHeight: 10,
    spacing: 1,
    upperOnly: false,
  },
  small: {
    glyphs: SMALL,
    height: 5,
    lineHeight: 7,
    spacing: 1,
    upperOnly: true,
  },
};

const REPLACEMENTS: Record<string, string> = {
  "’": "'",
  "‘": "'",
  "“": '"',
  "”": '"',
  "—": "-",
  "–": "-",
  "…": "...",
  "•": "·",
};

const ICON_TOKEN = /\{(experience|skills|about|contact|resume)\}/y;

/**
 * Pixel rows of a section icon ("#" ink) at canvas resolution, for the
 * toolbar's buttons.
 */
export function iconRows(section: SectionId): string[] {
  const rows = REGULAR.get(iconToken(section))?.rows ?? [];
  let end = rows.length;
  while (end > 0 && !rows[end - 1].includes("#")) end--;
  return rows.slice(0, end);
}

/** The token that draws a section's icon, e.g. `{skills}`. */
export function iconToken(section: SectionId): string {
  return `{${section}}`;
}

/** Splits text into glyphs of this font, with fallbacks for unknown chars. */
function glyphsOf(text: string, fontId: FontId): Glyph[] {
  const font = FONTS[fontId];
  const out: Glyph[] = [];
  const fallback = font.glyphs.get("?");
  for (let i = 0; i < text.length; ) {
    ICON_TOKEN.lastIndex = i;
    const icon = ICON_TOKEN.exec(text);
    if (icon) {
      const g = font.glyphs.get(icon[0]);
      if (g) out.push(g);
      i += icon[0].length;
      continue;
    }
    const raw = text[i];
    i += 1;
    const replaced = REPLACEMENTS[raw] ?? raw;
    for (const c of replaced) {
      const ch = font.upperOnly ? c.toUpperCase() : c;
      const direct = font.glyphs.get(ch);
      if (direct) {
        out.push(direct);
        continue;
      }
      const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      const g = font.glyphs.get(base) ?? fallback;
      if (g) out.push(g);
    }
  }
  return out;
}

/** Characters in `text` this font can't draw (they'd fall back to "?"). */
export function unknownChars(
  text: string,
  fontId: FontId = "regular",
): string[] {
  const font = FONTS[fontId];
  const out = new Set<string>();
  const plain = text.replace(
    /\{(experience|skills|about|contact|resume)\}/g,
    "",
  );
  for (const raw of plain) {
    for (const c of REPLACEMENTS[raw] ?? raw) {
      const ch = font.upperOnly ? c.toUpperCase() : c;
      const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!font.glyphs.has(ch) && !font.glyphs.has(base)) out.add(raw);
    }
  }
  return [...out];
}

export function lineHeight(fontId: FontId): number {
  return FONTS[fontId].lineHeight;
}

/** Width in logical px of one line of text. */
export function measureText(text: string, fontId: FontId = "regular") {
  const font = FONTS[fontId];
  const glyphs = glyphsOf(text, fontId);
  if (glyphs.length === 0) return 0;
  return (
    glyphs.reduce((w, g) => w + g.w / RENDER_SCALE + font.spacing, 0) -
    font.spacing
  );
}

/** Greedy word wrap to `maxWidth` logical px. Honours explicit newlines. */
export function wrapText(
  text: string,
  maxWidth: number,
  fontId: FontId = "regular",
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && measureText(next, fontId) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Calls `plot` for every ink pixel of one line, in canvas pixels from its
 * top-left.
 */
function forEachPixel(
  text: string,
  fontId: FontId,
  plot: (x: number, y: number) => void,
) {
  const font = FONTS[fontId];
  let cx = 0;
  for (const g of glyphsOf(text, fontId)) {
    g.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === "#") plot(cx + x, y);
    });
    cx += g.w + font.spacing * RENDER_SCALE;
  }
}

interface TextStyle {
  font?: FontId;
  color: string;
  /** A 1 logical px hard outline, rounded at the corners, as SCUMM speech. */
  outline?: string | false;
}

/**
 * Outline offsets in canvas pixels: every point within one logical px,
 * except the far corners, so the outline rounds off at the glyph's corners.
 */
const OUTLINE: readonly (readonly [number, number])[] = (() => {
  const r = RENDER_SCALE;
  const out: [number, number][] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) === r && Math.abs(dy) === r) continue;
      out.push([dx, dy]);
    }
  }
  return out;
})();

const cache = new Map<string, HTMLCanvasElement>();
const CACHE_LIMIT = 256;

function renderLine(text: string, style: TextStyle): HTMLCanvasElement {
  const fontId = style.font ?? "regular";
  const key = `${fontId}|${style.color}|${style.outline || ""}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pad = style.outline ? RENDER_SCALE : 0;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(
    1,
    measureText(text, fontId) * RENDER_SCALE + pad * 2,
  );
  canvas.height = FONTS[fontId].height * RENDER_SCALE + pad * 2;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    if (style.outline) {
      ctx.fillStyle = style.outline;
      forEachPixel(text, fontId, (x, y) => {
        for (const [dx, dy] of OUTLINE) {
          ctx.fillRect(x + pad + dx, y + pad + dy, 1, 1);
        }
      });
    }
    ctx.fillStyle = style.color;
    forEachPixel(text, fontId, (x, y) => ctx.fillRect(x + pad, y + pad, 1, 1));
  }
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, canvas);
  return canvas;
}

/**
 * Draws one line with its top-left at logical `x`,`y` (the outline, if any,
 * sits one logical px outside that box), on a context scaled to logical px.
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
) {
  if (!text) return;
  const pad = style.outline ? 1 : 0;
  const line = renderLine(text, style);
  ctx.drawImage(
    line,
    Math.round(x) - pad,
    Math.round(y) - pad,
    line.width / RENDER_SCALE,
    line.height / RENDER_SCALE,
  );
}
