import { describe, expect, test } from "vitest";
import { SECTIONS } from "../../config/sections";
import { unknownChars } from "../font";
import { pointInPolygon } from "../geometry";
import { resolveLabel } from "../labels";
import { SCENES, TRAVEL_MAP_DATA } from "../scenes";
import { sceneWarnings } from "../validate";
import type { SceneId, SectionId, StandPoint } from "../types";

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
