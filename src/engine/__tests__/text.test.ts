import { describe, expect, test } from "vitest";
import {
  fitScale,
  lineHeight,
  measureText,
  unknownChars,
  wrapText,
} from "../font";
import { iconRows } from "../icons";
import { MARQUEE_GAP, marqueeX, resolveLabel } from "../labels";
import { hoverText } from "../hover";
import { SCENES } from "../scenes";
import { routeFor, pointOnRoute, headingIndex } from "../travelMap";
import { TRAVEL_MAP_DATA } from "../scenes";

describe("world text", () => {
  test("measures proportional text in logical px", () => {
    expect(measureText("")).toBe(0);
    expect(measureText("ii")).toBeGreaterThan(measureText("i"));
    expect(measureText("Hello, sailor!")).toBeGreaterThan(40);
    expect(measureText("Hello, sailor!")).toBeLessThan(80);
  });

  test("signs are in capitals", () => {
    expect(measureText("gate", "small")).toBe(measureText("GATE", "small"));
  });

  test("wraps to a width and keeps newlines", () => {
    const lines = wrapText("one two three four five six", 40);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(measureText(l)).toBeLessThanOrEqual(40);
    expect(wrapText("a\nb", 100)).toEqual(["a", "b"]);
  });

  test("shrinks a line to fit, but not past legibility", () => {
    const w = measureText("EXPERIENCE", "small");
    expect(fitScale("EXPERIENCE", w + 1, "small")).toBe(1);
    const fit = fitScale("EXPERIENCE", w * 0.8, "small");
    expect(fit).toBeCloseTo(0.8);
    expect(measureText("EXPERIENCE", "small", fit)).toBeCloseTo(w * 0.8);
    expect(fitScale("EXPERIENCE", 1, "small")).toBe(0.6);
  });

  test("draws section icons inline, as one glyph each", () => {
    expect(measureText("{skills}")).toBe(measureText("{resume}"));
    expect(measureText("{skills} Skills")).toBeGreaterThan(
      measureText(" Skills"),
    );
    expect(unknownChars("{resume} Eau de Résumé — “quoted”…")).toEqual([]);
  });

  test("reports characters the font can't draw", () => {
    expect(unknownChars("snowman ☃")).toEqual(["☃"]);
  });

  test("keeps the line heights the layout was built on", () => {
    expect(lineHeight("regular")).toBe(11);
    expect(lineHeight("small")).toBe(7);
  });

  test("section icons are 14x14 pixel art", () => {
    const rows = iconRows("skills");
    expect(rows).toHaveLength(14);
    for (const row of rows) expect(row).toHaveLength(14);
  });
});

describe("labels", () => {
  test("gate signs show the gate number and the city only", () => {
    expect(resolveLabel("gate:zurich")).toEqual(["Gate 2", "Zurich"]);
  });

  test("the departures board lists the cities only", () => {
    expect(resolveLabel("departures")).toEqual([
      "London",
      "Zurich",
      "Sorrento",
    ]);
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
