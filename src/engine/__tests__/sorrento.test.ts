import { describe, expect, test } from "vitest";
import { pointInPolygon } from "../geometry";
import { SCENES } from "../scenes";
import type { Rect, SceneEffect } from "../types";

const sorrento = SCENES.sorrento;
const walkable = (x: number, y: number) =>
  pointInPolygon([x, y], sorrento.walkbox);
const rectOf = (id: string): Rect => {
  const r = sorrento.objects.find((o) => o.id === id)?.hotspot;
  if (!r) throw new Error(`no hotspot for ${id}`);
  return r;
};
const inside = (r: Rect, x: number, y: number) =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
const effect = (id: string): SceneEffect => {
  const e = sorrento.effects?.find((x) => x.id === id);
  if (!e) throw new Error(`no effect ${id}`);
  return e;
};

describe("Sorrento (HB4)", () => {
  test("uses the Phase H world scale", () => {
    expect(sorrento.depth).toMatchObject({ farHeight: 58, nearHeight: 72 });
    expect(sorrento.depth.farY).toBeLessThan(sorrento.depth.nearY);
  });

  test("the tiled floor is walkable, and its furniture is not", () => {
    // The open floor, front and back.
    expect(walkable(30, 120)).toBe(true);
    expect(walkable(100, 156)).toBe(true);
    expect(walkable(300, 110)).toBe(true);
    // Behind and in front of the table, and beside its chairs.
    expect(walkable(170, 118)).toBe(true);
    expect(walkable(186, 148)).toBe(true);
    expect(walkable(138, 142)).toBe(true);
    expect(walkable(234, 142)).toBe(true);
    // Under the table and chairs, on the stove, and in the lemon tree's pot.
    expect(walkable(170, 134)).toBe(false);
    expect(walkable(200, 134)).toBe(false);
    expect(walkable(268, 108)).toBe(false);
    expect(walkable(305, 150)).toBe(false);
  });

  test("Daniele can stand at every interaction point", () => {
    for (const o of sorrento.objects) {
      const p = o.interactionPoint;
      if (p) expect(walkable(p.x, p.y), o.id).toBe(true);
    }
  });

  test("the table, chairs, and stove sort by their front feet", () => {
    const baseline = (id: string) =>
      sorrento.objects.find((o) => o.id === id)?.baselineY;
    // Front feet, from the sprites' bottom edges.
    expect(baseline("table")).toBe(138);
    expect(baseline("chair-left")).toBe(137);
    expect(baseline("chair-right")).toBe(137);
    expect(baseline("stove")).toBe(112);
  });

  test("the lemon tree is always drawn over Daniele", () => {
    const tree = sorrento.objects.find((o) => o.id === "lemon-tree");
    expect(tree?.sprite).toBeDefined();
    expect(tree?.baselineY).toBeGreaterThanOrEqual(sorrento.depth.nearY);
  });

  test("the fridge (About) and the phone (Contact) stay one click away", () => {
    const actions = Object.fromEntries(
      sorrento.objects.map((o) => [o.id, o.action]),
    );
    expect(actions.fridge).toBe("about");
    expect(actions.phone).toBe("contact");
  });

  test("the magnets sit on the fridge's lower door", () => {
    const fridge = rectOf("fridge");
    const row = sorrento.slots?.find((s) => s.id === "magnets");
    expect(row?.kind).toBe("magnet");
    // Each magnet is 8x7 logical px; the pile in the last slot is 12x11.
    for (const [x, y] of row?.positions ?? []) {
      expect(inside(fridge, x, y), `magnet at ${x},${y}`).toBe(true);
      expect(inside(fridge, x + 8, y + 7), `magnet at ${x},${y}`).toBe(true);
    }
  });

  test("the section labels are lettered on the fridge note and the phone card", () => {
    for (const [label, object] of [
      ["fridge", "fridge"],
      ["phone", "phone"],
    ] as const) {
      const l = sorrento.labels?.find((x) => x.id === label);
      expect(l && inside(rectOf(object), l.x, l.y), label).toBe(true);
    }
  });

  test("the moka steam rises from the moka pot, and the glints stay on the sea", () => {
    const steam = effect("moka-steam");
    const moka = rectOf("moka-pot");
    expect(steam.kind).toBe("steam");
    if (steam.kind === "steam") {
      expect(inside(moka, steam.x, steam.y + 1)).toBe(true);
      expect(steam.baselineY).toBe(
        sorrento.objects.find((o) => o.id === "stove")?.baselineY,
      );
    }
    const window = rectOf("window");
    for (const id of ["sun-trail", "sea"]) {
      const glints = effect(id);
      expect(glints.kind).toBe("glints");
      if (glints.kind === "glints") {
        expect(inside(window, glints.area.x, glints.area.y), id).toBe(true);
        expect(
          inside(
            window,
            glints.area.x + glints.area.w,
            glints.area.y + glints.area.h,
          ),
          id,
        ).toBe(true);
      }
    }
  });

  test("the ferry crosses the whole window inside its view", () => {
    const ferry = sorrento.props?.find((p) => p.id === "ferry");
    expect(ferry?.clip).toBeDefined();
    const view = ferry?.clip as Rect;
    const [start, end] = [ferry?.path[0], ferry?.path.at(-1)];
    // It starts out of view on the left and ends out of view on the right.
    expect(start?.x).toBeLessThan(view.x);
    expect(end?.x).toBeGreaterThanOrEqual(view.x + view.w);
    expect(inside(rectOf("window"), view.x, view.y)).toBe(true);
  });

  test("the door opens onto the Hall", () => {
    const door = sorrento.exits.find((e) => e.id === "door-hall");
    expect(door?.to).toBe("hall");
    expect(door?.states?.open).toBeDefined();
    expect(SCENES.hall.entryPoints[door?.entry ?? ""]).toBeDefined();
  });
});
