/**
 * Engine-drawn pixel fonts. Art never contains text (docs/expansion-plan.md,
 * Extensibility), so every sign, label, and speech line goes through here.
 *
 * - `regular`: proportional, 7 px capitals, 5 px x-height, 2 px descenders.
 *   For speech and anything longer than a word or two.
 * - `small`: 3x5 capitals, for signs, boards, and captions.
 *
 * Glyphs are rows of `#` (ink) and `.` (paper), separated by spaces, drawn
 * from the top of the line. Section icons are written as `{skills}` etc.
 */
import type { SectionId } from "./types";

export type FontId = "regular" | "small";

interface Glyph {
  w: number;
  rows: string[];
}

interface Font {
  glyphs: Map<string, Glyph>;
  /** Rows from the top of a line to the bottom of the lowest glyph. */
  height: number;
  lineHeight: number;
  spacing: number;
  upperOnly: boolean;
}

function parse(defs: Record<string, string>): Map<string, Glyph> {
  const map = new Map<string, Glyph>();
  for (const [ch, def] of Object.entries(defs)) {
    const rows = def.split(" ");
    const w = rows[0].length;
    if (rows.some((r) => r.length !== w)) {
      throw new Error(`Ragged glyph "${ch}"`);
    }
    map.set(ch, { w, rows });
  }
  return map;
}

// prettier-ignore
const REGULAR = parse({
  A: ".###. #...# #...# ##### #...# #...# #...#",
  B: "####. #...# #...# ####. #...# #...# ####.",
  C: ".###. #...# #.... #.... #.... #...# .###.",
  D: "####. #...# #...# #...# #...# #...# ####.",
  E: "##### #.... #.... ####. #.... #.... #####",
  F: "##### #.... #.... ####. #.... #.... #....",
  G: ".###. #...# #.... #.### #...# #...# .###.",
  H: "#...# #...# #...# ##### #...# #...# #...#",
  I: "### .#. .#. .#. .#. .#. ###",
  J: "..### ...#. ...#. ...#. #..#. #..#. .##..",
  K: "#...# #..#. #.#.. ##... #.#.. #..#. #...#",
  L: "#.... #.... #.... #.... #.... #.... #####",
  M: "#...# ##.## #.#.# #.#.# #...# #...# #...#",
  N: "#...# ##..# #.#.# #..## #...# #...# #...#",
  O: ".###. #...# #...# #...# #...# #...# .###.",
  P: "####. #...# #...# ####. #.... #.... #....",
  Q: ".###. #...# #...# #...# #.#.# #..#. .##.#",
  R: "####. #...# #...# ####. #.#.. #..#. #...#",
  S: ".###. #...# #.... .###. ....# #...# .###.",
  T: "##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..",
  U: "#...# #...# #...# #...# #...# #...# .###.",
  V: "#...# #...# #...# #...# #...# .#.#. ..#..",
  W: "#...# #...# #...# #.#.# #.#.# #.#.# .#.#.",
  X: "#...# #...# .#.#. ..#.. .#.#. #...# #...#",
  Y: "#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..",
  Z: "##### ....# ...#. ..#.. .#... #.... #####",
  a: ".... .... .##. ...# .### #..# .###",
  b: "#... #... ###. #..# #..# #..# ###.",
  c: "... ... .## #.. #.. #.. .##",
  d: "...# ...# .### #..# #..# #..# .###",
  e: ".... .... .##. #..# #### #... .###",
  f: ".## #.. ### #.. #.. #.. #..",
  g: ".... .... .### #..# #..# #..# .### ...# .##.",
  h: "#... #... ###. #..# #..# #..# #..#",
  i: "# . # # # # #",
  j: ".# .. .# .# .# .# .# .# #.",
  k: "#... #... #..# #.#. ##.. #.#. #..#",
  l: "#. #. #. #. #. #. .#",
  m: "..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#",
  n: ".... .... ###. #..# #..# #..# #..#",
  o: ".... .... .##. #..# #..# #..# .##.",
  p: ".... .... ###. #..# #..# #..# ###. #... #...",
  q: ".... .... .### #..# #..# #..# .### ...# ...#",
  r: "... ... #.# ##. #.. #.. #..",
  s: ".... .... .### #... .##. ...# ###.",
  t: ".#. .#. ### .#. .#. .#. ..#",
  u: ".... .... #..# #..# #..# #..# .###",
  v: "..... ..... #...# #...# #...# .#.#. ..#..",
  w: "..... ..... #...# #...# #.#.# #.#.# .#.#.",
  x: "..... ..... #...# .#.#. ..#.. .#.#. #...#",
  y: ".... .... #..# #..# #..# #..# .### ...# .##.",
  z: ".... .... #### ...# .##. #... ####",
  "0": ".###. #...# #..## #.#.# ##..# #...# .###.",
  "1": ".#. ##. .#. .#. .#. .#. ###",
  "2": ".###. #...# ....# ...#. ..#.. .#... #####",
  "3": ".###. #...# ....# ..##. ....# #...# .###.",
  "4": "...#. ..##. .#.#. #..#. ##### ...#. ...#.",
  "5": "##### #.... ####. ....# ....# #...# .###.",
  "6": "..##. .#... #.... ####. #...# #...# .###.",
  "7": "##### ....# ...#. ..#.. .#... .#... .#...",
  "8": ".###. #...# #...# .###. #...# #...# .###.",
  "9": ".###. #...# #...# .#### ....# ...#. .##..",
  " ": "... ... ... ... ... ... ...",
  ".": ". . . . . . #",
  ",": ".. .. .. .. .. .# .# #.",
  "!": "# # # # # . #",
  "?": ".###. #...# ....# ...#. ..#.. ..... ..#..",
  "'": "# # . . . . .",
  '"': "#.# #.# ... ... ... ... ...",
  ":": ". . # . . . #",
  ";": ".. .. .# .. .. .# .# #.",
  "-": "... ... ... ### ... ... ...",
  "+": "... ... .#. ### .#. ... ...",
  "=": ".... .... #### .... #### .... ....",
  "*": "... #.# .#. #.# ... ... ...",
  "_": ".... .... .... .... .... .... ####",
  "(": ".# #. #. #. #. #. .#",
  ")": "#. .# .# .# .# .# #.",
  "[": "## #. #. #. #. #. ##",
  "]": "## .# .# .# .# .# ##",
  "<": "... ..# .#. #.. .#. ..# ...",
  ">": "... #.. .#. ..# .#. #.. ...",
  "/": "..# ..# .#. .#. .#. #.. #..",
  "&": ".##.. #..#. #.#.. .#... #.#.# #..#. .##.#",
  "@": ".###. #...# #.### #.#.# #.### #.... .###.",
  "#": ".#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.",
  "%": "##..# ##..# ...#. ..#.. .#... #..## #..##",
  "·": ". . . # . . .",
  "é": "..#. .#.. .##. #..# #### #... .###",
  "è": ".#.. ..#. .##. #..# #### #... .###",
  "à": ".#.. ..#. .##. ...# .### #..# .###",
  "ò": ".#.. ..#. .##. #..# #..# #..# .##.",
  "ù": ".#.. ..#. #..# #..# #..# #..# .###",
  "ì": "#. .# .# .# .# .# .#",
  "ü": ".... #..# .... #..# #..# #..# .###",
  "ö": ".... #..# .... .##. #..# #..# .##.",
  "ä": ".... #..# .##. ...# .### #..# .###",
  // Section icons, as on the toolbar: {experience} {skills} {about} {contact} {resume}
  "{experience}": "..###.. ..#.#.. ####### #..#..# ####### #.....# #######",
  "{skills}": "....#.# ....### ...###. ..###.. .###... ###.... .#.....",
  "{about}": "..###.. .#####. .#####. ..###.. ....... .#####. #######",
  "{contact}": "##..... ###.... .##.... ..##... ...##.. ....### .....##",
  "{resume}": "#####.. #...##. #.....# #.###.# #.....# #.###.# #######",
});

// prettier-ignore
const SMALL = parse({
  A: ".#. #.# ### #.# #.#",
  B: "##. #.# ##. #.# ##.",
  C: ".## #.. #.. #.. .##",
  D: "##. #.# #.# #.# ##.",
  E: "### #.. ##. #.. ###",
  F: "### #.. ##. #.. #..",
  G: ".## #.. #.# #.# .##",
  H: "#.# #.# ### #.# #.#",
  I: "### .#. .#. .#. ###",
  J: "..# ..# ..# #.# .#.",
  K: "#.# #.# ##. #.# #.#",
  L: "#.. #.. #.. #.. ###",
  M: "#.# ### ### #.# #.#",
  N: "##. #.# #.# #.# #.#",
  O: ".#. #.# #.# #.# .#.",
  P: "##. #.# ##. #.. #..",
  Q: ".#. #.# #.# ##. .##",
  R: "##. #.# ##. #.# #.#",
  S: ".## #.. .#. ..# ##.",
  T: "### .#. .#. .#. .#.",
  U: "#.# #.# #.# #.# ###",
  V: "#.# #.# #.# #.# .#.",
  W: "#.# #.# ### ### #.#",
  X: "#.# #.# .#. #.# #.#",
  Y: "#.# #.# .#. .#. .#.",
  Z: "### ..# .#. #.. ###",
  "0": "### #.# #.# #.# ###",
  "1": ".#. ##. .#. .#. ###",
  "2": "##. ..# .#. #.. ###",
  "3": "##. ..# .#. ..# ##.",
  "4": "#.# #.# ### ..# ..#",
  "5": "### #.. ##. ..# ##.",
  "6": ".## #.. ### #.# ###",
  "7": "### ..# .#. .#. .#.",
  "8": "### #.# ### #.# ###",
  "9": "### #.# ### ..# ##.",
  " ": "... ... ... ... ...",
  ".": ". . . . #",
  ",": ".. .. .. .# #.",
  "!": "# # # . #",
  "?": "##. ..# .#. ... .#.",
  "'": "# # . . .",
  '"': "#.# #.# ... ... ...",
  ":": ". # . # .",
  "-": "... ... ### ... ...",
  "+": "... .#. ### .#. ...",
  "/": "..# ..# .#. #.. #..",
  "&": ".#. #.# .#. #.# .##",
  "(": ".# #. #. #. .#",
  ")": "#. .# .# .# #.",
  "·": ". . # . .",
  "É": "..# ### #.. ##. ###",
  // Section icons at 5x5 for signs
  "{experience}": ".###. ##### #.#.# ##### #####",
  "{skills}": "...## ..### .###. ###.. ##...",
  "{about}": ".###. .###. ..... ##### #####",
  "{contact}": "##... ###.. .##.. ..### ...##",
  "{resume}": "####. #..## #.#.# #...# #####",
});

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

/** Pixel rows of a section icon ("#" ink), for the toolbar's buttons. */
export function iconRows(section: SectionId): string[] {
  return REGULAR.get(iconToken(section))?.rows ?? [];
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

/** Width in native px of one line of text. */
export function measureText(text: string, fontId: FontId = "regular") {
  const font = FONTS[fontId];
  const glyphs = glyphsOf(text, fontId);
  if (glyphs.length === 0) return 0;
  return glyphs.reduce((w, g) => w + g.w + font.spacing, 0) - font.spacing;
}

/** Greedy word wrap to `maxWidth` native px. Honours explicit newlines. */
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

/** Calls `plot` for every ink pixel of one line, from its top-left. */
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
    cx += g.w + font.spacing;
  }
}

interface TextStyle {
  font?: FontId;
  color: string;
  /** A 1 px hard outline, as SCUMM speech. */
  outline?: string | false;
}

const cache = new Map<string, HTMLCanvasElement>();
const CACHE_LIMIT = 256;

function renderLine(text: string, style: TextStyle): HTMLCanvasElement {
  const fontId = style.font ?? "regular";
  const key = `${fontId}|${style.color}|${style.outline || ""}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pad = style.outline ? 1 : 0;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, measureText(text, fontId) + pad * 2);
  canvas.height = FONTS[fontId].height + pad * 2;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    if (style.outline) {
      ctx.fillStyle = style.outline;
      forEachPixel(text, fontId, (x, y) => ctx.fillRect(x, y, 3, 3));
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
 * Draws one line with its top-left at `x`,`y` (the outline, if any, sits
 * one pixel outside that box).
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
  ctx.drawImage(
    renderLine(text, style),
    Math.round(x) - pad,
    Math.round(y) - pad,
  );
}
