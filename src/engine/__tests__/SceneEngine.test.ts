import { describe, expect, test, vi } from "vitest";
import { CHARACTER_SHEET } from "../assets";
import { SceneEngine, interactablesFor, type EngineHost } from "../SceneEngine";
import { speechMs } from "../constants";
import { SCENES, TRAVEL_MAP_DATA } from "../scenes";
import type { SceneData, SectionId } from "../types";

function setup(
  start: "hall" | "london" | "zurich" | "sorrento" = "hall",
  scenes = SCENES,
) {
  const host = {
    openSection: vi.fn<(s: SectionId) => void>(),
    openInspection: vi.fn(),
    sceneChanged: vi.fn(),
    sound: vi.fn(),
    flightChanged: vi.fn(),
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
  test("clicking the open Zurich threshold returns to the airport", () => {
    const { engine } = setup("zurich");
    const hits = interactablesFor(SCENES.zurich, () => undefined);
    // The passage itself, where a visitor naturally clicks to leave.
    const hit = [...hits]
      .reverse()
      .find(
        ({ rect }) =>
          287 >= rect.x &&
          287 < rect.x + rect.w &&
          90 >= rect.y &&
          90 < rect.y + rect.h,
      );
    expect(hit?.target.kind).toBe("exit");
    if (!hit) throw new Error("The open threshold has no exit target");
    engine.activate(hit.target);
    runUntil(engine, () => engine.scene.id === "hall");
    expect(engine.scene.id).toBe("hall");
  });

  test("an optional object inspection opens after walking, without opening a section", () => {
    const { engine, host } = setup();
    const item = {
      ...SCENES.hall.objects.find((item) => item.id === "lost-and-found")!,
      inspection: {
        title: "Test inspection",
        paragraphs: ["A closer look."],
        art: "inspection.png",
        artAlt: "An example inspection",
      },
    };
    engine.activate({ kind: "object", object: item });
    runUntil(engine, () => host.openInspection.mock.calls.length > 0);
    expect(host.openInspection).toHaveBeenCalledWith(item.inspection);
    expect(host.openSection).not.toHaveBeenCalled();
    expect(engine.scene.id).toBe("hall");
    const position = { ...engine.position };
    engine.contentClosed();
    expect(engine.position).toEqual(position);
  });

  test.each([
    "lost-and-found",
    "lost-and-found-clerk",
    "service-bell",
    "unclaimed-trunk",
  ])("%s responds after walking without gating the portfolio", (id) => {
    const { engine, host } = setup();
    const target = object(SCENES.hall, id);
    engine.activate(target);
    runUntil(engine, () => engine.speech !== null);
    expect(engine.speech?.lines.join(" ")).toBe(target.object.use);
    expect(engine.position.x).toBeCloseTo(target.object.interactionPoint!.x, 0);
    expect(host.openSection).not.toHaveBeenCalled();
    expect(host.openInspection).not.toHaveBeenCalled();
    if (target.object.sound)
      expect(host.sound).toHaveBeenCalledWith(target.object.sound);
  });

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
    expect(engine.speech?.lines.join(" ")).toContain("armrest");
    run(engine, 100);
    expect(engine.position.x).toBe(before.x);
  });

  test("using a primary object walks there and opens its section", () => {
    const { engine, host } = setup("zurich");
    engine.activate(object(SCENES.zurich, "satchel"));
    runUntil(engine, () => host.openSection.mock.calls.length > 0);
    expect(host.openSection).toHaveBeenCalledWith("resume");
    const ip = SCENES.zurich.objects.find(
      (o) => o.id === "satchel",
    )?.interactionPoint;
    expect(engine.position).toMatchObject({
      x: ip?.x,
      y: ip?.y,
      facing: ip?.facing,
    });
  });

  test("an object with an open state opens while its content shows", () => {
    const satchel = SCENES.zurich.objects.find((o) => o.id === "satchel");
    if (!satchel) throw new Error("no satchel");
    const scenes = {
      ...SCENES,
      zurich: {
        ...SCENES.zurich,
        objects: [
          { ...satchel, states: { open: "satchel-open.png" } },
          ...SCENES.zurich.objects.filter((o) => o !== satchel),
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
    expect(engine.stateOf("satchel")).toBe("open");
    engine.contentClosed();
    expect(engine.stateOf("satchel")).toBeUndefined();
  });

  test("a Hall gate plays the travel map, then enters the country", () => {
    const { engine, host } = setup();
    engine.activate(exit(SCENES.hall, "london"));
    runUntil(engine, () => engine.transition?.kind === "map");
    expect(engine.transition).toMatchObject({ kind: "map", to: "london" });
    runUntil(engine, () => engine.scene.id === "london");
    expect(host.sceneChanged).toHaveBeenCalledWith("london");
    expect(engine.position).toMatchObject(SCENES.london.entryPoints.fromHall);
    // First arrival names the section.
    expect(engine.speech?.lines.join(" ")).toContain("Skills");
  });

  test("tells the host where the travel map is flying, then that it landed", () => {
    const { engine, host } = setup();
    engine.activate(exit(SCENES.hall, "zurich"));
    runUntil(engine, () => engine.transition?.kind === "map");
    engine.update(16);
    expect(host.flightChanged).toHaveBeenLastCalledWith("zurich");
    runUntil(engine, () => engine.scene.id === "zurich");
    engine.update(16);
    expect(host.flightChanged).toHaveBeenLastCalledWith(null);
    expect(host.flightChanged).toHaveBeenCalledTimes(2);
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

  test("the first flight takes off from the Hall's marked spot", () => {
    const { engine } = setup();
    engine.activate(exit(SCENES.hall, "zurich"));
    runUntil(engine, () => engine.transition?.kind === "map");
    const tr = engine.transition;
    expect(tr?.kind === "map" && tr.route).toMatchObject({
      from: "hall",
      a: TRAVEL_MAP_DATA.hall,
    });
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
    test("the airport board sounds every five seconds and stays silent with reduced motion", () => {
      const { engine, host } = setup();
      for (let t = 0; t < 15000; t += 100) engine.update(100);
      expect(
        host.sound.mock.calls.filter(([name]) => name === "split-flap"),
      ).toHaveLength(3);
      host.sound.mockClear();
      for (let t = 0; t < 10000; t += 100)
        engine.update(100, { reducedMotion: true });
      expect(host.sound).not.toHaveBeenCalledWith("split-flap");
    });
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

describe("SceneEngine: conversation lines", () => {
  const LINE = "Hey! Welcome to my portfolio.";

  function talk() {
    const { engine } = setup();
    const spoken = vi.fn();
    const left = vi.fn();
    engine.converse(LINE, spoken, left);
    return { engine, spoken, left };
  }

  test("Daniele talks while he says the line, then holds it", () => {
    const { engine, spoken } = talk();
    expect(engine.speech?.lines.join(" ")).toBe(LINE);
    run(engine, 200);
    expect(spoken).not.toHaveBeenCalled();

    run(engine, speechMs(LINE));
    expect(spoken).toHaveBeenCalledTimes(1);
    // The line stays up, and he's done talking.
    expect(engine.speech?.spoken).toBe(true);
    run(engine, 10000);
    expect(engine.speech?.lines.join(" ")).toBe(LINE);
    expect(spoken).toHaveBeenCalledTimes(1);
  });

  test("a click while he talks skips to the choices, and keeps the line", () => {
    const { engine, spoken, left } = talk();
    expect(engine.interrupt()).toBe(true);
    expect(spoken).toHaveBeenCalledTimes(1);
    expect(engine.speech?.spoken).toBe(true);
    expect(left).not.toHaveBeenCalled();
  });

  test("skipLine does the same, once", () => {
    const { engine, spoken } = talk();
    expect(engine.skipLine()).toBe(true);
    expect(engine.skipLine()).toBe(false);
    expect(spoken).toHaveBeenCalledTimes(1);
  });

  test("a click in the scene once the choices are up leaves the conversation", () => {
    const { engine, left } = talk();
    engine.skipLine();
    // The click isn't used up: the walk or the hotspot carries on.
    expect(engine.interrupt()).toBe(false);
    expect(left).toHaveBeenCalledTimes(1);
    expect(engine.speech).toBeNull();
  });

  test("endConversation takes down the line, and only a conversation's", () => {
    const { engine } = talk();
    engine.endConversation();
    expect(engine.speech).toBeNull();

    engine.greet();
    expect(engine.speech).not.toBeNull();
    engine.endConversation();
    expect(engine.speech).not.toBeNull();
  });

  test("the next line replaces the last", () => {
    const { engine, spoken } = talk();
    engine.skipLine();
    const next = vi.fn();
    engine.converse("Second line.", next, vi.fn());
    expect(engine.speech?.lines.join(" ")).toBe("Second line.");
    expect(engine.speech?.spoken).toBeUndefined();
    engine.skipLine();
    expect(next).toHaveBeenCalledTimes(1);
    expect(spoken).toHaveBeenCalledTimes(1);
  });
});
