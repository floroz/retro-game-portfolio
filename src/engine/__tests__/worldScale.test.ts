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

/** Scenes rebuilt from the Phase H layers (the HB tasks). */
const HD_SCENES = ["zurich"];

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

  test("the rebuilt scenes use the world scale", () => {
    for (const id of HD_SCENES) {
      const { depth } = SCENES[id as keyof typeof SCENES];
      expect(depth.farHeight).toBe(HD_WORLD_SCALE.farHeight);
      expect(depth.nearHeight).toBe(HD_WORLD_SCALE.nearHeight);
      expect(depth.farScale).toBeUndefined();
    }
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
