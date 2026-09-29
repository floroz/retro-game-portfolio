import { describe, expect, test } from "vitest";
import { PROFILE } from "../../config/profile";
import { slotSpriteIds } from "../assets";
import { SCENES } from "../scenes";
import { entriesFor, fillSlotRow, type SlotEntry } from "../slots";
import type { SlotRow } from "../types";

const COUNTRIES = ["london", "switzerland", "italy"];

const row = (positions: number): SlotRow => ({
  id: "row",
  kind: "photo-frame",
  source: "jobs:switzerland",
  positions: Array.from({ length: positions }, (_, i) => [i * 10, 0] as const),
  fold: "slot-photo-frame-more",
});

const entries = (n: number): SlotEntry[] =>
  Array.from({ length: n }, (_, i) => ({
    key: `job:${i}`,
    name: `Job ${i}`,
    look: `Job ${i}`,
  }));

describe("slot rows (docs/expansion-plan.md, Extensibility)", () => {
  test("every job has a country", () => {
    for (const job of PROFILE.workExperience) {
      expect(COUNTRIES, job.company).toContain(job.country);
    }
  });

  test("jobs are mapped to the agreed countries", () => {
    const byCountry = (c: string) =>
      PROFILE.workExperience
        .filter((j) => j.country === c)
        .map((j) => j.company);
    expect(byCountry("london")).toEqual(["Tray.ai", "Past Frontend Roles"]);
    expect(byCountry("switzerland")).toEqual([
      "Snyk",
      "Frontiers",
      "Meta (Facebook)",
      "Tundra",
    ]);
  });

  test("every slot row fits its capacity, or folds into an existing sprite", () => {
    const sprites = slotSpriteIds();
    for (const scene of Object.values(SCENES)) {
      for (const slotRow of scene.slots ?? []) {
        const label = `${scene.id}/${slotRow.id}`;
        const capacity = slotRow.positions.length;
        const all = entriesFor(slotRow.source);
        const items = fillSlotRow(slotRow);
        expect(items.length, label).toBeLessThanOrEqual(capacity);
        expect(sprites, label).toContain(`slot-${slotRow.kind}`);
        if (all.length > capacity) {
          expect(sprites, `${label} fold`).toContain(slotRow.fold);
          expect(items.at(-1)?.fold, label).toBe(true);
        } else {
          expect(items.length, label).toBe(all.length);
        }
      }
    }
  });

  test("every skill group has a display label", () => {
    for (const group of Object.keys(PROFILE.skills)) {
      expect(PROFILE.skillGroupLabels).toHaveProperty(group);
    }
  });

  test("fills one slot per entry, in order", () => {
    const items = fillSlotRow(row(6), entries(4));
    expect(items.map((i) => i.name)).toEqual([
      "Job 0",
      "Job 1",
      "Job 2",
      "Job 3",
    ]);
    expect(items.map((i) => i.x)).toEqual([0, 10, 20, 30]);
    expect(items.every((i) => !i.fold && i.sprite === "slot-photo-frame")).toBe(
      true,
    );
  });

  test("a full row folds the oldest entries into the last slot", () => {
    const items = fillSlotRow(row(3), entries(5));
    expect(items).toHaveLength(3);
    expect(items.slice(0, 2).map((i) => i.name)).toEqual(["Job 0", "Job 1"]);
    const fold = items[2];
    expect(fold.fold).toBe(true);
    expect(fold.sprite).toBe("slot-photo-frame-more");
    expect(fold.x).toBe(20);
    // No list in the scene: the fold says how many, the content screen who.
    expect(fold.look).toContain("3 more");
    expect(fold.look).not.toContain("Job 2");
  });

  test("an exactly full row doesn't fold", () => {
    const items = fillSlotRow(row(3), entries(3));
    expect(items.some((i) => i.fold)).toBe(false);
  });

  test("an empty source leaves the row empty", () => {
    expect(entriesFor("jobs:italy")).toEqual([]);
  });
});
