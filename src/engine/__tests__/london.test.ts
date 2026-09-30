import { describe, expect, test } from "vitest";
import {
  findPath,
  heightAt,
  pointInPolygon,
  segmentInPolygon,
} from "../geometry";
import { SCENES } from "../scenes";
import type { Rect, SceneEffect } from "../types";

const london = SCENES.london;
const walkable = (x: number, y: number) =>
  pointInPolygon([x, y], london.walkbox);
const object = (id: string) => {
  const o = london.objects.find((x) => x.id === id);
  if (!o) throw new Error(`no object ${id}`);
  return o;
};
const rectOf = (id: string): Rect => {
  const r = object(id).hotspot;
  if (!r) throw new Error(`no hotspot for ${id}`);
  return r;
};
const inside = (r: Rect, x: number, y: number) =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
const effect = (id: string): SceneEffect => {
  const e = london.effects?.find((x) => x.id === id);
  if (!e) throw new Error(`no effect ${id}`);
  return e;
};

/** Sprite sizes in logical px (the 2x art halved), as placed in HB3. */
const SIZE = {
  table: { w: 61, h: 32 },
  bar: { w: 158, h: 34 },
  jukebox: { w: 33, h: 51 },
};

describe("London (HB3)", () => {
  test("keeps weather and traffic separate from the seated patrons", () => {
    expect(london.foreground).toBeUndefined();
    expect(london.animations).toHaveLength(4);
    expect(london.effects?.map((e) => e.kind).sort()).toEqual(["rain", "rain"]);
    expect(london.props?.map((p) => p.id)).toEqual(["bus"]);
  });

  test("Daniele is drawn to the painted proportions at every object's floor line", () => {
    expect(london.depth).toMatchObject({ farHeight: 55, nearHeight: 66 });
    expect(london.depth.farY).toBeLessThan(london.depth.nearY);
    // What the painted objects say a 1.8 m man is, in logical px: each
    // object's height in px over its real height in metres (HB3 measured
    // the door at 67 px for 2.1 m, the counter 34 px for 1.1 m, the table
    // top 26 px for 0.75 m, the jukebox 51 px for 1.7 m) at the y of
    // its floor line.
    const measured = [
      { id: "door", y: 104, px: 67, metres: 2.1 },
      { id: "table", y: 140, px: 26, metres: 0.75 },
      { id: "bar", y: 120.5, px: 34, metres: 1.1 },
      { id: "jukebox", y: 125, px: 51, metres: 1.7 },
    ];
    for (const m of measured) {
      const man = (m.px / m.metres) * 1.8;
      const drawn = heightAt(london.depth, m.y, 72);
      expect(
        Math.abs(drawn - man) / man,
        `${m.id}: ${drawn} vs ${man}`,
      ).toBeLessThan(0.1);
    }
  });

  test("the table leaves a corridor behind it and open floor in front", () => {
    // Open floor: the door, the middle, in front of everything.
    expect(walkable(20, 113)).toBe(true);
    expect(walkable(95, 110)).toBe(true);
    expect(walkable(160, 140)).toBe(true);
    expect(walkable(300, 140)).toBe(true);
    // Walk behind the foreground table, or around its right edge.
    expect(walkable(61, 122)).toBe(true);
    expect(walkable(97, 132)).toBe(true);
    expect(walkable(61, 147)).toBe(true);
    // Under the table and stools, and along the bar.
    expect(walkable(61, 132)).toBe(false);
    expect(walkable(80, 136)).toBe(false);
    expect(walkable(120, 110)).toBe(false);
    expect(walkable(180, 118)).toBe(false);
    // Behind the bar's right end, and behind the jukebox.
    expect(walkable(245, 109)).toBe(true);
    expect(walkable(300, 109)).toBe(true);
    // On the jukebox itself.
    expect(walkable(300, 120)).toBe(false);
  });

  test("Daniele can stand at every interaction point", () => {
    for (const o of [...london.objects, ...london.exits]) {
      const p = o.interactionPoint;
      if (p) expect(walkable(p.x, p.y), o.id).toBe(true);
    }
    for (const p of Object.values(london.entryPoints))
      expect(walkable(p.x, p.y)).toBe(true);
  });

  test("every stand point is reachable on foot from the door", () => {
    const from = london.entryPoints.fromHall;
    for (const o of [...london.objects, ...london.exits]) {
      const p = o.interactionPoint;
      if (!p) continue;
      const path = findPath([from.x, from.y], [p.x, p.y], london.walkbox);
      expect(path.at(-1), o.id).toEqual([p.x, p.y]);
      let prev: [number, number] = [from.x, from.y];
      for (const step of path) {
        expect(segmentInPolygon(prev, step, london.walkbox), o.id).toBe(true);
        prev = [step[0], step[1]];
      }
    }
  });

  test("the table, bar and jukebox sort by their front feet", () => {
    for (const id of ["table", "bar", "jukebox"] as const) {
      const o = object(id);
      const bottom = (o.y ?? 0) + SIZE[id].h;
      expect(o.baselineY, id).toBeLessThanOrEqual(bottom);
      expect(o.baselineY, id).toBeGreaterThanOrEqual(bottom - 4);
    }
    // Feet on the baseline are in front of the footprint's front edge.
    expect(walkable(100, (object("bar").baselineY ?? 0) + 1)).toBe(true);
  });

  test("the table and its seated pair sort in front of the window visitor", () => {
    const table = object("table");
    const behind = object("window").interactionPoint;
    const inFront = table.interactionPoint;
    expect(table.baselineY).toBeGreaterThan(object("bar").baselineY ?? 0);
    expect(behind?.y).toBeLessThan(table.baselineY ?? 0);
    expect(inFront?.y).toBeGreaterThan(table.baselineY ?? 0);
    const pair = london.animations?.filter((a) =>
      a.id.startsWith("patron-table-"),
    );
    expect(pair).toHaveLength(2);
    for (const patron of pair ?? []) {
      expect(patron.baselineY).toBeGreaterThan(behind?.y ?? 0);
      expect(patron.baselineY).toBeLessThan(inFront?.y ?? 0);
      // Moving the furniture must carry both sitters by the same amount.
      expect((table.y ?? 0) - patron.y).toBe(18);
    }
  });

  test("the music corner replaces the gambling machine and its effects", () => {
    expect(object("jukebox").name).toBe("jukebox");
    expect(object("jukebox").sprite).toContain("obj-jukebox");
    expect(object("jukebox").use?.length).toBeGreaterThan(10);
    expect(london.objects.some((o) => o.id === "fruit-machine")).toBe(false);
    expect(london.effects?.some((e) => e.id === "fruit-lamps")).toBe(false);
  });

  test("the chalkboard (Skills) stays one click away, with its label on the header", () => {
    expect(object("chalkboard").action).toBe("skills");
    const label = london.labels?.find((l) => l.id === "board-header");
    expect(label?.source).toBe("section:skills");
    const board = rectOf("chalkboard");
    expect(inside(board, label?.x ?? -1, label?.y ?? -1)).toBe(true);
  });

  test("the eight taps stand on the bar top, under the chalkboard", () => {
    const row = london.slots?.find((s) => s.id === "taps");
    const bar = object("bar");
    expect(row?.kind).toBe("tap");
    expect(row?.positions).toHaveLength(8);
    const board = rectOf("chalkboard");
    for (const [x, y] of row?.positions ?? []) {
      // 7x16 logical px, its bottom row on the bar top (the lit surface
      // is the top 6 px of the counter).
      expect(x).toBeGreaterThanOrEqual(board.x - 8);
      expect(x + 7).toBeLessThanOrEqual(board.x + board.w + 8);
      expect(y + 16).toBeGreaterThanOrEqual((bar.y ?? 0) + 1);
      expect(y + 16).toBeLessThanOrEqual((bar.y ?? 0) + 6);
    }
    expect(row?.baselineY).toBe(bar.baselineY);
  });

  test("the six job photos hang on bare wall, clear of the dartboard and shelves", () => {
    const row = london.slots?.find((s) => s.id === "job-photos");
    expect(row?.kind).toBe("photo-frame");
    expect(row?.positions).toHaveLength(6);
    const dart = rectOf("dartboard");
    const shelf = rectOf("glasses");
    for (const [x, y] of row?.positions ?? []) {
      // 20x16 logical px each.
      expect(x, `frame at ${x},${y}`).toBeGreaterThanOrEqual(shelf.x + shelf.w);
      expect(x + 20, `frame at ${x},${y}`).toBeLessThanOrEqual(dart.x);
    }
  });

  test("the rain stays inside the window", () => {
    const rain = effect("rain-near");
    const window = rectOf("window");
    expect(rain.kind).toBe("rain");
    if (rain.kind === "rain") {
      expect(inside(window, rain.area.x, rain.area.y)).toBe(true);
      expect(
        inside(window, rain.area.x + rain.area.w, rain.area.y + rain.area.h),
      ).toBe(true);
      expect(rain.clip).toEqual(rain.area);
    }
  });

  test("the bus crawls between the phone box and the lamp post, and stays inside that view", () => {
    const bus = london.props?.find((p) => p.id === "bus");
    const view = bus?.clip as Rect;
    const phoneBox = rectOf("phone-box");
    expect(view.x).toBeGreaterThanOrEqual(phoneBox.x + phoneBox.w);
    // The lamp post stands at about x 104; the clip ends before it.
    expect(view.x + view.w).toBeLessThanOrEqual(104);
    expect(inside(rectOf("window"), view.x, view.y)).toBe(true);
    const [start, end] = [bus?.path[0], bus?.path.at(-1)];
    // 26 px long: it starts out of view on the left and ends at the right edge.
    expect((start?.x ?? 0) + 26).toBeLessThanOrEqual(view.x);
    expect((end?.x ?? 0) + 26).toBeGreaterThan(view.x + view.w);
    expect(bus?.everyMs).toBeGreaterThan(bus?.durationMs ?? 0);
  });

  test("the door opens onto the Hall", () => {
    const door = london.exits.find((e) => e.id === "door-hall");
    expect(door?.to).toBe("hall");
    expect(door?.states?.open).toBeDefined();
    expect(SCENES.hall.entryPoints[door?.entry ?? ""]).toBeDefined();
  });

  test("the flavour objects keep their jokes and sounds", () => {
    expect(object("dartboard").sound).toBe("dart-thunk");
    expect(object("jukebox").sound).toBeUndefined();
    for (const id of [
      "window",
      "phone-box",
      "bottles",
      "glasses",
      "table",
      "stool",
      "bar",
      "jukebox",
    ]) {
      expect(object(id).look.length, id).toBeGreaterThan(10);
    }
  });
});
