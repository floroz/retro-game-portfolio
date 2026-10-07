import { describe, expect, test } from "vitest";
import { chalkLayout } from "../chalk";
import { capHeight, measureText } from "../font";
import type { Rect } from "../types";

const CHALKBOARD_AREA: Rect = { x: 145, y: 17, w: 49, h: 49 };
const groups = [
  "Frontend",
  "Backend",
  "AI & tools",
  "Cloud & DevOps",
  "Data",
  "Testing",
  "Leadership",
];

/** The chalk rows' ink boxes in logical px: the caps, the width of the row. */
function boxes(lines: string[], area: Rect) {
  const layout = chalkLayout(lines, area);
  return layout.rows.map((row) => ({
    text: row.text,
    x: row.x,
    y: row.y,
    w: measureText(row.text, layout.font, layout.tracking),
    h: capHeight(layout.font),
  }));
}

describe("chalk text layout", () => {
  test("every group fits inside the chalk area, on its own row", () => {
    const rows = boxes(groups, CHALKBOARD_AREA);
    expect(rows.map((r) => r.text)).toEqual(groups);
    const a = CHALKBOARD_AREA;
    for (const r of rows) {
      expect(r.x, r.text).toBeGreaterThanOrEqual(a.x);
      expect(r.x + r.w, r.text).toBeLessThanOrEqual(a.x + a.w);
      expect(r.y, r.text).toBeGreaterThanOrEqual(a.y);
      expect(r.y + r.h, r.text).toBeLessThanOrEqual(a.y + a.h);
    }
    rows.slice(1).forEach((r, i) => {
      expect(r.y, r.text).toBeGreaterThan(rows[i].y + rows[i].h);
    });
  });

  test("a longer or wider menu drops rows and steps the type down, not overflowing", () => {
    const lines = [...groups, ...groups];
    const layout = chalkLayout(lines, CHALKBOARD_AREA);
    expect(layout.rows.length).toBeLessThan(lines.length);
    // The first rows are the ones kept.
    expect(layout.rows.map((r) => r.text)).toEqual(
      lines.slice(0, layout.rows.length),
    );
    for (const r of boxes(lines, CHALKBOARD_AREA)) {
      expect(r.y + r.h).toBeLessThanOrEqual(
        CHALKBOARD_AREA.y + CHALKBOARD_AREA.h,
      );
    }
    const wide = chalkLayout(["Cloud & DevOps and everything else"], {
      ...CHALKBOARD_AREA,
    });
    expect(wide.font).toBe("tiny");
  });
});
