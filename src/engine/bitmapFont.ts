/**
 * The bitmap glyph atlases world text is drawn from. Each size is a text file
 * in `src/assets/fonts/`,
 * rasterized 1-bit from Libre Caslon Text (SIL OFL 1.1) by
 * `scripts/fonts/rasterize.py` and hand-tuned there: a header of metrics,
 * then one block per glyph (`glyph <code point> <advance> <left> <top>`
 * and its rows: `#` for ink, `+` for the edge tone, a colour between the
 * letter and its rim that softens diagonals and curves), then pair kerning
 * (`kern <a> <b> <px>`). Every number is in art px, on the 640x320 grid.
 */

export interface Glyph {
  /** Pen advance in art px, before tracking. */
  advance: number;
  /** Art px from the pen position to the first column of ink. */
  left: number;
  /** Rows of ink above the baseline. */
  top: number;
  w: number;
  h: number;
  /** `w * h` cells, row by row: 1 for ink, 2 for the edge tone. */
  bits: Uint8Array;
}

export interface BitmapFont {
  id: string;
  /** Capital height, x-height, and the ink's reach above and below the baseline. */
  cap: number;
  xHeight: number;
  ascent: number;
  descent: number;
  /** Art px from one line's top to the next's. */
  line: number;
  /** Extra art px between letters, and extra per space. */
  tracking: number;
  word: number;
  /** Capitals only (signs). */
  upper: boolean;
  glyphs: ReadonlyMap<string, Glyph>;
  /** Pair kerning in art px, keyed by the two characters. */
  kerning: ReadonlyMap<string, number>;
}

/** Cell values in a glyph's `bits`. */
export const INK = 1;
export const EDGE = 2;

const code = (hex: string) => String.fromCodePoint(parseInt(hex, 16));

/** Parses an atlas file. Throws on a malformed one, so a bad edit fails fast. */
export function parseAtlas(text: string): BitmapFont {
  const header = new Map<string, string>();
  const glyphs = new Map<string, Glyph>();
  const kerning = new Map<string, number>();
  let open: { char: string; head: number[]; rows: string[] } | null = null;

  const close = () => {
    if (!open) return;
    const [advance, left, top] = open.head;
    const h = open.rows.length;
    const w = h ? open.rows[0].length : 0;
    const bits = new Uint8Array(w * h);
    open.rows.forEach((row, y) => {
      if (row.length !== w) {
        throw new Error(`glyph ${open?.char}: ragged row ${y}`);
      }
      for (let x = 0; x < w; x++) {
        bits[y * w + x] = row[x] === "#" ? INK : row[x] === "+" ? EDGE : 0;
      }
    });
    glyphs.set(open.char, { advance, left, top, w, h, bits });
    open = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("//")) continue;
    if (!line) {
      close();
      continue;
    }
    if (open && /^[#+.]+$/.test(line)) {
      open.rows.push(line);
      continue;
    }
    const [key, ...rest] = line.split(" ");
    if (key === "glyph") {
      close();
      open = {
        char: code(rest[0]),
        head: rest.slice(1, 4).map(Number),
        rows: [],
      };
    } else if (key === "kern") {
      kerning.set(code(rest[0]) + code(rest[1]), Number(rest[2]));
    } else {
      header.set(key, rest.join(" "));
    }
  }
  close();

  const num = (key: string) => {
    const v = Number(header.get(key));
    if (!Number.isFinite(v)) throw new Error(`atlas: missing "${key}"`);
    return v;
  };
  return {
    id: header.get("font") ?? "font",
    cap: num("cap"),
    xHeight: num("xheight"),
    ascent: num("ascent"),
    descent: num("descent"),
    line: num("line"),
    tracking: num("tracking"),
    word: num("word"),
    upper: num("upper") === 1,
    glyphs,
    kerning,
  };
}
