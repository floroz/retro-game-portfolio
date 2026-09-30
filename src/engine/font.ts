/**
 * Engine-drawn text. Art never contains text (docs/expansion-plan.md,
 * Extensibility), so every sign, label, board, caption, and speech line goes
 * through here.
 *
 * As in _The Curse of Monkey Island_ (docs/art-spec.md, Phase H, "Text"),
 * text is a serif bitmap font on the art's own 640x320 grid: glyphs from an
 * atlas (bitmapFont.ts) in two tones at most (the letter, and one edge tone
 * on the notches of diagonals and curves), a hard 1 px outline, and for
 * speech a 1 px drop shadow. Every pixel is a whole indexed colour; nothing
 * is smoothed. It's drawn on the text layer
 * (the 640x320 text canvas in Scene.tsx) and shown with the scene at 2x
 * nearest-neighbour, so text pixels line up with art pixels.
 *
 * Layout stays in logical px (320x160), like the rest of the scene data;
 * a logical px is 2 art px. Positions snap to whole art px when drawn.
 *
 * - `logo`: mixed case, large, for the name on the title card.
 * - `regular`: mixed case, for speech and anything longer than a word or two.
 * - `small`: capitals, for signs, boards, and captions.
 * - `tiny`: capitals, only for a label whose `maxWidth` the small size
 *   can't fit.
 *
 * Section icons are written as `{skills}` etc. and drawn inline as pixel
 * art on the same grid (icons.ts).
 */
import logoAtlas from "../assets/fonts/serif-logo.txt?raw";
import regularAtlas from "../assets/fonts/serif-regular.txt?raw";
import smallAtlas from "../assets/fonts/serif-small.txt?raw";
import tinyAtlas from "../assets/fonts/serif-tiny.txt?raw";
import {
  EDGE,
  INK,
  parseAtlas,
  type BitmapFont,
  type Glyph,
} from "./bitmapFont";
import { ICON_TOKEN, iconRows } from "./icons";
import type { SectionId } from "./types";

export type FontId = "logo" | "regular" | "small" | "tiny";

const FONTS: Record<FontId, BitmapFont> = {
  logo: parseAtlas(logoAtlas),
  regular: parseAtlas(regularAtlas),
  small: parseAtlas(smallAtlas),
  tiny: parseAtlas(tinyAtlas),
};

/** Art px per logical px. */
const ART = 2;

/** Art px an inline icon's slot is wider than the icon, either side. */
const ICON_GAP = 1;
const ICON_SIZE = 14;

/** Where text is drawn: a context and its canvas px per logical px. */
export interface TextLayer {
  ctx: CanvasRenderingContext2D;
  /** Canvas px per logical px: 2 for the 640x320 text canvas. */
  scale: number;
}

type Item = { glyph: Glyph; x: number } | { icon: SectionId; x: number };

interface Layout {
  items: Item[];
  /** Advance width in art px, without trailing tracking. */
  width: number;
}

const FALLBACK = "?";

/** An accented letter takes its base letter's pair kerning. */
const baseOf = new Map<string, string>();
function base(ch: string): string {
  let b = baseOf.get(ch);
  if (b === undefined) {
    b = ch.normalize("NFD")[0] ?? ch;
    baseOf.set(ch, b);
  }
  return b;
}

function kern(font: BitmapFont, a: string, b: string): number {
  return font.kerning.get(a + b) ?? font.kerning.get(base(a) + base(b)) ?? 0;
}

/** Places every glyph of one line, in art px from the pen's start. */
function layout(text: string, font: BitmapFont, tracking: number): Layout {
  const str = font.upper ? text.toUpperCase() : text;
  const lower = str.toLowerCase();
  const items: Item[] = [];
  let pen = 0;
  let prev: string | null = null;
  for (let i = 0; i < str.length; ) {
    ICON_TOKEN.lastIndex = i;
    const icon = ICON_TOKEN.exec(lower);
    if (icon) {
      if (prev !== null) pen += tracking;
      items.push({ icon: icon[1] as SectionId, x: pen + ICON_GAP });
      pen += ICON_SIZE + ICON_GAP * 2;
      prev = null;
      i += icon[0].length;
      continue;
    }
    const ch = String.fromCodePoint(str.codePointAt(i) ?? 63);
    i += ch.length;
    const glyph = font.glyphs.get(ch) ?? font.glyphs.get(FALLBACK);
    if (!glyph) continue;
    if (prev !== null) pen += tracking + kern(font, prev, ch);
    items.push({ glyph, x: pen });
    pen += glyph.advance + (ch === " " ? font.word : 0);
    prev = ch;
  }
  return { items, width: pen };
}

/** Characters in `text` the font can't draw (they'd show as "?"). */
export function unknownChars(text: string): string[] {
  const plain = text.replace(
    /\{(experience|skills|about|contact|resume)\}/g,
    "",
  );
  const known = FONTS.regular.glyphs;
  return [...new Set([...plain].filter((c) => !known.has(c)))];
}

/** Logical px from one line's top to the next's. */
export function lineHeight(fontId: FontId): number {
  return FONTS[fontId].line / ART;
}

/** Logical px from a line's top to its baseline: the capital height. */
export function capHeight(fontId: FontId): number {
  return FONTS[fontId].cap / ART;
}

/**
 * Width in logical px of one line of text. `tracking` overrides the font's
 * letter spacing, in art px (see `fitText`).
 */
export function measureText(
  text: string,
  fontId: FontId = "regular",
  tracking?: number,
): number {
  const font = FONTS[fontId];
  return layout(text, font, tracking ?? font.tracking).width / ART;
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

/** How a line is set to fit a width: its font and letter spacing. */
export interface TextFit {
  font: FontId;
  tracking: number;
}

/** Smaller sizes a line may drop to, from each font. */
const SMALLER: Record<FontId, FontId[]> = {
  logo: ["regular", "small", "tiny"],
  regular: ["small", "tiny"],
  small: ["tiny"],
  tiny: [],
};

/**
 * The largest setting of a line that fits `maxWidth` logical px. A bitmap
 * font can't scale, so it steps down: the font's own spacing, then letters
 * a pixel closer (a size keeps at least 1 px of tracking), then the next
 * size down, and so on. If no size fits that way, the tracking goes to 0,
 * largest size first. Past that, it returns the tightest setting, and the
 * line overhangs.
 */
export function fitText(
  text: string,
  maxWidth: number,
  fontId: FontId = "regular",
): TextFit {
  const fonts = [fontId, ...SMALLER[fontId]];
  const settings: TextFit[] = [];
  for (const font of fonts) {
    const own = FONTS[font].tracking;
    for (let t = own; t >= Math.min(own, 1) && t >= own - 1; t--) {
      settings.push({ font, tracking: t });
    }
  }
  for (const font of fonts) settings.push({ font, tracking: 0 });
  for (const setting of settings) {
    if (measureText(text, setting.font, setting.tracking) <= maxWidth) {
      return setting;
    }
  }
  return settings[settings.length - 1];
}

// --- Drawing -----------------------------------------------------------------

export interface TextStyle {
  font?: FontId;
  color: string;
  /**
   * The edge tone: the one colour between the letters and what's behind
   * them, on the pixels that soften diagonals and curves. It defaults to
   * halfway to the outline, or to the letters at half strength without one.
   */
  edge?: string;
  /** A hard 1 px rim around every glyph, or false for none. */
  outline?: string | false;
  /** A 1 px drop shadow down and right of the rim, as MI3's speech. */
  shadow?: string | false;
  /** Letter spacing in art px, from `fitText`. Defaults to the font's. */
  tracking?: number;
  /**
   * Chalk: a seed for a hand-lettered wobble. Each glyph may sit 1 art px
   * above or below the baseline, and a few of its pixels are missing. It is
   * the same every frame for the same text and seed, and hard-pixelled.
   */
  chalk?: number;
}

/** A stable pseudo-random number in [0, 1) from a seed and two integers. */
function chalkNoise(seed: number, a: number, b: number): number {
  let h = Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(a + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0xc2b2ae35) ^ Math.imul(b + 1, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 13), 0x165667b1);
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}

/** Share of a chalk line's ink pixels that are left out. */
const CHALK_BREAK = 0.08;

/** A line's bitmap and where its pen starts and its baseline sits in it. */
interface LineBitmap {
  canvas: HTMLCanvasElement;
  penX: number;
  baseline: number;
}

type Rgba = [number, number, number, number];

let colorCtx: CanvasRenderingContext2D | null | undefined;

/** Any CSS colour as RGBA bytes, through a canvas when it isn't plain hex. */
function rgba(color: string): Rgba {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(color)?.[1];
  if (hex && (hex.length === 3 || hex.length === 6 || hex.length === 8)) {
    const full =
      hex.length === 3
        ? [...hex].map((c) => c + c).join("")
        : hex.padEnd(8, "f");
    return [0, 2, 4, 6].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgba;
  }
  if (colorCtx === undefined) {
    colorCtx = document.createElement("canvas").getContext("2d");
  }
  if (!colorCtx) return [255, 255, 255, 255];
  colorCtx.clearRect(0, 0, 1, 1);
  colorCtx.fillStyle = color;
  colorCtx.fillRect(0, 0, 1, 1);
  const d = colorCtx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2], d[3]];
}

function mixRgba(a: Rgba, b: Rgba, t: number): Rgba {
  return [0, 1, 2, 3].map((i) => Math.round(a[i] * (1 - t) + b[i] * t)) as Rgba;
}

const CACHE_SIZE = 256;
const cache = new Map<string, LineBitmap | null>();

/**
 * One line as a bitmap at 1 art px per pixel: shadow, then outline, then
 * the letters, each a hard 1-bit mask. The outline is the letters grown by
 * 1 px to the four sides, as MI3's; the shadow is the outlined shape moved
 * 1 px down and right. Cached, since labels and speech redraw every frame.
 */
function lineBitmap(text: string, style: TextStyle): LineBitmap | null {
  const fontId = style.font ?? "regular";
  const font = FONTS[fontId];
  const tracking = style.tracking ?? font.tracking;
  const key = [
    fontId,
    tracking,
    style.color,
    style.edge ?? "",
    style.outline || "",
    style.shadow || "",
    style.chalk ?? "",
    text,
  ].join("|");
  if (cache.has(key)) {
    const hit = cache.get(key) ?? null;
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const { items, width } = layout(text, font, tracking);
  // Room for ink past the advance, the rim, and the shadow.
  const penX = 3;
  const baseline = 2 + Math.max(font.ascent, ICON_SIZE);
  const w = width + penX + 4;
  const h = baseline + font.descent + 3;
  // 0 nothing, INK a letter's pixel, EDGE its softening tone.
  const ink = new Uint8Array(w * h);
  const set = (x: number, y: number, tone = INK) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (ink[i] !== INK) ink[i] = tone;
  };
  const chalk = style.chalk;
  items.forEach((item, index) => {
    if ("icon" in item) {
      iconRows(item.icon).forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          if (row[rx] === "#")
            set(penX + item.x + rx, baseline - ICON_SIZE + ry);
        }
      });
      return;
    }
    const g = item.glyph;
    const ox = penX + item.x + g.left;
    // Chalk: a glyph rides 1 art px high or low now and then.
    const n = chalk === undefined ? 0.5 : chalkNoise(chalk, index, 0);
    const wobble = n < 0.1 ? -1 : n > 0.9 ? 1 : 0;
    const oy = baseline - g.top + wobble;
    for (let gy = 0; gy < g.h; gy++) {
      for (let gx = 0; gx < g.w; gx++) {
        const tone = g.bits[gy * g.w + gx];
        if (tone) set(ox + gx, oy + gy, tone);
      }
    }
  });
  if (chalk !== undefined) {
    // Broken pixels, where the chalk skipped on the slate. Only inside a
    // stroke (four or more inked neighbours), so a letter never comes apart.
    const solid = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < w && y < h && ink[y * w + x] === INK;
    const skipped: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!ink[y * w + x] || chalkNoise(chalk, x, y + 1000) >= CHALK_BREAK) {
          continue;
        }
        let around = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if ((dx || dy) && solid(x + dx, y + dy)) around++;
          }
        }
        if (around >= 4) skipped.push(y * w + x);
      }
    }
    for (const i of skipped) ink[i] = 0;
  }

  // The outlined shape: the letters, grown 1 px to the four sides.
  const body = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      body[i] =
        ink[i] ||
        (style.outline &&
          ((x > 0 && ink[i - 1]) ||
            (x < w - 1 && ink[i + 1]) ||
            (y > 0 && ink[i - w]) ||
            (y < h - 1 && ink[i + w])))
          ? 1
          : 0;
    }
  }

  let result: LineBitmap | null = null;
  const canvas =
    typeof document === "undefined" ? null : document.createElement("canvas");
  const ctx = canvas?.getContext("2d");
  if (canvas && ctx) {
    canvas.width = w;
    canvas.height = h;
    const img = ctx.createImageData(w, h);
    const px = img.data;
    const paint = (i: number, c: Rgba) => px.set(c, i * 4);
    const fill = rgba(style.color);
    const rim = style.outline ? rgba(style.outline) : null;
    const edge = style.edge
      ? rgba(style.edge)
      : rim
        ? mixRgba(fill, rim, 0.5)
        : ([fill[0], fill[1], fill[2], Math.round(fill[3] * 0.5)] as Rgba);
    const shade = style.shadow ? rgba(style.shadow) : null;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (ink[i] === INK) paint(i, fill);
        else if (ink[i] === EDGE) paint(i, edge);
        else if (body[i] && rim) paint(i, rim);
        else if (shade && x > 0 && y > 0 && body[i - w - 1]) paint(i, shade);
      }
    }
    ctx.putImageData(img, 0, 0);
    result = { canvas, penX, baseline };
  }

  cache.set(key, result);
  if (cache.size > CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return result;
}

/**
 * Draws one line with its top-left at logical `x`,`y`: capitals run from
 * `y` down to the baseline, `capHeight` below. The outline, if any, sits
 * just outside that box. Snapped to whole art px.
 */
export function drawText(
  layer: TextLayer,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
) {
  if (!text) return;
  const bmp = lineBitmap(text, style);
  if (!bmp) return;
  const font = FONTS[style.font ?? "regular"];
  const { ctx, scale } = layer;
  const art = scale / ART;
  const left = Math.round(x * ART);
  const baseline = Math.round(y * ART) + font.cap;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    bmp.canvas,
    (left - bmp.penX) * art,
    (baseline - bmp.baseline) * art,
    bmp.canvas.width * art,
    bmp.canvas.height * art,
  );
  ctx.restore();
}

/** Art px of margin round `renderLines`' text, for the rim and shadow. */
const LINES_PAD = 3;

/** Art px above the first line's capitals: room for accents and the rim. */
const linesInset = (f: BitmapFont) => f.ascent - f.cap + 1;

/** Size in art px of the canvas `renderLines` draws `lines` on. */
export function linesSize(
  lines: string[],
  font: FontId = "regular",
): { w: number; h: number } {
  const f = FONTS[font];
  const widest = Math.max(0, ...lines.map((l) => measureText(l, font) * ART));
  return {
    w: widest + LINES_PAD * 2,
    h:
      linesInset(f) +
      (Math.max(1, lines.length) - 1) * f.line +
      f.cap +
      f.descent +
      LINES_PAD,
  };
}

/**
 * Lines drawn onto a canvas of their own at 1 art px per pixel, centred,
 * for text outside the scene (the toolbar's status line). The canvas is
 * sized by `linesSize`; show it at 2x with `image-rendering: pixelated`.
 */
export function renderLines(
  canvas: HTMLCanvasElement,
  lines: string[],
  style: TextStyle,
) {
  const fontId = style.font ?? "regular";
  const font = FONTS[fontId];
  const { w, h } = linesSize(lines, fontId);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const layer = { ctx, scale: ART };
  const inset = linesInset(font);
  lines.forEach((line, i) => {
    const lw = measureText(line, fontId) * ART;
    const left = Math.floor((w - lw) / 2);
    drawText(layer, line, left / ART, (inset + i * font.line) / ART, style);
  });
}
