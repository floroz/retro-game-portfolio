import { describe, expect, test } from "vitest";
import { HALL_SCENE } from "../../config/scenes/hall";
import { idleRise } from "../animation";
import { propFrame } from "../effects";
import { paintOrder } from "../depth";

const walkers = HALL_SCENE.props!.filter((p) => p.id.startsWith("passenger-"));
const seated = HALL_SCENE.animations!;

describe("airport passengers", () => {
  test.each(walkers)(
    "$id enters and leaves offscreen, then waits before repeating",
    (p) => {
      const start = p.delayMs!;
      const first = propFrame(p, start)!;
      const last = propFrame(p, start + p.durationMs)!;
      const width = p.id === "passenger-family" ? 62 : 36;
      const offscreen = (x: number) => x >= 320 || x + width <= 0;
      expect(propFrame(p, start - 1)).toBeNull();
      expect(offscreen(first.x)).toBe(true);
      expect(offscreen(last.x)).toBe(true);
      expect(propFrame(p, start + p.durationMs + 1)).toBeNull();
      expect(propFrame(p, start + p.everyMs!)).toEqual(first);
      const middle = propFrame(p, start + p.durationMs / 2)!;
      expect(middle.x).toBeGreaterThan(0);
      expect(middle.x).toBeLessThan(320 - width);
      expect(middle.y).toBe(first.y);
      expect(middle.flip).toBe(last.x < first.x);
      expect(
        new Set(
          Array.from(
            { length: 4 },
            (_, i) => propFrame(p, start + i * p.frameMs!)!.frame,
          ),
        ).size,
      ).toBe(4);
    },
  );

  test("seated breathing is bounded and loops without a jump", () => {
    for (const seat of seated) {
      const idle = seat.idle!;
      expect(idleRise(seat, 0)).toBeCloseTo(idleRise(seat, idle.periodMs));
      const offsets = Array.from({ length: 40 }, (_, i) =>
        idleRise(seat, (i * idle.periodMs) / 40),
      );
      expect(Math.min(...offsets)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...offsets)).toBeLessThanOrEqual(0.5);
      expect(Math.max(...offsets) - Math.min(...offsets)).toBeGreaterThan(0.4);
    }
    expect(new Set(seated.map((s) => s.idle!.periodMs)).size).toBe(3);
  });

  test("chair backs hide the window passengers, the reader sits in front, and walkers pass in front of both", () => {
    const chair = HALL_SCENE.objects.find((o) => o.id === "seats")!;
    const items = [...seated, chair, ...walkers].map((item) => ({
      id: item.id,
      y: item.baselineY ?? null,
    }));
    const order = paintOrder(items).map((item) => item.id);
    for (const id of ["passenger-window-man", "passenger-window-woman"])
      expect(order.indexOf(id)).toBeLessThan(order.indexOf("seats"));
    expect(order.indexOf("passenger-reader")).toBeGreaterThan(
      order.indexOf("seats"),
    );
    for (const p of walkers)
      expect(order.indexOf(p.id)).toBeGreaterThan(
        order.indexOf("passenger-reader"),
      );
  });
});
