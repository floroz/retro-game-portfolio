import { DIALOG_TREE } from "../../config/dialogTrees";
import { CHOICES_PAGE } from "../../components/toolbar/layout";
import { SPEECH_WIDTH } from "../constants";
import { describe, expect, test, vi } from "vitest";
import { capHeight, wrapText, type TextStyle } from "../font";
import {
  loadAdventureFont,
  measureLettering,
  paintLettering,
} from "../lettering";

function canvasContext() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  return ctx;
}

describe("remastered inline lettering", () => {
  test("keeps every dialogue choice and existing speech wrap within its available width", async () => {
    await loadAdventureFont();
    for (const node of Object.values(DIALOG_TREE)) {
      for (const option of node.options ?? []) {
        expect(measureLettering(option.label) * 2, option.label).toBeLessThan(
          CHOICES_PAGE.w - 46,
        );
      }
      for (const line of wrapText(node.text, SPEECH_WIDTH)) {
        expect(measureLettering(line), line).toBeLessThanOrEqual(SPEECH_WIDTH);
      }
    }
  });

  test("uses the loaded pixel face without horizontally stretching its glyphs", async () => {
    await loadAdventureFont();
    expect(
      [...document.fonts].some(
        (face) => face.family === "Pixel Operator" && face.status === "loaded",
      ),
    ).toBe(true);
    const ctx = canvasContext();
    const scale = vi.spyOn(ctx, "scale");
    let paintedFont = "";
    let width = 0;
    const fill = ctx.fillText.bind(ctx);
    vi.spyOn(ctx, "fillText").mockImplementation((text, x, y) => {
      paintedFont = ctx.font;
      width = ctx.measureText(text).width;
      fill(text, x, y);
    });
    const text = "Zürich — Tell me about yourself";
    paintLettering({ ctx, scale: 4 }, text, 5, 5, { color: "#fff" });
    expect(paintedFont).toContain("Pixel Operator");
    expect(scale).not.toHaveBeenCalled();
    expect(measureLettering(text)).toBeCloseTo(width, 4);
  });

  test("keeps words at native width and places icons at the matching advances", async () => {
    await loadAdventureFont();
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
        10 + measureLettering("Read {skills}", "regular"),
        5 + capHeight("regular"),
      ],
      [
        10 + measureLettering("Read {skills} then {resume}", "regular"),
        5 + capHeight("regular"),
      ],
    ]);
    // The icon keeps its bitmap inset and follows the native word advance.
    const iconLeft =
      10 +
      measureLettering("Read {skills}", "regular") -
      measureLettering("{skills}", "regular");
    expect(icons.mock.calls[0][1]).toBe(
      (Math.round(iconLeft * 2) / 2 - 1.5) * 4,
    );
  });

  test("supports adjacent case-insensitive tokens and retains plain braces as text", async () => {
    await loadAdventureFont();
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
