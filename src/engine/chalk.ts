/**
 * Chalk lettering on a slate: a scene label whose lines come from config
 * (the London chalkboard lists the skill groups from `profile.ts`) and are
 * set to fit a writable rectangle, so the board never needs repainting when
 * the content changes. The text is part of the wall: it sorts with the
 * background, and Daniele stands in front of it (render.ts masks it where
 * he is drawn over it).
 *
 * The lettering uses the clean world bitmap face in chalk white. Chalk
 * texture belongs to the slate: letter strokes and baselines stay intact.
 */
import {
  capHeight,
  drawText,
  fitText,
  lineHeight,
  measureText,
  type FontId,
  type TextLayer,
} from "./font";
import { resolveLabel } from "./labels";
import type { Rect, SceneLabel } from "./types";

/** Chalk white, slightly warm, as on the slate's dark blue-grey. */
const CHALK_COLOR = "#e6e2d4";

/** The tallest a row's pitch may be, in line heights (rows never crowd). */
const MAX_PITCH = 1.5;

/** One row of chalk: its text and where its top-left sits, in logical px. */
interface ChalkRow {
  text: string;
  x: number;
  y: number;
}

export interface ChalkLayout {
  font: FontId;
  /** Letter spacing in art px. */
  tracking: number;
  rows: ChalkRow[];
}

/**
 * Sets `lines` inside `area`, centred. Every row is set alike: the largest
 * font that fits the widest row (font.ts, `fitText`), then rows spread down
 * the area. If the rows don't fit the height, the later ones are dropped
 * rather than shrinking the type.
 */
export function chalkLayout(lines: string[], area: Rect): ChalkLayout {
  const widest = lines.reduce(
    (a, l) => (measureText(l, "small") > measureText(a, "small") ? l : a),
    "",
  );
  const { font, tracking } = fitText(widest, area.w, "small");
  const line = lineHeight(font);
  const cap = capHeight(font);

  // Whole art px from here on, so rows land on the pixel grid.
  const capA = cap * 2;
  const heightA = area.h * 2;
  const fitting = Math.max(1, Math.floor((heightA - capA) / (line * 2)) + 1);
  const shown = lines.slice(0, fitting);
  const gaps = shown.length - 1;
  const pitch =
    gaps > 0
      ? Math.min(
          Math.round(line * 2 * MAX_PITCH),
          Math.floor((heightA - capA) / gaps),
        )
      : 0;
  const top = area.y * 2 + Math.floor((heightA - (gaps * pitch + capA)) / 2);

  return {
    font,
    tracking,
    rows: shown.map((text, i) => ({
      text,
      x: area.x + (area.w - measureText(text, font, tracking)) / 2,
      y: (top + i * pitch) / 2,
    })),
  };
}

/** Draws a label that has `chalk` set. */
export function drawChalk(layer: TextLayer, label: SceneLabel) {
  const { chalk } = label;
  if (!chalk) return;
  const { font, tracking, rows } = chalkLayout(
    resolveLabel(label.source),
    chalk.area,
  );
  rows.forEach((row) => {
    drawText(layer, row.text, row.x, row.y, {
      font,
      tracking,
      color: label.color ?? CHALK_COLOR,
    });
  });
}
