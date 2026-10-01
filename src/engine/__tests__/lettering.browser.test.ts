import { describe, expect, test, vi } from "vitest";
import { capHeight, measureText, type TextStyle } from "../font";
import { paintLettering } from "../lettering";

function canvasContext() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  return ctx;
}

describe("remastered inline lettering", () => {
  test("keeps surrounding words native and icon slots in their original positions", () => {
    const ctx = canvasContext();
    const words = vi.spyOn(ctx, "fillText");
    const icons = vi.spyOn(ctx, "drawImage");
    const positions = vi.spyOn(ctx, "translate");
    const style: TextStyle = { font: "regular", color: "#fff", tracking: 1 };
    const text = "Read {skills} then {resume} here";
    paintLettering({ ctx, scale: 4 }, text, 10, 5, style);

    expect(words.mock.calls.map(([word]) => word)).toEqual([
      "Read ",
      " then ",
      " here",
    ]);
    expect(icons).toHaveBeenCalledTimes(2);
    expect(positions.mock.calls).toEqual([
      [10, 5 + capHeight("regular")],
      [
        10 + measureText("Read {skills}", "regular", 1),
        5 + capHeight("regular"),
      ],
      [
        10 + measureText("Read {skills} then {resume}", "regular", 1),
        5 + capHeight("regular"),
      ],
    ]);
    // The bitmap icon has the same 1.5 logical-pixel inset in its backing
    // canvas as standalone original text. Its placement includes the tracking
    // before the token, never the length of the literal braces and name.
    const iconLeft =
      10 +
      measureText("Read {skills}", "regular", 1) -
      measureText("{skills}", "regular", 1);
    expect(icons.mock.calls[0][1]).toBe((iconLeft - 1.5) * 4);
  });

  test("supports adjacent case-insensitive tokens and retains plain braces as text", () => {
    const ctx = canvasContext();
    const words = vi.spyOn(ctx, "fillText");
    const icons = vi.spyOn(ctx, "drawImage");
    const layer = { ctx, scale: 4 };
    const style: TextStyle = { font: "small", color: "#fff" };
    paintLettering(layer, "{SKILLS}{resume} Go", 0, 0, style);
    expect(icons).toHaveBeenCalledTimes(2);
    expect(words).toHaveBeenLastCalledWith(" GO", 0, 0);
    paintLettering(layer, "Use {braces}", 0, 0, style);
    expect(words).toHaveBeenLastCalledWith("USE {BRACES}", 0, 0);
    expect(icons).toHaveBeenCalledTimes(2);
  });
});
