import { describe, expect, test } from "vitest";
import { SECTIONS } from "../../config/sections";
import { unknownChars } from "../font";
import { pointInPolygon } from "../geometry";
import { resolveLabel } from "../labels";
import { SCENES, TRAVEL_MAP_DATA } from "../scenes";
import { sceneWarnings } from "../validate";
import type { Rect, SceneId, SectionId, StandPoint } from "../types";

const inside = (scene: SceneId, p: StandPoint) =>
  pointInPolygon([p.x, p.y], SCENES[scene].walkbox);

describe("scene data contract", () => {
  const scenes = Object.entries(SCENES) as [
    SceneId,
    (typeof SCENES)[SceneId],
  ][];

  test.each(scenes)("%s is registered under its own id", (id, scene) => {
    expect(scene.id).toBe(id);
    expect(scene.walkbox.length).toBeGreaterThanOrEqual(3);
  });

  test.each(scenes)("%s: exits lead to existing entry points", (id, scene) => {
    for (const exit of scene.exits) {
      const dest = SCENES[exit.to];
      expect(dest, `${id}/${exit.id}`).toBeDefined();
      expect(Object.keys(dest.entryPoints), `${id}/${exit.id}`).toContain(
        exit.entry,
      );
      expect(inside(id, exit.interactionPoint), `${id}/${exit.id}`).toBe(true);
    }
  });

  test.each(scenes)("%s: stand points are walkable", (id, scene) => {
    for (const [key, p] of Object.entries(scene.entryPoints)) {
      expect(inside(id, p), `${id} entry ${key}`).toBe(true);
    }
    for (const o of scene.objects) {
      if (o.interactionPoint) {
        expect(inside(id, o.interactionPoint), `${id}/${o.id}`).toBe(true);
      }
    }
  });

  test.each(scenes)(
    "%s: objects have a sprite position or a hotspot",
    (id, scene) => {
      for (const o of scene.objects) {
        if (o.sprite) {
          expect(o.x !== undefined && o.y !== undefined, `${id}/${o.id}`).toBe(
            true,
          );
        } else {
          expect(o.hotspot, `${id}/${o.id}`).toBeDefined();
        }
      }
    },
  );

  test.each(scenes)("%s: ids are unique", (id, scene) => {
    const ids = [...scene.objects, ...scene.exits].map((o) => o.id);
    expect(new Set(ids).size, id).toBe(ids.length);
  });

  test("the Hall has a start and a gate to every country", () => {
    const hall = SCENES.hall;
    expect(hall.entryPoints.start).toBeDefined();
    for (const country of ["london", "zurich", "sorrento"] as const) {
      expect(
        hall.exits.some((e) => e.to === country),
        country,
      ).toBe(true);
      expect(SCENES[country].entryPoints.fromHall, country).toBeDefined();
    }
  });

  test("each gate's whole sign is clickable, and the arch stays clickable", () => {
    const hall = SCENES.hall;
    const overlaps = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const covers = (rects: Rect[], x: number, y: number) =>
      rects.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    // The hanging sign panels painted in hall/bg.png, and obj-arch.png's
    // box (32x59 at the arch's position).
    const signs: Record<string, Rect> = {
      "gate-london": { x: 174, y: 14, w: 39, h: 31 },
      "gate-zurich": { x: 213, y: 14, w: 54, h: 31 },
      "gate-sorrento": { x: 267, y: 14, w: 41, h: 31 },
    };
    const arch = hall.objects.find((o) => o.id === "arch");
    const archBox = { x: arch?.x ?? 0, y: arch?.y ?? 0, w: 32, h: 59 };
    for (const exit of hall.exits) {
      const rects = [exit.hotspot, ...(exit.extraHotspots ?? [])];
      const sign = signs[exit.id];
      for (let y = sign.y; y < sign.y + sign.h; y++) {
        for (let x = sign.x; x < sign.x + sign.w; x++) {
          expect(covers(rects, x, y), `${exit.id} at ${x},${y}`).toBe(true);
        }
      }
      for (const r of rects) {
        expect(overlaps(r, archBox), `${exit.id} over the arch`).toBe(false);
      }
    }
  });

  test("country scenes only lead back to the Hall", () => {
    for (const id of ["london", "zurich", "sorrento"] as const) {
      const exits = SCENES[id].exits;
      expect(exits.length, id).toBeGreaterThan(0);
      expect(
        exits.every((e) => e.to === "hall"),
        id,
      ).toBe(true);
    }
  });

  test("every section has a primary object in its home scene", () => {
    for (const [section, info] of Object.entries(SECTIONS)) {
      const found = SCENES[info.home].objects.some(
        (o) => o.action === (section as SectionId),
      );
      expect(found, `${section} in ${info.home}`).toBe(true);
    }
  });

  test("the Hall's duty-free shelf opens every section", () => {
    const actions = new Set(SCENES.hall.objects.map((o) => o.action));
    for (const section of Object.keys(SECTIONS)) {
      expect(actions.has(section as SectionId), section).toBe(true);
    }
  });

  test("the travel map marks every country", () => {
    for (const c of ["london", "zurich", "sorrento"] as const) {
      expect(TRAVEL_MAP_DATA.markers[c]).toHaveLength(2);
    }
  });

  test.each(scenes)(
    "%s: every line and label can be drawn in the pixel font",
    (id, scene) => {
      const lines = [
        scene.entryLine ?? "",
        ...scene.objects.flatMap((o) => [o.name, o.look, o.use ?? ""]),
        ...scene.exits.map((e) => e.look ?? ""),
      ];
      for (const line of lines)
        expect(unknownChars(line), `${id}: ${line}`).toEqual([]);
      for (const label of scene.labels ?? []) {
        const font = label.font ?? "regular";
        for (const line of resolveLabel(label.source)) {
          expect(
            unknownChars(line, font),
            `${id}/${label.id}: ${line}`,
          ).toEqual([]);
        }
      }
    },
  );
});

describe("dev overlay warnings", () => {
  test("every scene is clean", () => {
    for (const scene of Object.values(SCENES)) {
      expect(sceneWarnings(scene, SCENES), scene.id).toEqual([]);
    }
  });

  test("flags a stand point off the walkbox and a missing entry", () => {
    const broken = {
      ...SCENES.london,
      entryPoints: { fromHall: { x: 160, y: 10, facing: "s" as const } },
      exits: SCENES.london.exits.map((e) => ({ ...e, entry: "fromNowhere" })),
    };
    const warnings = sceneWarnings(broken, SCENES);
    expect(warnings).toContain("entry fromHall is off the walkbox");
    expect(warnings.some((w) => w.includes("fromNowhere"))).toBe(true);
  });
});
