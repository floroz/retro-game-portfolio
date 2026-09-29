import { describe, expect, test } from "vitest";
import {
  iconRows,
  lineHeight,
  measureText,
  parseGlyphs,
  unknownChars,
  wrapText,
} from "../font";
import { MARQUEE_GAP, marqueeX, resolveLabel } from "../labels";
import { hoverText } from "../hover";
import { SCENES } from "../scenes";
import { routeFor, pointOnRoute, headingIndex } from "../travelMap";
import { TRAVEL_MAP_DATA } from "../scenes";

describe("pixel font", () => {
  test("measures proportional glyphs with 1 px spacing", () => {
    expect(measureText("i")).toBe(1);
    expect(measureText("ii")).toBe(3);
    expect(measureText("AB", "small")).toBe(7);
  });

  test("wraps to a pixel width and keeps newlines", () => {
    const lines = wrapText("one two three four five six", 40);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(measureText(l)).toBeLessThanOrEqual(40);
    expect(wrapText("a\nb", 100)).toEqual(["a", "b"]);
  });

  test("draws section icons as single glyphs", () => {
    expect(measureText("{skills}")).toBe(7);
    expect(unknownChars("{resume} Eau de Résumé")).toEqual([]);
  });

  test("reports characters it can't draw", () => {
    expect(unknownChars("snowman ☃")).toEqual(["☃"]);
  });

  test("keeps the 1x fonts' metrics, so labels fit where they did", () => {
    expect(measureText("Hello, sailor!")).toBe(54);
    expect(measureText("GATE 1 LONDON", "small")).toBe(51);
    expect(measureText("{resume} RESUME", "small")).toBe(33);
    expect(lineHeight("regular")).toBe(10);
    expect(lineHeight("small")).toBe(7);
  });

  test("section icons are drawn at canvas resolution", () => {
    const rows = iconRows("skills");
    expect(rows).toHaveLength(14);
    for (const row of rows) expect(row).toHaveLength(14);
  });

  test("glyphs are parsed at two canvas pixels per logical px", () => {
    const glyphs = parseGlyphs("A 4\n.##.\n#..#\n\nspace 2", 2);
    expect(glyphs.get("A")?.rows).toEqual([".##.", "#..#", "....", "...."]);
    expect(glyphs.get(" ")?.w).toBe(2);
    expect(() => parseGlyphs("A 3\n###", 2)).toThrow(/header/);
    expect(() => parseGlyphs("A 2\n###", 2)).toThrow(/bigger/);
  });
});

describe("labels", () => {
  test("gate signs name the gate, the country, and its sections", () => {
    expect(resolveLabel("gate:zurich")).toEqual([
      "Gate 2",
      "Zurich",
      "{experience} Experience",
      "{resume} Resume",
    ]);
  });

  test("the departures board has a row per gate", () => {
    expect(resolveLabel("departures")).toHaveLength(3);
  });

  test("the chalkboard lists the skill groups", () => {
    const menu = resolveLabel("skills:menu");
    expect(menu).toContain("Frontend");
    expect(menu).toContain("Leadership");
  });

  test("fixed text passes through", () => {
    expect(resolveLabel("text:Duty free")).toEqual(["Duty free"]);
    expect(resolveLabel("section:resume")).toEqual(["Resume"]);
  });
});

describe("marquee labels", () => {
  const marquee = { clip: { x: 152, y: 83, w: 17, h: 12 }, pxPerSec: 12 };

  test("enters at the clip's right edge and scrolls left 1 px at a time", () => {
    expect(marqueeX(marquee, 39, 0)).toBe(169);
    expect(marqueeX(marquee, 39, 1000)).toBe(157);
    expect(marqueeX(marquee, 39, 1040)).toBe(157);
  });

  test("starts again once the text and the gap have passed", () => {
    const cycleMs = ((17 + 39 + MARQUEE_GAP) / 12) * 1000;
    expect(marqueeX(marquee, 39, cycleMs)).toBe(169);
  });

  test("the Zurich CRT names its section on screen", () => {
    const crt = SCENES.zurich.labels?.find((l) => l.id === "crt");
    expect(crt?.source).toBe("section:experience");
    expect(crt?.marquee).toBeDefined();
  });
});

describe("hover text", () => {
  test("primary objects name their section", () => {
    const board = SCENES.london.objects.find((o) => o.action === "skills");
    expect(board && hoverText({ kind: "object", object: board })).toMatch(
      /^Open Skills: /,
    );
  });

  test("gates say where they fly and what's there", () => {
    const gate = SCENES.hall.exits.find((e) => e.to === "zurich");
    expect(gate && hoverText({ kind: "exit", exit: gate })).toBe(
      "Fly to Zurich: Experience, Resume",
    );
  });
});

describe("travel map routes", () => {
  test("run from marker to marker", () => {
    const r = routeFor(TRAVEL_MAP_DATA, "london", "sorrento");
    expect(pointOnRoute(r, 0)).toEqual(TRAVEL_MAP_DATA.markers.london);
    expect(pointOnRoute(r, 1)).toEqual(TRAVEL_MAP_DATA.markers.sorrento);
  });

  test("start at the Hall point for a first flight, or a round trip", () => {
    expect(routeFor(TRAVEL_MAP_DATA, "hall", "zurich").a).toEqual(
      TRAVEL_MAP_DATA.hall,
    );
    expect(routeFor(TRAVEL_MAP_DATA, "zurich", "zurich").a).toEqual(
      TRAVEL_MAP_DATA.hall,
    );
  });

  test("bow north", () => {
    const r = routeFor(TRAVEL_MAP_DATA, "london", "sorrento");
    const mid = pointOnRoute(r, 0.5);
    const straightY = (r.a[1] + r.b[1]) / 2;
    expect(mid[1]).toBeLessThan(straightY);
  });

  test("quantise headings to eight directions", () => {
    expect(headingIndex(0)).toBe(0);
    expect(headingIndex(Math.PI / 2)).toBe(2);
    expect(headingIndex(Math.PI)).toBe(4);
    expect(headingIndex(-Math.PI / 2)).toBe(6);
  });
});
