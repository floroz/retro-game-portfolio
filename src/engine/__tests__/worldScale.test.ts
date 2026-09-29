import { describe, expect, test, vi } from "vitest";
import { CHARACTER_SHEET } from "../assets";
import { parseSheet } from "../character";
import { HD_WORLD_SCALE } from "../constants";
import { heightAt, scaleAt } from "../geometry";
import { SceneEngine } from "../SceneEngine";
import { SCENES, TRAVEL_MAP_DATA } from "../scenes";
import { sceneWarnings } from "../validate";
import type { SceneData } from "../types";
import sheetJson from "../../assets/character/daniele.json";

const HD_DEPTH = { farY: 100, nearY: 156, ...HD_WORLD_SCALE };

/** Scenes rebuilt from the Phase H layers (the HB tasks) at the shared world scale. */
const HD_SCENES = ["zurich", "sorrento", "hall", "london"];

/**
 * Rebuilt scenes whose plate is shot so much wider or deeper than the world
 * scale's that they have a perspective of their own, measured from the art.
 */
const OWN_PERSPECTIVE = ["hall", "london"];

describe("world scale", () => {
  test("the Phase H defaults are 58 px at the back and 72 at the front", () => {
    expect(heightAt(HD_DEPTH, 100, 72)).toBe(58);
    expect(heightAt(HD_DEPTH, 156, 72)).toBe(72);
    expect(heightAt(HD_DEPTH, 128, 72)).toBeCloseTo(65);
    // Clamped outside the range.
    expect(heightAt(HD_DEPTH, 20, 72)).toBe(58);
    expect(heightAt(HD_DEPTH, 159, 72)).toBe(72);
  });

  test("is a depth scale of 0.8 to 1.0 for the 72 px HD puppet", () => {
    expect(scaleAt(HD_DEPTH, 100, 72)).toBeCloseTo(0.806, 3);
    expect(scaleAt(HD_DEPTH, 156, 72)).toBe(1);
  });

  test("heights don't depend on the character: any figure is scaled to them", () => {
    // The 57.5 px pixel sprite, shown in an HD scene, grows to fit.
    expect(scaleAt(HD_DEPTH, 156, 57.5) * 57.5).toBeCloseTo(72);
    expect(scaleAt(HD_DEPTH, 100, 57.5) * 57.5).toBeCloseTo(58);
  });

  test("pixel scenes keep their scales of the character's own size", () => {
    const depth = { farY: 102, nearY: 158, farScale: 0.7, nearScale: 1 };
    expect(scaleAt(depth, 102, 57.5)).toBeCloseTo(0.7);
    expect(scaleAt(depth, 158, 57.5)).toBeCloseTo(1);
    expect(heightAt(depth, 158, 57.5)).toBeCloseTo(57.5);
    // Heights win over scales.
    expect(heightAt({ ...depth, ...HD_WORLD_SCALE }, 158, 57.5)).toBe(72);
  });

  test("scenes not yet rebuilt in Phase H keep their pixel-art scales", () => {
    for (const scene of Object.values(SCENES)) {
      if (HD_SCENES.includes(scene.id)) continue;
      expect(scene.depth.farScale).toBeDefined();
      expect(scene.depth.nearScale).toBeDefined();
      expect(scene.depth.farHeight).toBeUndefined();
    }
  });

  test("the rebuilt scenes use the world scale, unless they have their own", () => {
    for (const id of HD_SCENES) {
      if (OWN_PERSPECTIVE.includes(id)) continue;
      const { depth } = SCENES[id as keyof typeof SCENES];
      expect(depth.farHeight).toBe(HD_WORLD_SCALE.farHeight);
      expect(depth.nearHeight).toBe(HD_WORLD_SCALE.nearHeight);
      expect(depth.farScale).toBeUndefined();
    }
  });

  test("the HD Hall (HB2b) uses its own measured perspective over its whole floor", () => {
    const { depth, walkbox } = SCENES.hall;
    // Not the shared world scale.
    expect(depth.farHeight).not.toBe(HD_WORLD_SCALE.farHeight);
    expect(depth.nearHeight).not.toBe(HD_WORLD_SCALE.nearHeight);
    expect(depth.farScale).toBeUndefined();
    expect(depth.farHeight).toBe(34);
    expect(depth.nearHeight).toBe(64);
    const ys = walkbox.map((p) => p[1]);
    expect(depth.farY).toBe(Math.min(...ys));
    expect(depth.nearY).toBe(Math.max(...ys));

    // At the gates, about 0.85 of the 41 px doors (frame included).
    const DOOR = 41;
    const gate = heightAt(depth, 95, 72);
    expect(gate / DOOR).toBeGreaterThan(0.8);
    expect(gate / DOOR).toBeLessThan(0.9);
    // Beside the seats (27 px tall), they come up to about half of him.
    const SEATS = 27;
    const beside = heightAt(depth, 131, 72);
    expect(SEATS / beside).toBeGreaterThan(0.45);
    expect(SEATS / beside).toBeLessThan(0.58);
    // Between the arch's posts (y 114) he fits under its beam (44 px clear).
    expect(heightAt(depth, 114, 72)).toBeLessThanOrEqual(44.5);
    // And never bigger than the rig's own size.
    expect(scaleAt(depth, depth.nearY, 72)).toBeLessThanOrEqual(1);
  });

  test("London (HB3) uses its own measured perspective, close to the shared scale", () => {
    const { depth, walkbox } = SCENES.london;
    // Measured against the painted door, counter, table and fruit machine
    // (london.test.ts): not the shared world scale.
    expect(depth.farHeight).toBe(55);
    expect(depth.nearHeight).toBe(66);
    expect(depth.farScale).toBeUndefined();
    expect(depth.nearScale).toBeUndefined();
    const ys = walkbox.map((p) => p[1]);
    expect(depth.farY).toBe(Math.min(...ys));
    expect(depth.nearY).toBe(Math.max(...ys));
    // 0.76 to 0.92 of the 72 px rig: bigger at the front, never above it.
    expect(scaleAt(depth, depth.farY, 72)).toBeCloseTo(55 / 72, 3);
    expect(scaleAt(depth, depth.nearY, 72)).toBeCloseTo(66 / 72, 3);
  });

  test("the sprite sheet is 57.5 logical px tall, or what daniele.json says", () => {
    expect(CHARACTER_SHEET.figureHeight).toBe(57.5);
    const tall = parseSheet({ ...sheetJson, figureHeight: 120 }, "x.png");
    expect(tall.figureHeight).toBe(60);
  });

  test("the engine scales Daniele to the scene's world scale", () => {
    const engine = new SceneEngine({
      scenes: SCENES,
      travelMap: TRAVEL_MAP_DATA,
      sheet: CHARACTER_SHEET,
      host: { openSection: vi.fn(), sceneChanged: vi.fn() },
      start: "zurich",
    });
    // fromHall is at y 112, on a floor from y 101 to 158:
    // 58 + 14 * 11/57 = 60.7 px tall.
    expect(engine.position.y).toBe(112);
    expect(engine.scale * CHARACTER_SHEET.figureHeight).toBeCloseTo(60.7, 1);
  });

  test("the dev overlay warns about half a world scale", () => {
    const base = SCENES.zurich;
    const half: SceneData = {
      ...base,
      depth: { farY: 102, nearY: 158, nearHeight: 72 },
    };
    expect(sceneWarnings(half, SCENES)).toContain(
      "depth needs both farHeight and nearHeight",
    );
    expect(sceneWarnings(base, SCENES)).toEqual([]);
  });
});
