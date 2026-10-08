import { describe, expect, test } from "vitest";
import { SECTIONS } from "../../../config/sections";
import type { Rect, SectionId } from "../../../engine/types";
import {
  CHOICES_PAGE,
  PANEL_H,
  PANEL_LAYOUT,
  PANEL_W,
  choiceRows,
} from "../layout";
import { IDLE_SENTENCE, controlSentence, sentenceText } from "../sentence";

const inside = (r: Rect, outer: Rect) =>
  r.x >= outer.x &&
  r.y >= outer.y &&
  r.x + r.w <= outer.x + outer.w &&
  r.y + r.h <= outer.y + outer.h;

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const panel = { x: 0, y: 0, w: PANEL_W, h: PANEL_H };
const rows = PANEL_LAYOUT.tickets.flatMap((t) => t.rows);
const controls: Rect[] = [
  PANEL_LAYOUT.help,
  ...rows.map((r) => r.rect),
  ...PANEL_LAYOUT.utilities.map((u) => u.rect),
];

describe("controls panel layout", () => {
  test("every section has exactly one row, on its city's ticket", () => {
    const sections = rows.map((r) => r.section).sort();
    expect(sections).toEqual((Object.keys(SECTIONS) as SectionId[]).sort());
    for (const t of PANEL_LAYOUT.tickets) {
      for (const r of t.rows) expect(SECTIONS[r.section].home).toBe(t.country);
    }
  });

  test("the tickets run in journey order: Sorrento, London, Zürich", () => {
    expect(PANEL_LAYOUT.tickets.map((t) => t.country)).toEqual([
      "sorrento",
      "london",
      "zurich",
    ]);
  });

  test("Talk, Sound, GitHub, and LinkedIn each have a fitting", () => {
    expect(PANEL_LAYOUT.utilities.map((u) => u.id).sort()).toEqual([
      "github",
      "linkedin",
      "sound",
      "talk",
    ]);
  });

  test("everything fits the panel, and rows sit in their ticket's body", () => {
    expect(inside(PANEL_LAYOUT.sentence, panel)).toBe(true);
    for (const r of controls) expect(inside(r, panel)).toBe(true);
    for (const t of PANEL_LAYOUT.tickets) {
      expect(inside(t.rect, panel)).toBe(true);
      for (const r of t.rows) {
        expect(inside(r.rect, t.rect)).toBe(true);
        expect(overlaps(r.rect, t.stub)).toBe(false);
        expect(overlaps(r.rect, t.header)).toBe(false);
      }
    }
  });

  test("no two controls overlap, so every click has one meaning", () => {
    controls.forEach((a, i) =>
      controls.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)),
    );
  });

  test("Help has its own space beside the sentence line", () => {
    expect(overlaps(PANEL_LAYOUT.help, PANEL_LAYOUT.sentence)).toBe(false);
    const sound = PANEL_LAYOUT.utilities.find((u) => u.id === "sound")!;
    expect(PANEL_LAYOUT.help.x + PANEL_LAYOUT.help.w / 2).toBe(
      sound.rect.x + sound.rect.w / 2,
    );
  });

  test("controls stay big enough to hit in the smallest game window", () => {
    // The Win95 window shrinks the 1280 px game to about 0.6x; a 16 art px
    // control is still about 19 screen px there.
    for (const r of controls) {
      expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(16);
    }
  });
});

describe("sentence line", () => {
  test("a section names itself and its city", () => {
    expect(controlSentence("skills")).toBe("Skills, in London");
    expect(controlSentence("resume")).toBe("Resume, in Zürich");
    expect(controlSentence("contact")).toBe("Contact, in Sorrento");
  });

  test("the fittings say what they do", () => {
    expect(controlSentence("talk")).toBe("Talk to Daniele");
    expect(controlSentence("sound", false)).toBe("Turn on the sound");
    expect(controlSentence("sound", true)).toBe("Turn off the sound");
    expect(controlSentence("github")).toMatch(/GitHub/);
    expect(controlSentence("linkedin")).toMatch(/LinkedIn/);
    expect(controlSentence("help")).toBe("How to play");
  });

  test("a trip beats skipping, skipping beats hovering, and idle walks", () => {
    const base = { hoveredObject: null, skippable: false, flyingTo: null };
    expect(sentenceText(base)).toBe(IDLE_SENTENCE);
    expect(sentenceText({ ...base, hoveredObject: "Look at desk" })).toBe(
      "Look at desk",
    );
    expect(
      sentenceText({ ...base, hoveredObject: "Look at desk", skippable: true }),
    ).toBe("Click to skip");
    expect(sentenceText({ ...base, skippable: true, flyingTo: "zurich" })).toBe(
      "Off to Zürich: Experience, Resume",
    );
  });
});

describe("conversation choices", () => {
  test("the page sits inside the panel", () => {
    expect(inside(CHOICES_PAGE, panel)).toBe(true);
  });

  for (const n of [1, 2, 3, 4]) {
    test(`${n} choice${n > 1 ? "s" : ""} stack in order without overlapping, on the page`, () => {
      const rects = choiceRows(n);
      expect(rects).toHaveLength(n);
      rects.forEach((r, i) => {
        expect(inside(r, CHOICES_PAGE), `row ${i}`).toBe(true);
        if (i > 0) expect(overlaps(r, rects[i - 1]), `row ${i}`).toBe(false);
      });
    });
  }

  test("four choices are still tall enough to hit at the smallest window", () => {
    // The window bottoms out at 680 px wide: 0.53 of the 1280 px canvas,
    // and an art px is 2 canvas px.
    const smallest = (680 / 1280) * 2;
    for (const r of choiceRows(4)) expect(r.h * smallest).toBeGreaterThan(16);
  });
});
