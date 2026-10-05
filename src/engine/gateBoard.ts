import { letteringFont } from "./lettering";
import type { TextLayer } from "./font";
import type { Rect } from "./types";

/** Painted housing and live lettering share the timetable's warm wayfinding. */
export function drawGateBoard(layer: TextLayer, area: Rect, lines: string[]) {
  const { ctx, scale } = layer;
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const line = (text: string, baseline: number, cap: number, color: string) => {
    ctx.save();
    letteringFont(ctx, cap);
    const width = ctx.measureText(text).width;
    ctx.translate(area.x + area.w / 2, area.y + baseline);
    // Keep the cap height consistent, condensing long names within their frame.
    ctx.scale(width ? Math.min(1, (area.w - 6) / width) : 1, 1);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  line((lines[0] ?? "").toUpperCase(), 7.2, 3.4, "#251f13");
  line((lines[1] ?? "").toUpperCase(), 18.25, 5.7, "#e6dbc2");
  ctx.restore();
}
