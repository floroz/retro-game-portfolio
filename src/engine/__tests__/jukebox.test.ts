import { describe, expect, test } from "vitest";
import { LONDON_SCENE } from "../../config/scenes/london";
import { objectPulseScale } from "../animation";
import { effectShapes } from "../effects";

const jukebox = LONDON_SCENE.objects.find((object) => object.id === "jukebox")!;
const pulse = jukebox.pulse!;
const notes = LONDON_SCENE.effects!.find(
  (effect) => effect.id === "jukebox-notes",
)!;

describe("approved jukebox motion", () => {
  test("rests until five seconds, then pulses briefly every five seconds", () => {
    expect(pulse.everyMs).toBe(5000);
    for (const now of [0, 4900, 5000, 5667, 7500, 9999, 10000, 10667]) {
      expect(objectPulseScale(pulse, now), `rest at ${now}`).toBe(1);
    }
    const compressed = objectPulseScale(pulse, 5334);
    expect(compressed).toBeCloseTo(0.99, 4);
    expect(objectPulseScale(pulse, 10334)).toBeCloseTo(compressed, 10);
    expect(objectPulseScale(pulse, 15334)).toBeCloseTo(compressed, 10);
    expect((jukebox.y ?? 0) + pulse.anchorY).toBe(jukebox.baselineY);
  });

  test("the pulse remains within one percent and reduced motion holds it still", () => {
    for (let now = 0; now < 16000; now += 25) {
      expect(objectPulseScale(pulse, now)).toBeGreaterThanOrEqual(0.99);
      expect(objectPulseScale(pulse, now)).toBeLessThanOrEqual(1);
      expect(objectPulseScale(pulse, now, true)).toBe(1);
    }
    expect(effectShapes(notes, 5325, true)).toEqual([]);
  });

  test("two colored notes keep drifting during the jukebox's rests", () => {
    const at = (now: number) =>
      effectShapes(notes, now)
        .filter((shape) => shape.kind === "rect")
        .filter((shape) => shape.color !== "#2b1c18");
    const early = at(1000);
    const later = at(1250);
    expect(new Set(early.map((shape) => shape.color))).toEqual(
      new Set(["#e6c77c", "#a8c0a2"]),
    );
    expect(early.length).toBeGreaterThan(0);
    expect(later).toHaveLength(early.length);
    early.forEach((shape, i) => {
      expect(later[i].y).toBeLessThan(shape.y);
      expect(shape.alpha).toBeGreaterThan(0);
      expect(shape.alpha).toBeLessThanOrEqual(0.92);
    });
    for (let now = 0; now < 10000; now += 100) {
      for (const shape of at(now)) {
        expect(shape.x).toBeGreaterThan(284);
        expect(shape.x + shape.w).toBeLessThan(306);
        expect(shape.y).toBeGreaterThan(53);
        expect(shape.y + shape.h).toBeLessThan(79);
      }
    }
  });
});
