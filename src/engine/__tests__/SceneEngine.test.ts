import { describe, expect, test, vi } from "vitest";
import { CHARACTER_SHEET } from "../assets";
import { SceneEngine, type EngineHost } from "../SceneEngine";
import { SCENES, TRAVEL_MAP_DATA } from "../scenes";
import type { SceneData, SectionId } from "../types";

function setup(
  start: "hall" | "london" | "zurich" | "sorrento" = "hall",
  scenes = SCENES,
) {
  const host = {
    openSection: vi.fn<(s: SectionId) => void>(),
    sceneChanged: vi.fn(),
    sound: vi.fn(),
  } satisfies EngineHost;
  const engine = new SceneEngine({
    scenes,
    travelMap: TRAVEL_MAP_DATA,
    sheet: CHARACTER_SHEET,
    host,
    start,
    rng: () => 0.5,
  });
  return { engine, host };
}

/** Steps the engine in 16 ms frames. */
function run(engine: SceneEngine, ms: number) {
  for (let t = 0; t < ms; t += 16) engine.update(16);
}

/** Runs until `done()` or the time limit. Returns the time taken. */
function runUntil(engine: SceneEngine, done: () => boolean, limit = 10000) {
  let t = 0;
  while (!done() && t < limit) {
    engine.update(16);
    t += 16;
  }
  return t;
}

const object = (scene: SceneData, id: string) => {
  const o = scene.objects.find((x) => x.id === id);
  if (!o) throw new Error(`no ${id}`);
  return { kind: "object" as const, object: o };
};
const exit = (scene: SceneData, to: string) => {
  const e = scene.exits.find((x) => x.to === to);
  if (!e) throw new Error(`no exit to ${to}`);
  return { kind: "exit" as const, exit: e };
};

describe("SceneEngine", () => {
  test("starts in the Hall at its start point", () => {
    const { engine } = setup();
    expect(engine.scene.id).toBe("hall");
    expect(engine.position).toMatchObject(SCENES.hall.entryPoints.start);
  });

  test("greets the visitor with the Hall's entry line, once", () => {
    const { engine } = setup();
    expect(engine.speech).toBeNull();
    engine.greet();
    expect(engine.speech?.lines.join(" ")).toBe(SCENES.hall.entryLine);
    engine.interrupt();
    engine.greet();
    expect(engine.speech).toBeNull();
  });

  test("doesn't greet over a trip that's already under way", () => {
    const { engine } = setup();
    engine.goToSection("skills");
    engine.greet();
    expect(engine.speech).toBeNull();
    runUntil(engine, () => engine.scene.id === "london");
    engine.greet();
    expect(engine.speech).toBeNull();
  });

  test("walks to a clicked floor point and faces the way it walks", () => {
    const { engine } = setup();
    engine.walkTo(300, 140);
    run(engine, 100);
    expect(engine.walking).toBe(true);
    expect(engine.position.facing).toBe("e");
    run(engine, 3000);
    expect(engine.walking).toBe(false);
    expect(engine.position.x).toBeCloseTo(300);
  });

  test("clamps a click on the wall to the walkbox", () => {
    const { engine } = setup();
    engine.walkTo(160, 20);
    run(engine, 3000);
    expect(engine.position.y).toBeCloseTo(SCENES.hall.walkbox[0][1]);
  });

  test("look turns and talks without walking", () => {
    const { engine } = setup();
    const before = engine.position;
    engine.look(object(SCENES.hall, "seats"));
    expect(engine.speech?.lines.join(" ")).toContain("Airport seating");
    run(engine, 100);
    expect(engine.position.x).toBe(before.x);
  });

  test("using a primary object walks there and opens its section", () => {
    const { engine, host } = setup("zurich");
    engine.activate(object(SCENES.zurich, "cabinet"));
    runUntil(engine, () => host.openSection.mock.calls.length > 0);
    expect(host.openSection).toHaveBeenCalledWith("resume");
    const ip = SCENES.zurich.objects.find(
      (o) => o.id === "cabinet",
    )?.interactionPoint;
    expect(engine.position).toMatchObject({
      x: ip?.x,
      y: ip?.y,
      facing: ip?.facing,
    });
  });

  test("an object with an open state opens while its content shows", () => {
    const cabinet = SCENES.zurich.objects.find((o) => o.id === "cabinet");
    if (!cabinet) throw new Error("no cabinet");
    const scenes = {
      ...SCENES,
      zurich: {
        ...SCENES.zurich,
        objects: [
          { ...cabinet, states: { open: "cabinet-open.png" } },
          ...SCENES.zurich.objects.filter((o) => o !== cabinet),
        ],
      },
    };
    const host = { openSection: vi.fn(), sceneChanged: vi.fn() };
    const engine = new SceneEngine({
      scenes,
      travelMap: TRAVEL_MAP_DATA,
      sheet: CHARACTER_SHEET,
      host,
      start: "zurich",
    });
    engine.goToSection("resume");
    runUntil(engine, () => host.openSection.mock.calls.length > 0);
    expect(engine.stateOf("cabinet")).toBe("open");
    engine.contentClosed();
    expect(engine.stateOf("cabinet")).toBeUndefined();
  });

  test("a Hall gate plays the travel map, then enters the country", () => {
    const { engine, host } = setup();
    engine.activate(exit(SCENES.hall, "london"));
    runUntil(engine, () => engine.transition?.kind === "map");
    expect(engine.transition).toMatchObject({ kind: "map", to: "london" });
    runUntil(engine, () => engine.scene.id === "london");
    expect(host.sceneChanged).toHaveBeenCalledWith("london");
    expect(engine.position).toMatchObject(SCENES.london.entryPoints.fromHall);
    // First arrival names the section and its object.
    expect(engine.speech?.lines.join(" ")).toContain("chalkboard");
  });

  test("a click skips the travel map", () => {
    const { engine } = setup();
    engine.activate(exit(SCENES.hall, "sorrento"));
    runUntil(engine, () => engine.transition?.kind === "map");
    engine.walkTo(10, 150);
    expect(engine.scene.id).toBe("sorrento");
  });

  test("a country door irises back to the Hall at the matching entry", () => {
    const { engine } = setup("zurich");
    engine.activate(exit(SCENES.zurich, "hall"));
    runUntil(engine, () => engine.transition?.kind === "iris");
    expect(engine.transition?.kind).toBe("iris");
    runUntil(engine, () => engine.scene.id === "hall");
    expect(engine.position).toMatchObject(SCENES.hall.entryPoints.fromZurich);
  });

  describe("section shortcuts", () => {
    test("in the same scene: a fast walk, then the content", () => {
      const { engine, host } = setup("sorrento");
      engine.goToSection("contact");
      const t = runUntil(engine, () => host.openSection.mock.calls.length > 0);
      expect(host.openSection).toHaveBeenCalledWith("contact");
      expect(t).toBeLessThanOrEqual(1500 + 400);
    });

    test("from the Hall: walk to the gate, fly, open on arrival", () => {
      const { engine, host } = setup();
      engine.goToSection("skills");
      const walk = runUntil(engine, () => engine.transition?.kind === "map");
      expect(walk).toBeLessThanOrEqual(1500 + 50);
      expect(engine.transition).toMatchObject({ kind: "map", to: "london" });
      runUntil(engine, () => host.openSection.mock.calls.length > 0);
      expect(engine.scene.id).toBe("london");
      expect(host.openSection).toHaveBeenCalledWith("skills");
    });

    test("country to country leaves through the Hall door and flies from there", () => {
      const { engine, host } = setup("london");
      engine.goToSection("experience");
      runUntil(engine, () => engine.transition?.kind === "map");
      const tr = engine.transition;
      expect(tr?.kind === "map" && tr.route.a).toEqual(
        TRAVEL_MAP_DATA.markers.london,
      );
      runUntil(engine, () => host.openSection.mock.calls.length > 0);
      expect(engine.scene.id).toBe("zurich");
      expect(host.openSection).toHaveBeenCalledWith("experience");
    });

    test("a click during the trip skips straight to the content", () => {
      const { engine, host } = setup();
      engine.goToSection("about");
      run(engine, 200);
      engine.walkTo(10, 150);
      expect(engine.scene.id).toBe("sorrento");
      run(engine, 200);
      expect(host.openSection).toHaveBeenCalledWith("about");
      expect(host.openSection).toHaveBeenCalledTimes(1);
    });

    test("never takes more than walk + map + a moment", () => {
      const { engine, host } = setup("sorrento");
      engine.goToSection("skills");
      const t = runUntil(engine, () => host.openSection.mock.calls.length > 0);
      expect(t).toBeLessThanOrEqual(1500 + 1500 + 250 + 400);
    });
  });

  test("travelTo reaches the Hall from a country", () => {
    const { engine } = setup("sorrento");
    engine.travelTo("hall");
    runUntil(engine, () => engine.scene.id === "hall");
    expect(engine.position).toMatchObject(SCENES.hall.entryPoints.fromSorrento);
  });

  test("travel map origin is the last country visited", () => {
    const { engine } = setup("london");
    engine.travelTo("hall");
    runUntil(engine, () => engine.scene.id === "hall" && !engine.transition);
    engine.travelTo("zurich");
    runUntil(engine, () => engine.transition?.kind === "map");
    const tr = engine.transition;
    expect(tr?.kind === "map" && tr.route.a).toEqual(
      TRAVEL_MAP_DATA.markers.london,
    );
  });

  test("keyboard walking stays inside the walkbox", () => {
    const { engine } = setup();
    engine.setKeyboard(0, 1);
    run(engine, 3000);
    engine.setKeyboard(0, 0);
    const maxY = Math.max(...SCENES.hall.walkbox.map((p) => p[1]));
    expect(engine.position.y).toBeLessThanOrEqual(maxY);
    expect(engine.position.facing).toBe("s");
  });

  test("plays footsteps on the scene's floor", () => {
    const { engine, host } = setup("sorrento");
    engine.walkTo(20, 140);
    run(engine, 2000);
    expect(host.sound).toHaveBeenCalledWith("footstep-tile");
  });

  describe("object and animation sounds", () => {
    /** Sorrento with a sounding phone, moka pot, and a timed animation. */
    const withSounds = (): typeof SCENES => {
      const sorrento = SCENES.sorrento;
      return {
        ...SCENES,
        sorrento: {
          ...sorrento,
          objects: [
            ...sorrento.objects.map((o) =>
              o.id === "phone" ? { ...o, sound: "phone-ring" as const } : o,
            ),
            {
              id: "moka",
              name: "moka pot",
              hotspot: { x: 100, y: 60, w: 10, h: 12 },
              look: "A moka pot.",
              use: "Blub blub.",
              sound: "moka-gurgle",
            },
          ],
          animations: [
            {
              id: "steam",
              strip: "anim.png",
              frames: 2,
              x: 100,
              y: 50,
              frameMs: 200,
              everyMs: 1000,
              sound: "split-flap",
            },
          ],
        },
      };
    };

    test("a flavour object plays its sound when used", () => {
      const { engine, host } = setup("sorrento", withSounds());
      engine.activate(object(engine.scene, "moka"));
      expect(host.sound).toHaveBeenCalledWith("moka-gurgle");
      expect(engine.speech?.lines.join(" ")).toContain("Blub");
    });

    test("looking doesn't play it", () => {
      const { engine, host } = setup("sorrento", withSounds());
      engine.look(object(engine.scene, "moka"));
      expect(host.sound).not.toHaveBeenCalledWith("moka-gurgle");
    });

    test("a primary object's sound replaces the UI blip", () => {
      const { engine, host } = setup("sorrento", withSounds());
      engine.activate(object(engine.scene, "phone"));
      runUntil(engine, () => host.openSection.mock.calls.length > 0);
      expect(host.openSection).toHaveBeenCalledWith("contact");
      expect(host.sound).toHaveBeenCalledWith("phone-ring");
      expect(host.sound).not.toHaveBeenCalledWith("ui-blip");
    });

    test("the toolbar shortcut plays it too", () => {
      const { engine, host } = setup("sorrento", withSounds());
      engine.goToSection("contact");
      runUntil(engine, () => host.openSection.mock.calls.length > 0);
      expect(host.sound).toHaveBeenCalledWith("phone-ring");
    });

    test("an animation plays its sound once per cycle", () => {
      const { engine, host } = setup("sorrento", withSounds());
      run(engine, 2500);
      const plays = host.sound.mock.calls.filter(
        ([name]) => name === "split-flap",
      );
      expect(plays).toHaveLength(2);
    });

    test("only the current scene's animations sound", () => {
      const { engine, host } = setup("hall", withSounds());
      run(engine, 3000);
      expect(host.sound).not.toHaveBeenCalledWith("split-flap");
    });
  });
});
