import { describe, expect, test } from "vitest";
import { HALL_FLIGHT_BOARD } from "../../config/scenes/flight-board";
import { splitFlapCells, splitFlapCycleStarted } from "../splitFlap";

const board = HALL_FLIGHT_BOARD;
const textAt = (now: number, reduced = false) =>
  splitFlapCells(board, now, reduced).map((row) =>
    row.map((cell) => cell.from).join(""),
  );

describe("airport split-flap timetable", () => {
  test("keeps the complete initial timetable still until five seconds", () => {
    expect(textAt(0)).toEqual([
      "PARIS    1209:20",
      "ROME     1709:45",
      "MADRID   2410:10",
      "BERLIN   1410:30",
      "ATHENS   2210:55",
      "VIENNA   3111:20",
    ]);
    expect(splitFlapCells(board, 4999)).toEqual(splitFlapCells(board, 0));
  });

  test("folds changed character halves and leaves the other five rows still", () => {
    const initial = splitFlapCells(board, 0);
    const folding = splitFlapCells(board, 5100);
    expect(folding[0][0].progress).toBeGreaterThan(0);
    expect(folding[0][0].progress).toBeLessThan(1);
    expect(folding.slice(1)).toEqual(initial.slice(1));
    // The colon occupies its own tile, but does not change with a new time.
    expect(folding[0][13]).toEqual(initial[0][13]);
    expect(textAt(6100)[0]).toBe("LISBON   1609:35");
    expect(
      splitFlapCells(board, 6100)[0].every((cell) => cell.progress === -1),
    ).toBe(true);
  });

  test("takes turns across arrivals and departures at five-second boundaries", () => {
    const first = textAt(6100);
    const second = textAt(11100);
    expect(second[0]).toBe(first[0]);
    expect(second[4]).toBe("MILAN    2611:15");
    expect(second.filter((row, i) => row !== first[i])).toHaveLength(1);
    expect(textAt(36100)[0]).toBe("PARIS    1209:20");
  });

  test("reconstructs long-running state without replaying a history", () => {
    expect(splitFlapCells(board, 60_006_100)).toEqual(
      splitFlapCells(board, 6100),
    );
  });

  test("reduced motion holds all destinations, gates and times still", () => {
    expect(splitFlapCells(board, 16100, true)).toEqual(
      splitFlapCells(board, 0),
    );
  });

  test("starts one sound per update, including an exact boundary", () => {
    expect(splitFlapCycleStarted(board, 0, 4999)).toBe(false);
    expect(splitFlapCycleStarted(board, 4999, 5000)).toBe(true);
    expect(splitFlapCycleStarted(board, 5000, 5100)).toBe(false);
  });
});
