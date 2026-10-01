import { describe, expect, test } from "vitest";
import { paginateInspection } from "../inspectionPagination";

describe("inspection pagination", () => {
  test("preserves leading whitespace and every character across page breaks", () => {
    const text = "  alpha beta gamma delta";
    const pages = paginateInspection(
      [{ title: "Story", paragraphs: [text] }],
      20,
      (page) => page.paragraphs.join("").length <= 10,
    );
    expect(pages.flatMap((page) => page.paragraphs).join("")).toBe(text);
  });

  test("retains a long link's full label and destination across pages", () => {
    const label = "averylongunbrokenidentifier";
    const href = "https://example.com/story";
    const pages = paginateInspection(
      [{ title: "Story", paragraphs: [], links: [{ label, href }] }],
      20,
      (page) => (page.links?.[0]?.label.length ?? 0) <= 10,
    );
    expect(
      pages
        .flatMap((page) => page.links ?? [])
        .map((link) => link.label)
        .join(""),
    ).toBe(label);
    expect(pages.every((page) => page.links?.[0]?.href === href)).toBe(true);
  });
});
