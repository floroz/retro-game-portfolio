import { describe, expect, test } from "vitest";
import { DIALOG_TREE } from "../dialogTrees";
import { SPEECH_WIDTH } from "../../engine/constants";
import { measureText, unknownChars, wrapText } from "../../engine/font";
import { CHOICES_PAGE } from "../../components/toolbar/layout";

const nodes = Object.entries(DIALOG_TREE);
const options = nodes.flatMap(([id, node]) =>
  (node.options ?? []).map((option) => ({ from: id, option })),
);

/** Every node reachable from `start` by choosing options. */
function reachable(start: string): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const id = queue.pop()!;
    if (seen.has(id) || id === "__close__") continue;
    seen.add(id);
    for (const option of DIALOG_TREE[id]?.options ?? []) {
      queue.push(option.nextNode);
    }
  }
  return seen;
}

describe("dialogue trees", () => {
  test("every option leads to a node, or closes the conversation", () => {
    for (const { from, option } of options) {
      expect(
        option.nextNode === "__close__" || option.nextNode in DIALOG_TREE,
        `${from} → ${option.id} → ${option.nextNode}`,
      ).toBe(true);
    }
  });

  test("every node has a way on or out", () => {
    for (const [id, node] of nodes) {
      expect(node.options?.length, id).toBeGreaterThan(0);
    }
  });

  test("the intro reaches every branch", () => {
    const seen = reachable("intro");
    for (const id of [
      "about-intro",
      "about-hobbies",
      "about-games",
      "about-philosophy",
      "work-stack",
      "work-projects-2",
      "work-experience-2",
      "hire-contact",
      "hire-remote",
      "bye",
    ]) {
      expect(seen.has(id), id).toBe(true);
    }
  });

  test("the conversation can end from the intro", () => {
    const closes = options.filter(
      ({ from, option }) =>
        option.nextNode === "__close__" && reachable("intro").has(from),
    );
    expect(closes.length).toBeGreaterThan(0);
  });

  test("at most four choices, so they fit the trunk's page", () => {
    for (const [id, node] of nodes) {
      expect(node.options?.length ?? 0, id).toBeLessThanOrEqual(4);
    }
  });

  test("the bitmap font draws every line and every choice", () => {
    for (const [id, node] of nodes) {
      expect(unknownChars(node.text), id).toEqual([]);
      for (const option of node.options ?? []) {
        expect(unknownChars(option.label), `${id}/${option.id}`).toEqual([]);
      }
    }
  });

  test("every spoken line wraps to four lines or fewer over Daniele's head", () => {
    for (const [id, node] of nodes) {
      expect(
        wrapText(node.text, SPEECH_WIDTH).length,
        `${id}: ${node.text}`,
      ).toBeLessThanOrEqual(4);
    }
  });

  test("every choice fits the trunk's page on one line", () => {
    // 14 art px in from the page's edge, as painted, and out to the hint.
    const room = (CHOICES_PAGE.w - 28) / 2;
    for (const [id, node] of nodes) {
      for (const option of node.options ?? []) {
        expect(
          measureText(option.label, "regular"),
          `${id}/${option.id}`,
        ).toBeLessThan(room);
      }
    }
  });
});
