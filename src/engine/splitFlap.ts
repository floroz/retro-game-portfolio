import type { FlightRow, SplitFlapBoard } from "./types";

const CITY_CELLS = 9;
const GATE_CELLS = 2;
const CELLS = CITY_CELLS + GATE_CELLS + 5;
const LETTERS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:";
const DIGITS = "0123456789";

const characters = (row: FlightRow) =>
  row.city.padEnd(CITY_CELLS, " ") + row.gate + row.time;

export interface FlapCell {
  from: string;
  to: string;
  /** -1 means settled; otherwise a complete hinge turn from 0 to 1. */
  progress: number;
}

/** Pure timeline: no DOM, random state, timers, or replay of previous cycles. */
export function splitFlapCells(
  board: SplitFlapBoard,
  now: number,
  reducedMotion = false,
): FlapCell[][] {
  const cycle = reducedMotion
    ? 0
    : Math.floor(Math.max(0, now) / board.everyMs);
  const elapsed = Math.max(0, now) % board.everyMs;
  const active =
    cycle > 0 ? board.updateOrder[(cycle - 1) % board.updateOrder.length] : -1;
  return board.panels
    .flatMap((panel) => panel.rows)
    .map((row, index) => {
      const position = board.updateOrder.indexOf(index);
      const previous =
        cycle > 0 && position >= 0
          ? Math.max(
              0,
              Math.ceil((cycle - 1 - position) / board.updateOrder.length),
            )
          : 0;
      const before = characters(previous % 2 ? row.alternate : row.initial);
      const after = characters(previous % 2 ? row.initial : row.alternate);
      return [...before].map((from, column) => {
        const to = after[column];
        if (index !== active || from === to)
          return { from, to: from, progress: -1 };
        const local = elapsed - column * board.staggerMs;
        if (local < 0) return { from, to: from, progress: -1 };
        const turns = 2 + (column % 2);
        const step = Math.floor(local / board.foldMs);
        if (step >= turns) return { from: to, to, progress: -1 };
        const alphabet =
          column >= CITY_CELLS && column !== 13 ? DIGITS : LETTERS;
        const intermediate = (turn: number) => {
          if (turn === 0) return from;
          if (turn === turns) return to;
          const origin = Math.max(0, alphabet.indexOf(from));
          return alphabet[(origin + turn) % alphabet.length];
        };
        return {
          from: intermediate(step),
          to: intermediate(step + 1),
          progress: (local % board.foldMs) / board.foldMs,
        };
      });
    });
}

type Ctx = CanvasRenderingContext2D;
const glyphCache = new Map<string, HTMLCanvasElement>();
const RASTER = 16;

function glyph(char: string, w: number, h: number) {
  const key = `${char}:${w}:${h}`;
  const cached = glyphCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * RASTER);
  canvas.height = Math.ceil(h * RASTER);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(RASTER, RASTER);
  const upper = ctx.createLinearGradient(0, 0, 0, h / 2);
  upper.addColorStop(0, "#20262a");
  upper.addColorStop(1, "#151a1e");
  ctx.fillStyle = upper;
  ctx.fillRect(0, 0, w, h / 2);
  const lower = ctx.createLinearGradient(0, h / 2, 0, h);
  lower.addColorStop(0, "#1b2024");
  lower.addColorStop(1, "#13181b");
  ctx.fillStyle = lower;
  ctx.fillRect(0, h / 2, w, h / 2);
  ctx.fillStyle = "#e3d9c1";
  ctx.font = `500 ${h * 0.76}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, w / 2, h * 0.535, w * 0.85);
  glyphCache.set(key, canvas);
  return canvas;
}

function half(
  ctx: Ctx,
  tile: HTMLCanvasElement,
  bottom: boolean,
  x: number,
  y: number,
  w: number,
  h: number,
  fold = 1,
) {
  const sh = tile.height / 2;
  const dh = (h / 2) * fold;
  if (dh < 0.001) return;
  const dy = bottom ? y + h / 2 : y + h / 2 - dh;
  ctx.drawImage(tile, 0, bottom ? sh : 0, tile.width, sh, x, dy, w, dh);
  if (fold < 1) {
    ctx.fillStyle = `rgba(0,0,0,${(1 - fold) * 0.38})`;
    ctx.fillRect(x, dy, w, dh);
  }
}

/** Actual glyph halves turn around each tile's hinge; unchanged cells never flip. */
export function drawSplitFlapBoard(
  ctx: Ctx,
  board: SplitFlapBoard,
  now: number,
  reducedMotion = false,
) {
  const rows = splitFlapCells(board, now, reducedMotion);
  ctx.save();
  let index = 0;
  for (const panel of board.panels) {
    const { x, y, w, h } = panel.area;
    const margin = 0.4;
    const gap = 0.9;
    const cw = (w - margin * 2 - gap * 2) / CELLS;
    const rowH = h / panel.rows.length;
    const tileH = rowH - 0.25;
    ctx.fillStyle = "#dfd5bf";
    ctx.font = "500 1.45px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(panel.originLabel, x + margin, y - 0.85);
    ctx.fillText("GATE", x + margin + CITY_CELLS * cw + gap, y - 0.85);
    ctx.fillText(
      "TIME",
      x + margin + (CITY_CELLS + GATE_CELLS) * cw + gap * 2,
      y - 0.85,
    );
    for (let ri = 0; ri < panel.rows.length; ri++) {
      const rowY = y + ri * rowH;
      ctx.fillStyle = "#080d10";
      ctx.fillRect(x, rowY, w, rowH);
      rows[index++].forEach((cell, column) => {
        const tileX =
          x +
          margin +
          column * cw +
          (column >= CITY_CELLS ? gap : 0) +
          (column >= CITY_CELLS + GATE_CELLS ? gap : 0);
        const tileY = rowY + 0.1;
        const tileW = cw - 0.1;
        const before = glyph(cell.from, tileW, tileH);
        const after = glyph(cell.to, tileW, tileH);
        if (cell.progress < 0)
          ctx.drawImage(before, tileX, tileY, tileW, tileH);
        else {
          half(ctx, after, false, tileX, tileY, tileW, tileH);
          half(ctx, before, true, tileX, tileY, tileW, tileH);
          if (cell.progress < 0.5)
            half(
              ctx,
              before,
              false,
              tileX,
              tileY,
              tileW,
              tileH,
              Math.cos(cell.progress * Math.PI),
            );
          else
            half(
              ctx,
              after,
              true,
              tileX,
              tileY,
              tileW,
              tileH,
              -Math.cos(cell.progress * Math.PI),
            );
        }
        ctx.fillStyle = "#030608";
        ctx.fillRect(tileX, tileY + tileH / 2 - 0.04, tileW, 0.08);
        ctx.fillStyle = "#3e4241";
        ctx.fillRect(tileX, tileY + tileH / 2 - 0.07, 0.07, 0.14);
        ctx.fillRect(
          tileX + tileW - 0.07,
          tileY + tileH / 2 - 0.07,
          0.07,
          0.14,
        );
      });
    }
  }
  ctx.restore();
}
