import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import sharp from "sharp";
import { PROFILE } from "../../config/profile";
import { CHALKBOARD_AREA, CHALKBOARD_SLATE } from "../../config/scenes/london";
import { chalkLayout } from "../chalk";
import { capHeight, measureText, unknownChars } from "../font";
import { heightAt } from "../geometry";
import { resolveLabel } from "../labels";
import { SCENES } from "../scenes";
import type { Rect, SceneLabel } from "../types";

const london = SCENES.london;
const label = london.labels?.find((l) => l.id === "board-chalk") as SceneLabel;
const groups = Object.keys(PROFILE.skills) as (keyof typeof PROFILE.skills)[];

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

describe("the London chalkboard", () => {
  test("lists the skill groups from profile.ts, in the taps' order", () => {
    expect(label.source).toBe("skills:groups");
    expect(resolveLabel(label.source)).toEqual(
      groups.map((g) => PROFILE.skillGroupLabels[g]),
    );
    expect(resolveLabel(label.source)).toHaveLength(7);
  });

  test("every group can be drawn in the world font", () => {
    for (const line of resolveLabel(label.source)) {
      expect(unknownChars(line), line).toEqual([]);
    }
  });

  test("is part of the wall: no baseline, so Daniele is drawn over it", () => {
    expect(label.baselineY).toBeUndefined();
    expect(label.chalk?.area).toEqual(CHALKBOARD_AREA);
  });

  test("the slate rectangle matches the painted board", async () => {
    const png = readFileSync("src/assets/scenes/london/bg.png");
    const { data, info } = await sharp(png)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Slate: dark and blue-grey, unlike the wood frame around it.
    const isSlate = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      return r < 50 && g < 55 && b < 70 && b - r >= 8;
    };
    // The rows and columns that are mostly slate, around the board.
    const near = { x0: 270, x1: 410, y0: 20, y1: 150 };
    const rows: number[] = [];
    for (let y = near.y0; y < near.y1; y++) {
      let n = 0;
      for (let x = near.x0; x < near.x1; x++) if (isSlate(x, y)) n++;
      if (n > 90) rows.push(y);
    }
    const cols: number[] = [];
    for (let x = near.x0; x < near.x1; x++) {
      let n = 0;
      for (let y = near.y0; y < near.y1; y++) if (isSlate(x, y)) n++;
      if (n > 70) cols.push(x);
    }
    const art = {
      x: Math.min(...cols),
      y: Math.min(...rows),
      w: Math.max(...cols) - Math.min(...cols) + 1,
      h: Math.max(...rows) - Math.min(...rows) + 1,
    };
    // Logical px are two art px: the constant covers the painted slate.
    expect(CHALKBOARD_SLATE.x * 2).toBeGreaterThanOrEqual(art.x - 1);
    expect(CHALKBOARD_SLATE.y * 2).toBeGreaterThanOrEqual(art.y - 1);
    expect((CHALKBOARD_SLATE.x + CHALKBOARD_SLATE.w) * 2).toBeLessThanOrEqual(
      art.x + art.w + 1,
    );
    expect((CHALKBOARD_SLATE.y + CHALKBOARD_SLATE.h) * 2).toBeLessThanOrEqual(
      art.y + art.h + 1,
    );
    // ...and is no smaller than the painted one by more than a pixel or two.
    expect(art.w - CHALKBOARD_SLATE.w * 2).toBeLessThanOrEqual(3);
    expect(art.h - CHALKBOARD_SLATE.h * 2).toBeLessThanOrEqual(3);
  });

  test("the chalk area sits inside the slate with margins, clear of the header and ledge", () => {
    const s = CHALKBOARD_SLATE;
    const a = CHALKBOARD_AREA;
    expect(a.x - s.x).toBeGreaterThanOrEqual(3);
    expect(a.y - s.y).toBeGreaterThanOrEqual(3);
    expect(s.x + s.w - (a.x + a.w)).toBeGreaterThanOrEqual(3);
    expect(s.y + s.h - (a.y + a.h)).toBeGreaterThanOrEqual(3);
  });

  test("the chalk stays above Daniele's head when he stands at the board", () => {
    const stand = london.objects.find(
      (o) => o.id === "chalkboard",
    )?.interactionPoint;
    if (!stand) throw new Error("no stand point");
    const head = stand.y - heightAt(london.depth, stand.y, 72);
    expect(CHALKBOARD_AREA.y + CHALKBOARD_AREA.h).toBeLessThanOrEqual(head);
  });

  test("every group fits inside the chalk area, on its own row", () => {
    const rows = boxes(resolveLabel(label.source), CHALKBOARD_AREA);
    expect(rows.map((r) => r.text)).toEqual(resolveLabel(label.source));
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

  test("the whole board fits inside the slate, margins included", () => {
    const s = CHALKBOARD_SLATE;
    for (const r of boxes(resolveLabel(label.source), CHALKBOARD_AREA)) {
      expect(r.x, r.text).toBeGreaterThanOrEqual(s.x + 3);
      expect(r.x + r.w, r.text).toBeLessThanOrEqual(s.x + s.w - 3);
      expect(r.y, r.text).toBeGreaterThanOrEqual(s.y + 3);
      expect(r.y + r.h, r.text).toBeLessThanOrEqual(s.y + s.h - 3);
    }
  });

  test("a longer or wider menu drops rows and steps the type down, not overflowing", () => {
    const lines = [
      ...resolveLabel(label.source),
      ...resolveLabel(label.source),
    ];
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
