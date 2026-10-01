import { describe, expect, test } from "vitest";
import { paintOrder } from "../depth";

const names = (items: { name: string }[]) => items.map((i) => i.name);

describe("depth sorting by baselineY", () => {
  const desk = { name: "desk", y: 130 };
  const wall = { name: "photo", y: null };

  test("Daniele behind the desk: feet above its baseline", () => {
    const daniele = { name: "daniele", y: 120, actor: true };
    expect(names(paintOrder([desk, daniele, wall]))).toEqual([
      "photo",
      "daniele",
      "desk",
    ]);
  });

  test("Daniele in front of the desk: feet below its baseline", () => {
    const daniele = { name: "daniele", y: 140, actor: true };
    expect(names(paintOrder([daniele, desk, wall]))).toEqual([
      "photo",
      "desk",
      "daniele",
    ]);
  });

  test("Daniele wins a tie on the same line", () => {
    const daniele = { name: "daniele", y: 130, actor: true };
    expect(names(paintOrder([daniele, desk]))).toEqual(["desk", "daniele"]);
  });

  test("wall things keep their data order", () => {
    const a = { name: "a", y: null };
    const b = { name: "b", y: null };
    expect(names(paintOrder([b, a]))).toEqual(["b", "a"]);
  });
});
