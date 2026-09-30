/** The trunk backdrop and live sound fitting. The ticket is a separate artwork. */
import { drawText, measureText, type FontId } from "../../engine/font";
import type { Rect } from "../../engine/types";
import {
  ART,
  BRASS,
  PAPER,
  blit,
  fill,
  mixHex,
  paintWood,
  rivet,
  type Ctx,
} from "../toolbar/materials";
import { paintFitting } from "../toolbar/paint";
import { ICON, INK, fittingIcon } from "../toolbar/sprites";

const CARD_W = 640;
const CARD_H = 400;
export const CANVAS_CARD_W = CARD_W * ART;
export const CANVAS_CARD_H = CARD_H * ART;
export const PASS: Rect = { x: 40, y: 80, w: 560, h: 238 };
export const SOUND_FITTING: Rect = { x: 560, y: 340, w: 24, h: 24 };
const CREAM = "#f4ecd8";

export interface CardView {
  soundEnabled: boolean;
  soundLit: boolean;
}

export function cardPct(r: Rect) {
  return {
    left: `${(r.x / CARD_W) * 100}%`,
    top: `${(r.y / CARD_H) * 100}%`,
    width: `${(r.w / CARD_W) * 100}%`,
    height: `${(r.h / CARD_H) * 100}%`,
  };
}
/** Logical px are 2 art px. */
const LOGICAL = 2;

interface Ink {
  color: string;
  /** What the letters sit on, where it isn't paper. */
  ground?: string;
  outline?: string | false;
  shadow?: string | false;
}

/**
 * One line with its capitals' top-left at art px `x`,`y`, the font drawn
 * `mult` times its size (each font px is `mult` art px). Returns its width
 * in art px.
 */
function words(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  font: FontId,
  ink: Ink,
  mult = 1,
): number {
  const scale = ART * LOGICAL * mult;
  drawText({ ctx, scale }, s, (x * ART) / scale, (y * ART) / scale, {
    font,
    outline: false,
    shadow: false,
    // The edge tone is the letters' colour a little towards the paper's.
    edge: mixHex(ink.color, ink.ground ?? PAPER.light, 0.4),
    ...ink,
  });
  return measureText(s, font) * LOGICAL * mult;
}

const widthOf = (s: string, font: FontId, mult = 1) =>
  measureText(s, font) * LOGICAL * mult;

const BRACKET = { inset: 8, arm: 34, thick: 8 };

/** A brass corner bracket on the trunk: an L of two arms, riveted. */
function bracket(ctx: Ctx, flipX: boolean, flipY: boolean) {
  const { inset, arm, thick } = BRACKET;
  const at = (x: number, y: number, w: number, h: number): Rect => ({
    x: flipX ? CARD_W - x - w : x,
    y: flipY ? CARD_H - y - h : y,
    w,
    h,
  });
  const plate = (r: Rect) => {
    fill(ctx, r.x - 1, r.y - 1, r.w + 2, r.h + 2, INK);
    fill(ctx, r.x, r.y, r.w, r.h, BRASS.mid);
    fill(ctx, r.x, r.y, r.w, 1, BRASS.light);
    fill(ctx, r.x, r.y + r.h - 1, r.w, 1, BRASS.dark);
  };
  plate(at(inset, inset, arm, thick));
  plate(at(inset, inset, thick, arm));
  // The corner where the arms meet reads as one plate.
  const corner = at(inset, inset, thick, thick);
  fill(ctx, corner.x, corner.y, thick, thick, BRASS.mid);
  fill(ctx, corner.x, corner.y, thick, 1, BRASS.light);
  for (const [x, y] of [
    [inset + 3, inset + 3],
    [inset + arm - 6, inset + 3],
    [inset + 3, inset + arm - 6],
  ]) {
    const r = at(x, y, 2, 2);
    rivet(ctx, r.x, r.y + 1);
  }
}

/** A dithered shadow round the edges, in whole art px. */
function paintVignette(ctx: Ctx) {
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const layer = document.createElement("canvas");
  layer.width = CARD_W;
  layer.height = CARD_H;
  const lctx = layer.getContext("2d");
  if (!lctx) return;
  const img = lctx.createImageData(CARD_W, CARD_H);
  for (let y = 0; y < CARD_H; y++) {
    for (let x = 0; x < CARD_W; x++) {
      const dx = (x - CARD_W / 2) / (CARD_W / 2);
      const dy = (y - CARD_H / 2) / (CARD_H / 2);
      const d = Math.hypot(dx * 0.85, dy);
      const level = Math.max(0, Math.min(1, (d - 0.55) / 0.55));
      if (level * 16 > bayer[(y % 4) * 4 + (x % 4)]) {
        img.data.set([12, 6, 4, 255], (y * CARD_W + x) * 4);
      }
    }
  }
  lctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.6;
  ctx.drawImage(layer, 0, 0, CANVAS_CARD_W, CANVAS_CARD_H);
  ctx.restore();
}

let card: HTMLCanvasElement | null = null;

function staticCard(): HTMLCanvasElement | null {
  if (card) return card;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_CARD_W;
  canvas.height = CANVAS_CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  paintWood(ctx, CARD_W, CARD_H, [0, 96, 190, 290, CARD_H]);
  // The lid's top and bottom edges, brass.
  fill(ctx, 0, 0, CARD_W, 1, INK);
  fill(ctx, 0, 1, CARD_W, 1, BRASS.light);
  fill(ctx, 0, 2, CARD_W, 1, BRASS.dark);
  fill(ctx, 0, CARD_H - 3, CARD_W, 1, BRASS.dark);
  fill(ctx, 0, CARD_H - 2, CARD_W, 1, BRASS.light);
  fill(ctx, 0, CARD_H - 1, CARD_W, 1, INK);
  paintVignette(ctx);
  bracket(ctx, false, false);
  bracket(ctx, true, false);
  bracket(ctx, false, true);
  bracket(ctx, true, true);

  card = canvas;
  return card;
}

export function paintCard(ctx: Ctx, view: CardView) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CANVAS_CARD_W, CANVAS_CARD_H);
  const base = staticCard();
  if (base) ctx.drawImage(base, 0, 0);
  // The sound fitting, on the wood below the pass.
  const r = SOUND_FITTING;
  const dim = !view.soundEnabled;
  paintFitting(ctx, r, view.soundLit, dim);
  const color = view.soundLit ? "#fff8e0" : dim ? PAPER.shade : PAPER.light;
  blit(
    ctx,
    fittingIcon("sound", color, view.soundEnabled),
    r.x + Math.floor((r.w - ICON) / 2),
    r.y + Math.floor((r.h - ICON) / 2),
  );
  const label = view.soundEnabled ? "SOUND ON" : "SOUND OFF";
  words(
    ctx,
    label,
    r.x - 8 - widthOf(label, "tiny"),
    r.y + Math.round((r.h - 7) / 2),
    "tiny",
    { color: CREAM, outline: INK },
  );
}
