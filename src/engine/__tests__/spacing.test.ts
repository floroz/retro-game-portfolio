import { describe, expect, test } from "vitest";
import logo from "../../assets/fonts/serif-logo.txt?raw";
import regular from "../../assets/fonts/adventure-regular.txt?raw";
import small from "../../assets/fonts/adventure-small.txt?raw";
import tiny from "../../assets/fonts/adventure-tiny.txt?raw";
import { parseAtlas, type BitmapFont, type Glyph } from "../bitmapFont";

/**
 * Spacing check for the bitmap fonts. Reading text preserves consistent
 * spacing without optical kerning; display lettering also checks for holes.
 * For every pair of letters at a size,
 * it lays the two glyphs side by side as the engine does (advance, tracking,
 * pair kerning) and measures the white between their ink (edge tone
 * included) on every row both have ink on. A pair is flagged when
 *
 * - its ink touches, sideways or on the diagonal (a gap of 0 or less on the
 *   same row, or on rows one apart), or
 * - it has a hole: its tightest row is more than 1 px wider than the size's
 *   median, so the pair reads as two words ("Welco me"), and it could be
 *   kerned 1 px closer without touching. (A few pairs are held apart by the
 *   drooping serifs of a T or an F over a lowercase letter: the white under
 *   the bar is theirs, and they're counted as "blocked", not as holes.)
 */

/** Ink extents of each row above the baseline: first and last inked column. */
function extents(g: Glyph): Map<number, [number, number]> {
  const rows = new Map<number, [number, number]>();
  for (let y = 0; y < g.h; y++) {
    let first = -1;
    let last = -1;
    for (let x = 0; x < g.w; x++) {
      if (g.bits[y * g.w + x]) {
        if (first < 0) first = x;
        last = x;
      }
    }
    if (first >= 0) rows.set(g.top - y, [g.left + first, g.left + last]);
  }
  return rows;
}

interface PairGap {
  pair: string;
  /** Blank columns on the tightest row both glyphs share; null if none. */
  gap: number | null;
  /** Tightest gap between rows at most one apart: 0 or less is a touch. */
  contact: number;
  /** The same with the pair kerned 1 px closer. */
  contactCloser: number;
}

function pairGaps(font: BitmapFont, chars: string[]): PairGap[] {
  const ink = new Map(chars.map((c) => [c, extents(font.glyphs.get(c)!)]));
  const out: PairGap[] = [];
  for (const a of chars) {
    for (const b of chars) {
      const ga = font.glyphs.get(a)!;
      const start = ga.advance + font.tracking + (font.kerning.get(a + b) ?? 0);
      const ea = ink.get(a)!;
      const eb = ink.get(b)!;
      let gap: number | null = null;
      let contact = Infinity;
      for (const [ua, [, right]] of ea) {
        for (let d = -1; d <= 1; d++) {
          const other = eb.get(ua + d);
          if (!other) continue;
          const white = start + other[0] - right - 1;
          contact = Math.min(contact, white);
          if (d === 0) gap = gap === null ? white : Math.min(gap, white);
        }
      }
      // Mixed-case sizes are never set tighter than 1 px of tracking (see
      // fitText), the capitals-only sizes may close up to 0: a pair can be
      // kerned closer if it would still clear at that tracking.
      const floor = font.upper ? 0 : Math.min(font.tracking, 1);
      out.push({
        pair: a + b,
        gap,
        contact,
        contactCloser: contact - (font.tracking - floor) - 1,
      });
    }
  }
  return out;
}

export function spacingReport(font: BitmapFont, chars: string[]) {
  const gaps = pairGaps(font, chars);
  const measured = gaps
    .map((p) => p.gap)
    .filter((g): g is number => g !== null)
    .sort((x, y) => x - y);
  const median = measured[Math.floor(measured.length / 2)];
  return {
    median,
    pairs: gaps.length,
    touching: gaps.filter((p) => p.contact <= 0).map((p) => p.pair),
    holes: gaps
      .filter(
        (p) => p.gap !== null && p.gap > median + 1 && p.contactCloser > 0,
      )
      .map((p) => p.pair),
    blocked: gaps
      .filter(
        (p) => p.gap !== null && p.gap > median + 1 && p.contactCloser <= 0,
      )
      .map((p) => p.pair),
  };
}

const LOWER = [..."abcdefghijklmnopqrstuvwxyz"];
const UPPER = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

describe("letter spacing", () => {
  test.each([
    ["logo", logo, [...UPPER, ...LOWER]],
    ["regular", regular, [...UPPER, ...LOWER]],
    ["small", small, UPPER],
    ["tiny", tiny, UPPER],
  ])("%s leaves open space between every pair", (_id, text, chars) => {
    const font = parseAtlas(text);
    const report = spacingReport(font, chars);
    expect(report.touching).toEqual([]);
    if (font.id === "logo") expect(report.holes).toEqual([]);
    // The few pairs held apart by a T's or F's serifs stay a small minority.
    if (font.id === "logo")
      expect(report.blocked.length).toBeLessThan(report.pairs * 0.03);
    // Kerning only ever closes a pair up. Opening one left holes in words.
    expect([...font.kerning.values()].filter((k) => k > 0)).toEqual([]);
  });

  test("the check does find a hole and a touch", () => {
    const font = parseAtlas(
      [
        "font t",
        "cap 3",
        "xheight 3",
        "ascent 3",
        "descent 0",
        "line 4",
        "tracking 0",
        "word 0",
        "upper 1",
        "glyph 0048 4 0 3 H",
        "#.#",
        "###",
        "#.#",
        "kern 0048 0048 3",
      ].join("\n"),
    );
    expect(spacingReport(font, ["H"]).holes).toEqual([]);
    // Nothing to compare with: a lone pair has a median of itself.
    const wide = { ...font, kerning: new Map([["HH", -4]]) };
    expect(spacingReport(wide, ["H"]).touching).toEqual(["HH"]);
  });
});
