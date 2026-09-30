/**
 * The trunk's materials, drawn in code on the art grid: planked wood, brass,
 * paper, and leather, with the helpers that lay them down. The controls
 * panel (paint.ts) and the title card (dialog/titleCard.ts) share them, so
 * both read as one prop. Everything is whole art-px rects, never smoothed.
 */
import { INK, type Sprite } from "./sprites";

/** Canvas px per art px. */
export const ART = 2;

export type Ctx = CanvasRenderingContext2D;

export const WOOD = ["#2a1812", "#3a2219", "#4a2d20", "#5a3726", "#6b4330"];
export const BRASS = {
  dark: "#7a5518",
  mid: "#b8862a",
  light: "#e2b54a",
  hi: "#f7de8a",
};
export const PAPER = {
  light: "#efe3c4",
  mid: "#e2d2ac",
  shade: "#c9b58a",
  edge: "#9c855e",
};
export const LEATHER = "#2e1712";

/** A rect of art px, in one colour. */
export function fill(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  c: string,
) {
  ctx.fillStyle = c;
  ctx.fillRect(x * ART, y * ART, w * ART, h * ART);
}

/** A sprite, its top-left at art px `x`,`y`. */
export function blit(ctx: Ctx, s: Sprite, x: number, y: number) {
  for (let j = 0; j < s.h; j++) {
    for (let i = 0; i < s.w; i++) {
      const c = s.get(i, j);
      if (c) fill(ctx, x + i, y + j, 1, 1, c);
    }
  }
}

/** `a` and `b` mixed, `t` of the way to `b`; both are #rrggbb. */
export function mixHex(a: string, b: string, t: number): string {
  const channel = (c: string, i: number) =>
    parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  return (
    "#" +
    [0, 1, 2]
      .map((i) =>
        Math.round(channel(a, i) * (1 - t) + channel(b, i) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** A deterministic hash in [0, 1), so the grain is the same every time. */
export function noise(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Horizontal planks with dark seams, streaky grain, and the odd knot. The
 * seams sit at `seams` (art px from the top, first 0, last the height).
 */
export function paintWood(
  ctx: Ctx,
  w: number,
  h: number,
  seams: number[] = [0, 22, 50, h],
) {
  for (let p = 0; p < seams.length - 1; p++) {
    const top = seams[p];
    const bottom = seams[p + 1];
    fill(ctx, 0, top, w, bottom - top, WOOD[2]);
    for (let y = top + 1; y < bottom - 1; y++) {
      let x = 0;
      while (x < w) {
        const n = noise(x, y, p);
        const len = 6 + Math.floor(noise(y, x, p + 7) * 40);
        const tone = n < 0.18 ? WOOD[1] : n > 0.86 ? WOOD[3] : null;
        if (tone) fill(ctx, x, y, Math.min(len, w - x), 1, tone);
        x += len;
      }
    }
    // The lit top edge and the dark seam under each plank.
    fill(ctx, 0, top, w, 1, WOOD[3]);
    fill(ctx, 0, bottom - 1, w, 1, WOOD[0]);
    const knotX = 40 + Math.floor(noise(p, 3) * (w - 80));
    const knotY = top + Math.floor((bottom - top) / 2);
    fill(ctx, knotX - 2, knotY, 5, 1, WOOD[1]);
    fill(ctx, knotX - 1, knotY - 1, 3, 3, WOOD[0]);
  }
}

/** The trunk's top edge: an ink line, then a brass band. */
export function paintBrassStrip(ctx: Ctx, w: number) {
  fill(ctx, 0, 0, w, 1, INK);
  fill(ctx, 0, 1, w, 1, BRASS.light);
  fill(ctx, 0, 2, w, 1, BRASS.dark);
}

/** A brass rivet head, 3x3 art px with its ink rim. */
export function rivet(ctx: Ctx, x: number, y: number) {
  fill(ctx, x - 1, y - 1, 3, 3, INK);
  fill(ctx, x, y - 1, 2, 2, BRASS.mid);
  fill(ctx, x, y - 1, 1, 1, BRASS.hi);
}
