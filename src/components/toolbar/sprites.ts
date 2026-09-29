/**
 * The controls panel's small sprites, drawn in code on the art grid: the
 * city emblems on the boarding passes and the icons on the brass fittings.
 * Every sprite gets MI3's bold ink outline, and every pixel is fully opaque
 * or fully transparent.
 */
import type { CountrySceneId } from "../../engine/types";
import type { UtilityId } from "./layout";

export const INK = "#1c120e";

/** A small sprite: a colour (or nothing) per art px. */
export class Sprite {
  readonly w: number;
  readonly h: number;
  readonly px: (string | null)[];

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Array<string | null>(w * h).fill(null);
  }

  set(x: number, y: number, color: string) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[Math.floor(y) * this.w + Math.floor(x)] = color;
  }

  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x];
  }

  rect(x: number, y: number, w: number, h: number, color: string) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) this.set(i, j, color);
    }
  }

  /** Rows of characters, each looked up in `colors`; others stay empty. */
  rows(x: number, y: number, rows: readonly string[], colors: Palette) {
    rows.forEach((row, j) => {
      [...row].forEach((c, i) => {
        const color = colors[c];
        if (color) this.set(x + i, y + j, color);
      });
    });
  }

  /** A 1 px rim round every filled pixel, to the four sides. */
  outline(color = INK): this {
    const edge: [number, number][] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (
          this.get(x - 1, y) ||
          this.get(x + 1, y) ||
          this.get(x, y - 1) ||
          this.get(x, y + 1)
        ) {
          edge.push([x, y]);
        }
      }
    }
    for (const [x, y] of edge) this.set(x, y, color);
    return this;
  }
}

type Palette = Record<string, string>;

// --- City emblems (26x26, plus a 1 px outline all round) ---------------------

export const EMBLEM = 28;

function bigBen(): Sprite {
  const s = new Sprite(EMBLEM, EMBLEM);
  const o = 1;
  const stone = "#d8b26a";
  const stoneShade = "#a27a3c";
  const slate = "#50607f";
  const slateLight = "#7486a8";
  const face = "#f4ecd8";
  const brass = "#e8b83e";
  // Spire: a slate pyramid, lit from the left, with a gilded finial.
  s.rect(o + 12, o, 2, 1, brass);
  for (let y = 1; y <= 6; y++) {
    const half = Math.ceil(y / 2);
    for (let x = 13 - half; x < 13 + half; x++) {
      s.set(o + x, o + y, x < 13 ? slateLight : slate);
    }
  }
  // Belfry, with dark openings.
  s.rect(o + 9, o + 7, 8, 2, stone);
  s.rect(o + 14, o + 7, 3, 2, stoneShade);
  for (const x of [10, 12, 13, 15]) s.set(o + x, o + 8, INK);
  // Clock stage, wider than the shaft, with its face at ten to two.
  s.rect(o + 8, o + 9, 10, 8, stone);
  s.rect(o + 15, o + 9, 3, 8, stoneShade);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const d = Math.hypot(x - 3.5, y - 3.5);
      if (d <= 3.9) s.set(o + 9 + x, o + 9 + y, d > 2.9 ? brass : face);
    }
  }
  s.set(o + 12, o + 11, INK);
  s.set(o + 12, o + 12, INK);
  s.set(o + 13, o + 12, INK);
  s.set(o + 14, o + 11, INK);
  // A long shaft, with tall lancet windows.
  s.rect(o + 9, o + 17, 8, 9, stone);
  s.rect(o + 14, o + 17, 3, 9, stoneShade);
  s.rect(o + 9, o + 17, 8, 1, stoneShade);
  for (const x of [11, 14]) s.rect(o + x, o + 19, 1, 5, INK);
  return s.outline();
}

function alps(): Sprite {
  const s = new Sprite(EMBLEM, EMBLEM);
  const o = 1;
  const rock = "#7a90b4";
  const rockShade = "#4c5f86";
  const snow = "#f6f3ea";
  const snowShade = "#c3cde2";
  const lake = "#2c4c7c";
  const glint = "#a9c8ee";
  const peak = (ax: number, ay: number, base: number, cap: number) => {
    for (let y = ay; y < base; y++) {
      const half = Math.floor((y - ay) * 0.9);
      for (let x = ax - half; x <= ax + half; x++) {
        const left = x <= ax;
        const snowy = y - ay < cap - (Math.abs(x - ax) % 3 === 1 ? 1 : 0);
        s.set(
          o + x,
          o + y,
          snowy ? (left ? snow : snowShade) : left ? rock : rockShade,
        );
      }
    }
  };
  peak(17, 7, 21, 5);
  peak(9, 2, 21, 7);
  // The lake, with the moon's glints.
  s.rect(o, o + 21, 26, 5, lake);
  s.rect(o + 5, o + 22, 5, 1, glint);
  s.rect(o + 14, o + 23, 7, 1, glint);
  s.rect(o + 8, o + 24, 3, 1, glint);
  return s.outline();
}

function lemon(): Sprite {
  const s = new Sprite(EMBLEM, EMBLEM);
  const o = 1;
  const peel = "#f2cf3a";
  const peelShade = "#c9951c";
  const shine = "#fff4b0";
  const leaf = "#74b24c";
  const leafShade = "#3f7a30";
  // A lemon lying on its side, tipped at both ends, lit from the top left.
  const cx = 12.5;
  const cy = 16;
  for (let y = 8; y < 25; y++) {
    for (let x = 0; x < 26; x++) {
      const dx = (x - cx) / 11.5;
      const dy = (y - cy) / 8;
      if (dx * dx + dy * dy > 1) continue;
      const lit = dx * 0.7 + dy < 0.35;
      s.set(o + x, o + y, lit ? peel : peelShade);
    }
  }
  // The pointed ends.
  s.set(o, o + 16, peelShade);
  s.set(o + 25, o + 15, peelShade);
  s.rect(o + 6, o + 11, 4, 1, shine);
  s.rect(o + 5, o + 12, 2, 1, shine);
  // Two leaves on a stem.
  s.rows(
    o + 11,
    o,
    [
      "......LLL.",
      "....LLlll.",
      "..LLlll...",
      ".Llll..ll.",
      "LLl...llll",
      "l....lllll",
      ".....llll.",
      "..........",
    ],
    { L: leaf, l: leafShade },
  );
  return s.outline();
}

const EMBLEMS: Record<CountrySceneId, () => Sprite> = {
  london: bigBen,
  zurich: alps,
  sorrento: lemon,
};

const emblemCache = new Map<CountrySceneId, Sprite>();

export function emblem(country: CountrySceneId): Sprite {
  let s = emblemCache.get(country);
  if (!s) {
    s = EMBLEMS[country]();
    emblemCache.set(country, s);
  }
  return s;
}

// --- Fitting icons (14x14) ---------------------------------------------------

export const ICON = 14;

const ICONS: Record<UtilityId | "soundOff", readonly string[]> = {
  talk: [
    "..wwwwwwwwww..",
    ".wwwwwwwwwwww.",
    "wwwwwwwwwwwwww",
    "wwwwwwwwwwwwww",
    "wwkkwwkkwwkkww",
    "wwkkwwkkwwkkww",
    "wwwwwwwwwwwwww",
    "wwwwwwwwwwwwww",
    ".wwwwwwwwwwww.",
    "..wwwwwwwwww..",
    "...wwww.......",
    "...www........",
    "..ww..........",
    ".w............",
  ],
  sound: [
    "..............",
    "......w.......",
    ".....ww...w...",
    "....www....w..",
    "wwwwwww..w..w.",
    "wwwwwww...w.w.",
    "wwwwwww...w..w",
    "wwwwwww...w..w",
    "wwwwwww...w.w.",
    "wwwwwww..w..w.",
    "....www....w..",
    ".....ww...w...",
    "......w.......",
    "..............",
  ],
  soundOff: [
    "..............",
    "......w.......",
    ".....ww.......",
    "....www.......",
    "wwwwwww.ww..ww",
    "wwwwwww..wwww.",
    "wwwwwww...ww..",
    "wwwwwww..wwww.",
    "wwwwwww.ww..ww",
    "wwwwwww.......",
    "....www.......",
    ".....ww.......",
    "......w.......",
    "..............",
  ],
  github: [
    "..w........w..",
    "..ww......ww..",
    "..wwwwwwwwww..",
    ".wwwwwwwwwwww.",
    ".wwwwwwwwwwww.",
    ".www..ww..www.",
    ".www..ww..www.",
    ".wwwwwwwwwwww.",
    "..wwwwwwwwww..",
    "...wwwwwwww...",
    "w...wwwwww....",
    ".w..wwwwww....",
    "..wwwwwwww....",
    "....wwwwww....",
  ],
  linkedin: [
    ".wwwwwwwwwwww.",
    "wwwwwwwwwwwwww",
    "wwkkwwwwwwwwww",
    "wwkkwwwwwwwwww",
    "wwwwwwwwwwwwww",
    "wwkkwwkkkkkwww",
    "wwkkwwkkkkkkww",
    "wwkkwwkkwwkkww",
    "wwkkwwkkwwkkww",
    "wwkkwwkkwwkkww",
    "wwkkwwkkwwkkww",
    "wwkkwwkkwwkkww",
    "wwwwwwwwwwwwww",
    ".wwwwwwwwwwww.",
  ],
};

/** A fitting's icon in `color`, with the ink showing through its cut-outs. */
export function fittingIcon(
  id: UtilityId,
  color: string,
  soundEnabled: boolean,
): Sprite {
  const s = new Sprite(ICON, ICON);
  const key = id === "sound" && !soundEnabled ? "soundOff" : id;
  s.rows(0, 0, ICONS[key], { w: color, k: INK });
  return s;
}
