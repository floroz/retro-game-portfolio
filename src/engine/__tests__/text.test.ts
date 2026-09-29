import { describe, expect, test } from "vitest";
import regular from "../../assets/fonts/serif-regular.txt?raw";
import small from "../../assets/fonts/serif-small.txt?raw";
import tiny from "../../assets/fonts/serif-tiny.txt?raw";
import { parseAtlas } from "../bitmapFont";
import {
  capHeight,
  fitText,
  lineHeight,
  linesSize,
  measureText,
  renderLines,
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
  test("measures the bitmap font in logical px, on the 2x art grid", () => {
    expect(measureText("")).toBe(0);
    expect(measureText("ii")).toBeGreaterThan(measureText("i"));
    // Whole art px: logical widths are multiples of half a px.
    for (const s of ["Hello, sailor!", "It says", "Zürich"]) {
      expect(Number.isInteger(measureText(s) * 2)).toBe(true);
    }
    expect(measureText("Hello, sailor!")).toBeGreaterThan(40);
    expect(measureText("Hello, sailor!")).toBeLessThan(60);
  });

  test("sets letters apart and kerns pairs", () => {
    // "AV" kerns tighter than the sum of its letters plus tracking.
    const tracked = measureText("A") + measureText("V") + 0.5;
    expect(measureText("AV")).toBeLessThan(tracked);
    // Tracking and word spacing are whole art px.
    expect(measureText("H H") * 2).toBe(
      measureText("H") * 2 * 2 + measureText(" ") * 2 + 2,
    );
  });

  test("MI3 proportions: capitals 12 art px, signs 8, tiny signs 7", () => {
    expect(capHeight("regular") * 2).toBe(12);
    expect(capHeight("small") * 2).toBe(8);
    expect(capHeight("tiny") * 2).toBe(7);
  });

  test("keeps line heights on the art grid", () => {
    expect(lineHeight("regular")).toBe(9.5);
    expect(lineHeight("small")).toBe(6);
    expect(lineHeight("tiny")).toBe(5);
  });

  test("signs are in capitals", () => {
    expect(measureText("gate", "small")).toBe(measureText("GATE", "small"));
    expect(measureText("gate", "tiny")).toBe(measureText("GATE", "tiny"));
  });

  test("wraps to a width and keeps newlines", () => {
    const lines = wrapText("one two three four five six", 40);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(measureText(l)).toBeLessThanOrEqual(40);
    expect(wrapText("a\nb", 100)).toEqual(["a", "b"]);
  });

  test("fits a line by closing up letters, then stepping down a size", () => {
    const w = measureText("RESUME", "small");
    expect(fitText("RESUME", w, "small")).toEqual({
      font: "small",
      tracking: 1,
    });
    const tight = measureText("RESUME", "small", 0);
    expect(tight).toBe(w - 2.5);
    expect(fitText("RESUME", tight, "small")).toEqual({
      font: "small",
      tracking: 0,
    });
    expect(fitText("RESUME", tight - 0.5, "small").font).toBe("tiny");
    // Past the smallest setting, the tightest one.
    expect(fitText("RESUME", 1, "small")).toEqual({
      font: "tiny",
      tracking: 0,
    });
    expect(fitText("Hello", 1, "regular").font).toBe("tiny");
  });

  test("the Zurich cabinet card fits its word", () => {
    const card = SCENES.zurich.labels?.find((l) => l.id === "cabinet");
    expect(card?.maxWidth).toBeDefined();
    const text = resolveLabel(card?.source ?? "text:")[0];
    const fit = fitText(text, card?.maxWidth ?? 0, card?.font ?? "regular");
    expect(measureText(text, fit.font, fit.tracking)).toBeLessThanOrEqual(
      card?.maxWidth ?? 0,
    );
  });

  test("draws section icons inline, as one glyph each", () => {
    expect(measureText("{skills}")).toBe(measureText("{resume}"));
    expect(measureText("{skills} Skills")).toBeGreaterThan(
      measureText(" Skills"),
    );
    expect(unknownChars("{resume} Eau de Résumé — “quoted”…")).toEqual([]);
  });

  test("sizes a standalone canvas for text outside the scene", () => {
    const one = linesSize(["Walk to door"]);
    expect(one.w).toBe(measureText("Walk to door") * 2 + 6);
    const two = linesSize(["Walk to door", "Look at door"]);
    expect(two.h - one.h).toBe(lineHeight("regular") * 2);
    const canvas = document.createElement("canvas");
    renderLines(canvas, ["Walk to door"], { color: "#fff" });
    expect([canvas.width, canvas.height]).toEqual([one.w, one.h]);
  });

  test("reports characters the font can't draw", () => {
    expect(unknownChars("snowman ☃")).toEqual(["☃"]);
  });

  test("section icons are 14x14 pixel art", () => {
    const rows = iconRows("skills");
    expect(rows).toHaveLength(14);
    for (const row of rows) expect(row).toHaveLength(14);
  });
});

describe("bitmap atlas", () => {
  const atlas = [
    "// a comment",
    "font test",
    "cap 2",
    "xheight 1",
    "ascent 2",
    "descent 1",
    "line 4",
    "tracking 1",
    "word 1",
    "upper 0",
    "glyph 0020 2 0 0",
    "",
    "glyph 0041 3 0 2 A",
    ".#.",
    "###",
    "#.#",
    "",
    "kern 0041 0041 -1",
  ].join("\n");

  test("parses metrics, glyphs, and kerning", () => {
    const font = parseAtlas(atlas);
    expect(font.cap).toBe(2);
    expect(font.glyphs.get(" ")).toMatchObject({ advance: 2, w: 0, h: 0 });
    const a = font.glyphs.get("A");
    expect(a).toMatchObject({ advance: 3, left: 0, top: 2, w: 3, h: 3 });
    expect([...(a?.bits ?? [])]).toEqual([0, 1, 0, 1, 1, 1, 1, 0, 1]);
    expect(font.kerning.get("AA")).toBe(-1);
  });

  test("rejects a ragged glyph", () => {
    expect(() => parseAtlas(atlas.replace("###", "####"))).toThrow(/ragged/);
  });

  test("every shipped glyph is 1-bit ink with its box trimmed", () => {
    for (const text of [regular, small, tiny]) {
      const font = parseAtlas(text);
      expect(font.glyphs.size).toBeGreaterThan(150);
      for (const [ch, g] of font.glyphs) {
        if (!g.h) continue;
        const row = (y: number) => g.bits.slice(y * g.w, (y + 1) * g.w);
        expect(row(0).some(Boolean), `${font.id} ${ch} top`).toBe(true);
        expect(row(g.h - 1).some(Boolean), `${font.id} ${ch} bottom`).toBe(
          true,
        );
      }
    }
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
