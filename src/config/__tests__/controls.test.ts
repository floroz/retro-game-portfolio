import { afterEach, expect, test, vi } from "vitest";
import {
  CONTROLS_SEEN_KEY,
  hasSeenControls,
  rememberControls,
} from "../controls";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

test("only confirmed instructions are remembered", () => {
  expect(hasSeenControls()).toBe(false);
  localStorage.setItem(CONTROLS_SEEN_KEY, "unknown");
  expect(hasSeenControls()).toBe(false);
  rememberControls();
  expect(hasSeenControls()).toBe(true);
});

test("blocked storage shows instructions and never blocks confirmation", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(hasSeenControls()).toBe(false);
  expect(() => rememberControls()).not.toThrow();
});
