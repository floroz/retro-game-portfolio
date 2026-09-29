/**
 * Engine-drawn text. Art never contains text (docs/expansion-plan.md,
 * Extensibility), so every sign, label, board, caption, and speech line goes
 * through here.
 *
 * Text is drawn on its own layer at display resolution (the text canvas in
 * Scene.tsx: the scene's on-screen size times `devicePixelRatio`), never
 * upscaled from the art's canvas, so it stays crisp at any window size and
 * on HiDPI screens. Layout stays in logical px (320x160), like the rest of
 * the scene data, so labels keep their places whatever the art's density.
 *
 * The typeface is Fredoka SemiBold (SIL OFL 1.1, self-hosted in
 * `public/fonts/`): rounded, friendly, and heavy, in the spirit of
 * _The Curse of Monkey Island_'s speech text.
 *
 * - `regular`: mixed case, for speech and anything longer than a word or two.
 * - `small`: capitals, for signs, boards, and captions.
 *
 * Section icons are written as `{skills}` etc. and drawn inline as crisp
 * pixel art (icons.ts).
 */
import { ICON_TOKEN, iconRows } from "./icons";
import type { SectionId } from "./types";

export type FontId = "regular" | "small";

/** The CSS family; `@font-face` is in `src/index.scss`. */
export const FONT_FAMILY = "Fredoka";
const FAMILY = `"${FONT_FAMILY}", "Trebuchet MS", "Verdana", sans-serif`;

interface FontSpec {
  /** Em size in logical px. */
  size: number;
  weight: number;
  /** Logical px from one line's top to the next's. */
  lineHeight: number;
  /** Extra logical px between characters. */
  tracking: number;
  /** Extra logical px per space, so outlined words never run together. */
  wordSpacing: number;
  /** Height of an inline section icon, in logical px. */
  icon: number;
  upperOnly: boolean;
}

const FONTS: Record<FontId, FontSpec> = {
  regular: {
    size: 9,
    weight: 600,
    lineHeight: 11,
    tracking: 0.1,
    wordSpacing: 1.4,
    icon: 6.5,
    upperOnly: false,
  },
  small: {
    size: 6.5,
    weight: 600,
    lineHeight: 7,
    tracking: 0.3,
    wordSpacing: 0.8,
    icon: 4.75,
    upperOnly: true,
  },
};

/** Fredoka's cap height, as a fraction of the em. */
const CAP_HEIGHT = 0.7;

/** Logical px between an inline icon and the text either side of it. */
const ICON_GAP = 0.25;

/**
 * Glyphs the shipped subsets cover (Latin, Latin-1, Latin Extended-A, and
 * general punctuation); anything else would fall back to a system font.
 */
const COVERED = /[\x20-\x7e\xa0-\u017f\u2000-\u206f\u20ac\u2122]/u;

/** Display resolution text is drawn at: a context and its px per logical px. */
export interface TextLayer {
  ctx: CanvasRenderingContext2D;
  /** Canvas pixels per logical px (4 for a 1280 px wide scene at 1x). */
  scale: number;
}

type Run = { icon: SectionId } | { text: string };

/** Splits text into plain runs and section icons, in the font's case. */
function runsOf(text: string, fontId: FontId): Run[] {
  const upper = FONTS[fontId].upperOnly;
  const out: Run[] = [];
  let plain = "";
  const flush = () => {
    if (plain) out.push({ text: upper ? plain.toUpperCase() : plain });
    plain = "";
  };
  for (let i = 0; i < text.length; ) {
    ICON_TOKEN.lastIndex = i;
    const icon = ICON_TOKEN.exec(text);
    if (icon) {
      flush();
      out.push({ icon: icon[1] as SectionId });
      i += icon[0].length;
      continue;
    }
    plain += text[i];
    i += 1;
  }
  flush();
  return out;
}

/** Characters in `text` the font can't draw (they'd use a fallback font). */
export function unknownChars(text: string): string[] {
  const plain = text.replace(
    /\{(experience|skills|about|contact|resume)\}/g,
    "",
  );
  return [...new Set([...plain].filter((c) => !COVERED.test(c)))];
}

export function lineHeight(fontId: FontId): number {
  return FONTS[fontId].lineHeight;
}

function cssFont(fontId: FontId, px: number): string {
  return `${FONTS[fontId].weight} ${px}px ${FAMILY}`;
}

// --- Measuring ---------------------------------------------------------------

/** Em size text is measured at, then scaled: big enough for exact widths. */
const MEASURE_PX = 100;

let measurer: CanvasRenderingContext2D | null | undefined;
const widths = new Map<string, number>();

function measuringContext(): CanvasRenderingContext2D | null {
  if (measurer !== undefined) return measurer;
  measurer = null;
  if (typeof document === "undefined") return measurer;
  try {
    measurer = document.createElement("canvas").getContext("2d");
  } catch {
    measurer = null;
  }
  // Widths measured with a fallback font go stale once Fredoka arrives.
  document.fonts?.addEventListener?.("loadingdone", () => widths.clear());
  return measurer;
}

/** Width of plain text in logical px, at the font's size and tracking. */
function runWidth(text: string, fontId: FontId): number {
  const spec = FONTS[fontId];
  const key = `${fontId}|${text}`;
  let em = widths.get(key);
  if (em === undefined) {
    const ctx = measuringContext();
    if (ctx) {
      ctx.font = cssFont(fontId, MEASURE_PX);
      em = ctx.measureText(text).width / MEASURE_PX;
    } else {
      // No canvas (unit tests): Fredoka's average advance.
      em = [...text].length * 0.56;
    }
    widths.set(key, em);
  }
  const chars = [...text];
  const spaces = chars.filter((c) => c === " ").length;
  return (
    em * spec.size +
    spec.tracking * Math.max(0, chars.length - 1) +
    spec.wordSpacing * spaces
  );
}

function iconWidth(fontId: FontId): number {
  return FONTS[fontId].icon + ICON_GAP * 2;
}

/** Width in logical px of one line of text, at `fit` times the font's size. */
export function measureText(
  text: string,
  fontId: FontId = "regular",
  fit = 1,
): number {
  const runs = runsOf(text, fontId);
  const w = runs.reduce(
    (sum, r) =>
      sum + ("icon" in r ? iconWidth(fontId) : runWidth(r.text, fontId)),
    0,
  );
  return w * fit;
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
 * How much to shrink a line so it fits `maxWidth` logical px: 1 when it
 * already fits, and never below 0.6, where signs stop being legible.
 */
export function fitScale(
  text: string,
  maxWidth: number,
  fontId: FontId = "regular",
): number {
  const w = measureText(text, fontId);
  return w <= maxWidth || w === 0 ? 1 : Math.max(0.6, maxWidth / w);
}

// --- Drawing -----------------------------------------------------------------

export interface TextStyle {
  font?: FontId;
  color: string;
  /** A dark (or light) rim around every glyph, or false for none. */
  outline?: string | false;
  /** Rim width in logical px. Defaults to the font's. */
  outlineWidth?: number;
  /** A soft drop shadow under the rim, for speech. */
  shadow?: string | false;
  /** Size relative to the font's, from `fitScale`. */
  fit?: number;
}

const DEFAULT_OUTLINE: Record<FontId, number> = { regular: 0.85, small: 0.5 };

/** Shadow offset in logical px. */
const SHADOW = { dx: 0.35, dy: 0.5 };

/**
 * Draws one line with its top-left at logical `x`,`y`: capitals run from
 * `y` down to `y + capHeight`. The outline, if any, sits just outside that
 * box. Every pass (shadow, outline, fill) covers the whole line before the
 * next starts, so no glyph's rim ever cuts into its neighbour.
 */
export function drawText(
  layer: TextLayer,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
) {
  if (!text) return;
  const { ctx, scale } = layer;
  const fontId = style.font ?? "regular";
  const spec = FONTS[fontId];
  const fit = style.fit ?? 1;
  const runs = runsOf(text, fontId);
  const px = spec.size * fit * scale;
  // Positions in canvas pixels, the baseline snapped to the pixel grid.
  const left = Math.round(x * scale);
  const baseline = Math.round((y + spec.size * CAP_HEIGHT * fit) * scale);
  const iconH = spec.icon * fit * scale;
  const cell = Math.max(1, Math.round(iconH / 14));

  const placed: { run: Run; x: number; w: number }[] = [];
  let cx = left;
  for (const run of runs) {
    const w =
      ("icon" in run ? iconWidth(fontId) : runWidth(run.text, fontId)) *
      fit *
      scale;
    placed.push({ run, x: cx, w });
    cx += w;
  }

  ctx.save();
  ctx.font = cssFont(fontId, px);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = `${spec.tracking * fit * scale}px`;
  }
  if ("wordSpacing" in ctx) {
    ctx.wordSpacing = `${spec.wordSpacing * fit * scale}px`;
  }

  /** One pass over the line: `grow` px of rim around every glyph. */
  const pass = (color: string, grow: number, dx = 0, dy = 0) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = grow * 2;
    for (const p of placed) {
      if ("icon" in p.run) {
        drawIcon(ctx, p.run.icon, p, baseline + dy, cell, grow, dx);
      } else {
        if (grow > 0) ctx.strokeText(p.run.text, p.x + dx, baseline + dy);
        ctx.fillText(p.run.text, p.x + dx, baseline + dy);
      }
    }
  };

  const rim = style.outline
    ? (style.outlineWidth ?? DEFAULT_OUTLINE[fontId]) * fit * scale
    : 0;
  if (style.shadow) {
    pass(style.shadow, rim, SHADOW.dx * scale, SHADOW.dy * scale);
  }
  if (style.outline) pass(style.outline, rim);
  pass(style.color, 0);
  ctx.restore();
}

/**
 * A section icon as crisp pixel art, in whole canvas pixels per icon
 * pixel, centred in its slot and sat on the baseline. `grow` fattens each
 * pixel for the outline.
 */
function drawIcon(
  ctx: CanvasRenderingContext2D,
  section: SectionId,
  slot: { x: number; w: number },
  baseline: number,
  cell: number,
  grow: number,
  dx: number,
) {
  const rows = iconRows(section);
  const size = 14 * cell;
  const ox = Math.round(slot.x + (slot.w - size) / 2 + dx);
  const oy = baseline - size;
  const g = Math.round(grow);
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] !== "#") continue;
      ctx.fillRect(
        ox + rx * cell - g,
        oy + ry * cell - g,
        cell + g * 2,
        cell + g * 2,
      );
    }
  });
}
