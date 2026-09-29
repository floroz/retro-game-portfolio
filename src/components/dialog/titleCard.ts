/**
 * The title card, painted in code on the same 2x art grid as the scenes and
 * the trunk: 640x400 art px on a 1280x800 canvas, the size of the game
 * window's content. It's the lid of the travel trunk (planked wood, brass
 * corners) with a boarding pass laid on it: the site is an airport-framed
 * journey, and the trunk's controls are already boarding passes.
 *
 * - The pass's body carries the name and title in the engine's serif at
 *   3x, with the itinerary underneath.
 * - Its perforated stub is the prompt: a space bar that presses itself.
 *
 * Text goes through the engine's font (engine/font.ts), like every sign and
 * line in the scene. Static art is painted once and cached; the live layer
 * (the prompt's light and press, the sound fitting) is painted over it.
 */
import { drawText, measureText, type FontId } from "../../engine/font";
import type { Rect } from "../../engine/types";
import {
  ART,
  BRASS,
  PAPER,
  WOOD,
  blit,
  fill,
  noise,
  paintWood,
  rivet,
  type Ctx,
} from "../toolbar/materials";
import { PLANE, paintFitting } from "../toolbar/paint";
import { ICON, INK, Sprite, fittingIcon } from "../toolbar/sprites";

const CARD_W = 640;
const CARD_H = 400;
export const CANVAS_CARD_W = CARD_W * ART;
export const CANVAS_CARD_H = CARD_H * ART;

/** The boarding pass, and where its stub tears off. */
export const PASS: Rect = { x: 56, y: 84, w: 528, h: 224 };
const STUB_W = 136;
const PERF_X = PASS.x + PASS.w - STUB_W;
/** Half-round notches at the perforation, top and bottom. */
const NOTCH = 6;

/** The brass fitting that toggles the sound. */
export const SOUND_FITTING: Rect = { x: 560, y: 340, w: 24, h: 24 };

/** What the live layer shows. */
export interface CardView {
  /** The pointer or keyboard is on the pass. */
  lit: boolean;
  /** The space bar is down: it alternates, so the prompt seems alive. */
  pressed: boolean;
  soundEnabled: boolean;
  soundLit: boolean;
}

const INK_TEXT = "#2a1812";
const NAVY = "#21283c";
const PLUM = "#5f3163";
const GREY = "#7d6a4c";
const CREAM = "#f4ecd8";

/** A rect as percentages of the card, for the HTML controls over it. */
export function cardPct(r: Rect) {
  return {
    left: `${(r.x / CARD_W) * 100}%`,
    top: `${(r.y / CARD_H) * 100}%`,
    width: `${(r.w / CARD_W) * 100}%`,
    height: `${(r.h / CARD_H) * 100}%`,
  };
}

// --- Text -------------------------------------------------------------------------

/** Logical px are 2 art px. */
const LOGICAL = 2;

interface Ink {
  color: string;
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
    ...ink,
  });
  return measureText(s, font) * LOGICAL * mult;
}

const widthOf = (s: string, font: FontId, mult = 1) =>
  measureText(s, font) * LOGICAL * mult;

// --- Static art --------------------------------------------------------------------

/** Whether art px `x`,`y` is boarding-pass paper: clipped and notched. */
function onPass(x: number, y: number): boolean {
  const px = x - PASS.x;
  const py = y - PASS.y;
  if (px < 0 || py < 0 || px >= PASS.w || py >= PASS.h) return false;
  const corner = (a: number, b: number) => a + b < 3;
  if (
    corner(px, py) ||
    corner(PASS.w - 1 - px, py) ||
    corner(px, PASS.h - 1 - py) ||
    corner(PASS.w - 1 - px, PASS.h - 1 - py)
  ) {
    return false;
  }
  const nx = x - PERF_X;
  for (const ny of [py, PASS.h - 1 - py]) {
    if (nx * nx + ny * ny <= NOTCH * NOTCH) return false;
  }
  return true;
}

const isRim = (x: number, y: number) =>
  !onPass(x, y) &&
  (onPass(x - 1, y) ||
    onPass(x + 1, y) ||
    onPass(x, y - 1) ||
    onPass(x, y + 1));

const SHADOW = 3;

/** The pass: shadow, ink rim, and paper, laid in runs so it costs rows. */
function paintPass(ctx: Ctx) {
  const classes = ["", WOOD[0], INK, PAPER.light, PAPER.mid];
  for (let y = PASS.y - 1; y <= PASS.y + PASS.h + SHADOW; y++) {
    let run = 0;
    let start = 0;
    const flush = (end: number) => {
      const c = classes[run];
      if (c) fill(ctx, start, y, end - start, 1, c);
    };
    for (let x = PASS.x - 1; x <= PASS.x + PASS.w + SHADOW + 1; x++) {
      let cls = 0;
      if (onPass(x, y)) cls = x >= PERF_X ? 4 : 3;
      else if (isRim(x, y)) cls = 2;
      else if (
        onPass(x - SHADOW, y - SHADOW) ||
        isRim(x - SHADOW, y - SHADOW)
      ) {
        cls = 1;
      }
      if (cls !== run) {
        flush(x);
        run = cls;
        start = x;
      }
    }
  }
  // Flecks of age in the paper.
  for (let y = PASS.y; y < PASS.y + PASS.h; y++) {
    for (let x = PASS.x; x < PASS.x + PASS.w; x++) {
      if (onPass(x, y) && noise(x, y, 11) < 0.05) {
        fill(ctx, x, y, 1, 1, PAPER.shade);
      }
    }
  }
  // The perforation.
  for (let y = PASS.y + NOTCH + 3; y < PASS.y + PASS.h - NOTCH - 3; y += 3) {
    fill(ctx, PERF_X, y, 1, 2, PAPER.edge);
  }
}

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

/** The little aeroplane in the pass's header, in brass. */
function planeSprite(): Sprite {
  const s = new Sprite(11, 9);
  s.rows(0, 0, PLANE, { "#": BRASS.hi });
  return s;
}

function paintBody(ctx: Ctx) {
  const left = PASS.x + 18;
  const right = PERF_X - 18;
  const capSmall = 8;

  // The header band: the airline and the kind of pass.
  const band = { x: PASS.x + 2, y: PASS.y + 2, w: PERF_X - PASS.x - 2, h: 26 };
  fill(ctx, band.x, band.y, band.w, band.h, NAVY);
  fill(ctx, band.x, band.y + band.h, band.w, 1, BRASS.mid);
  fill(ctx, band.x, band.y + band.h + 1, band.w, 1, INK);
  const plane = planeSprite();
  blit(ctx, plane, left - 2, band.y + Math.round((band.h - plane.h) / 2));
  const bandTextY = band.y + Math.round((band.h - capSmall) / 2);
  words(ctx, "TORTORA AIRWAYS", left + 16, bandTextY, "small", {
    color: BRASS.hi,
  });
  const kind = "BOARDING PASS";
  words(ctx, kind, right - widthOf(kind, "small"), bandTextY, "small", {
    color: CREAM,
  });

  // The name, big, like a logo, and the title under it.
  const name = "Daniele Tortora";
  const mult = widthOf(name, "regular", 3) <= right - left ? 3 : 2;
  const nameY = PASS.y + 50;
  words(
    ctx,
    name,
    left,
    nameY,
    "regular",
    { color: INK_TEXT, shadow: PAPER.shade },
    mult,
  );
  words(ctx, "Senior Software Engineer", left + 2, PASS.y + 100, "regular", {
    color: PLUM,
  });

  // A dashed rule, then the itinerary.
  const ruleY = PASS.y + 132;
  for (let x = left; x < right; x += 4) fill(ctx, x, ruleY, 2, 1, PAPER.shade);
  const fields: [string, string, number, number][] = [
    ["PASSENGER", "YOU (PROBABLY)", left, 0],
    ["FROM", "THE HALL", left + 148, 0],
    ["SEAT", "1A", left + 262, 0],
    ["TO", "LONDON \u00B7 ZURICH \u00B7 SORRENTO", left, 1],
  ];
  for (const [label, value, x, row] of fields) {
    const y = ruleY + 12 + row * 34;
    words(ctx, label, x, y, "tiny", { color: GREY });
    words(ctx, value, x, y + 14, "small", { color: NAVY });
  }
}

/** The stub's barcode: bars from the same grain as the wood. */
function paintBarcode(ctx: Ctx) {
  const x0 = PERF_X + 18;
  const w = STUB_W - 36;
  const y = PASS.y + 172;
  for (let x = x0; x < x0 + w; ) {
    const bar = 1 + Math.floor(noise(x, 3, 5) * 3);
    if (noise(x, 9, 5) > 0.3) {
      fill(ctx, x, y, Math.min(bar, x0 + w - x), 22, INK_TEXT);
    }
    x += bar + 1 + Math.floor(noise(x, 6, 5) * 2);
  }
  const code = "TT 001";
  words(
    ctx,
    code,
    Math.round(PERF_X + STUB_W / 2 - widthOf(code, "tiny") / 2),
    y + 27,
    "tiny",
    { color: GREY },
  );
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

  paintPass(ctx);
  paintBody(ctx);
  paintBarcode(ctx);
  card = canvas;
  return card;
}

// --- The live layer ------------------------------------------------------------------

const KEY = { w: 104, h: 26 };

/** The space bar on the stub: cream, ink-rimmed, and it sinks when pressed. */
function paintKey(ctx: Ctx, pressed: boolean) {
  const x = PERF_X + Math.floor((STUB_W - KEY.w) / 2);
  const y = PASS.y + 78 + (pressed ? 3 : 0);
  const depth = pressed ? 1 : 4;
  fill(ctx, x - 1, y - 1, KEY.w + 2, KEY.h + depth + 2, INK);
  fill(ctx, x, y + KEY.h - 2, KEY.w, depth + 2, GREY);
  fill(ctx, x, y, KEY.w, KEY.h - 1, CREAM);
  fill(ctx, x, y, KEY.w, 1, "#ffffff");
  fill(ctx, x, y + KEY.h - 3, KEY.w, 2, PAPER.shade);
  const label = "SPACE";
  words(
    ctx,
    label,
    x + Math.round((KEY.w - widthOf(label, "small")) / 2),
    y + Math.round((KEY.h - 3 - 8) / 2),
    "small",
    { color: INK_TEXT },
  );
}

let litRim: HTMLCanvasElement | null = null;

/** A gold rim just outside the pass's ink: lit, like a selected verb. */
function litLayer(): HTMLCanvasElement | null {
  if (litRim) return litRim;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_CARD_W;
  canvas.height = CANVAS_CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const near = (x: number, y: number, r: number) => {
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) if (onPass(x + i, y + j)) return true;
    }
    return false;
  };
  for (let y = PASS.y - 3; y <= PASS.y + PASS.h + 2; y++) {
    for (let x = PASS.x - 3; x <= PASS.x + PASS.w + 2; x++) {
      if (!onPass(x, y) && !near(x, y, 1) && near(x, y, 2)) {
        fill(ctx, x, y, 1, 1, BRASS.hi);
      }
    }
  }
  litRim = canvas;
  return litRim;
}

export function paintCard(ctx: Ctx, view: CardView) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CANVAS_CARD_W, CANVAS_CARD_H);
  const base = staticCard();
  if (base) ctx.drawImage(base, 0, 0);
  const lit = view.lit ? litLayer() : null;
  if (lit) ctx.drawImage(lit, 0, 0);

  // The prompt, on the stub.
  const cx = PERF_X + STUB_W / 2;
  const put = (s: string, y: number, font: FontId, color: string) =>
    words(ctx, s, Math.round(cx - widthOf(s, font) / 2), y, font, { color });
  put("ADMIT ONE", PASS.y + 20, "tiny", GREY);
  put("PRESS", PASS.y + 58, "small", view.lit ? PLUM : NAVY);
  paintKey(ctx, view.pressed);
  put("to start", PASS.y + 122, "regular", view.lit ? PLUM : INK_TEXT);

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
