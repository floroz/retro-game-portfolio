import { beforeEach, describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { Toolbar } from "../Toolbar";
import { useGameStore } from "../../../store/gameStore";
import { DIALOG_TREE } from "../../../config/dialogTrees";
import { offGridPixels } from "../../../test/helpers/canvas";

const initial = useGameStore.getState();

/** The controls panel at its real size: 1280x160 under the scene. */
function Panel() {
  return (
    <div style={{ width: 1280, height: 160, position: "relative" }}>
      <Toolbar />
    </div>
  );
}

/** A conversation at `node`, with Daniele done saying its line. */
async function talkAt(node: string, ready = true) {
  useGameStore.setState({
    dialogOpen: true,
    dialogNode: node,
    dialogReady: ready,
  });
  // Wait for the panel to show this node, with or without its choices.
  const shown = ready ? (DIALOG_TREE[node].options?.length ?? 1) : 0;
  await expect
    .poll(() => ({
      line: document.querySelector('[data-e2e="dialogue-line"]')?.textContent,
      choices: document.querySelectorAll('[data-e2e="dialog-option"]').length,
    }))
    .toEqual({ line: `Daniele: ${DIALOG_TREE[node].text}`, choices: shown });
}

const choices = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLButtonElement>(
    '[data-e2e="dialog-option"]',
  ),
];

beforeEach(async () => {
  useGameStore.setState(
    { ...initial, welcomeShown: true, visitedNodes: new Set() },
    true,
  );
  // Wide enough for the panel to be on screen, so a click can land.
  await page.viewport(1300, 900);
});

describe("Toolbar: dialogue choices", () => {
  test("the choices take the trunk's place, and the trunk comes back", async () => {
    const { container } = await render(<Panel />);
    await expect
      .element(page.getByRole("button", { name: "Skills, in London" }))
      .toBeVisible();

    await talkAt("intro-2");
    expect(container.querySelector('[data-e2e="toolbar-ticket"]')).toBeNull();
    expect(container.querySelector('[data-e2e="adventure-dialog"]')).not.toBe(
      null,
    );

    useGameStore.getState().closeDialog();
    await expect
      .element(page.getByRole("button", { name: "Skills, in London" }))
      .toBeVisible();
    expect(container.querySelector('[data-e2e="adventure-dialog"]')).toBeNull();
  });

  test("no choices while Daniele is still talking, only his line for screen readers", async () => {
    const { container } = await render(<Panel />);
    await talkAt("intro", false);
    expect(choices(container)).toHaveLength(0);
    await expect
      .element(page.getByText(`Daniele: ${DIALOG_TREE.intro.text}`))
      .toBeInTheDocument();
  });

  test("every option of a node is a labelled button, in order", async () => {
    const { container } = await render(<Panel />);
    await talkAt("intro-2");
    const expected = DIALOG_TREE["intro-2"].options!.map((o) => o.label);
    expect(choices(container).map((b) => b.textContent)).toEqual(expected);
    for (const label of expected) {
      await expect
        .element(page.getByRole("button", { name: label }))
        .toBeVisible();
    }
  });

  test("clicking a choice goes where it always did", async () => {
    await render(<Panel />);
    await talkAt("intro-2");
    await page
      .getByRole("button", { name: "Are you available for hire?" })
      .click();
    const state = useGameStore.getState();
    expect(state.dialogNode).toBe("hire-info");
    // The next line has to be said before its choices come up.
    expect(state.dialogReady).toBe(false);
  });

  test("a closing choice ends the conversation", async () => {
    await render(<Panel />);
    await talkAt("bye");
    await page.getByRole("button", { name: "[Close dialog]" }).click();
    expect(useGameStore.getState().dialogOpen).toBe(false);
  });

  test("the pointer lights the choice under it", async () => {
    const { container } = await render(<Panel />);
    await talkAt("intro-2");
    const canvas = container.querySelector("canvas")!;
    const before = canvas.toDataURL();
    await userEvent.hover(choices(container)[1]);
    await expect.poll(() => canvas.toDataURL()).not.toBe(before);
    await userEvent.unhover(choices(container)[1]);
    await expect.poll(() => canvas.toDataURL()).toBe(before);
  });

  test("Down and Up move between choices, wrapping", async () => {
    const { container } = await render(<Panel />);
    await talkAt("intro-2");
    const list = choices(container);
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(list[0]);
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(list[1]);
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(document.activeElement).toBe(list[list.length - 1]);
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(list[0]);
  });

  test("Enter chooses the focused choice", async () => {
    const { container } = await render(<Panel />);
    await talkAt("intro-2");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(useGameStore.getState().dialogNode).toBe("work-intro");
    expect(choices(container)).toHaveLength(0);
  });

  test("Enter on a lone Continue... just continues", async () => {
    await render(<Panel />);
    await talkAt("intro");
    await userEvent.keyboard("{Enter}");
    expect(useGameStore.getState().dialogNode).toBe("intro-2");
  });

  test("Enter with several choices and none lit lights the first, not chooses", async () => {
    await render(<Panel />);
    await talkAt("intro-2");
    await userEvent.keyboard("{Enter}");
    expect(useGameStore.getState().dialogNode).toBe("intro-2");
    expect(document.activeElement?.textContent).toBe(
      DIALOG_TREE["intro-2"].options![0].label,
    );
  });

  test("number keys choose outright", async () => {
    await render(<Panel />);
    await talkAt("intro-2");
    await userEvent.keyboard("4");
    expect(useGameStore.getState().dialogNode).toBe("bye");
  });

  test("Escape leaves, while Daniele talks or after", async () => {
    await render(<Panel />);
    await talkAt("intro", false);
    await userEvent.keyboard("{Escape}");
    expect(useGameStore.getState().dialogOpen).toBe(false);

    await talkAt("intro-2");
    await userEvent.keyboard("{Escape}");
    expect(useGameStore.getState().dialogOpen).toBe(false);
  });

  test("leaving with a key puts the keyboard back on Talk; after a click it stays put", async () => {
    await render(<Panel />);
    await talkAt("intro-2");
    await userEvent.keyboard("{Escape}");
    await expect
      .poll(() => document.activeElement?.getAttribute("aria-label"))
      .toBe("Talk to Daniele");

    await talkAt("bye");
    await page.getByRole("button", { name: "[Close dialog]" }).click();
    await expect
      .element(page.getByRole("button", { name: "Skills, in London" }))
      .toBeVisible();
    expect(document.activeElement).toBe(document.body);
  });

  test("keys are left alone while typing in a field", async () => {
    const { container } = await render(
      <>
        <input aria-label="terminal" />
        <Panel />
      </>,
    );
    await talkAt("intro-2");
    await userEvent.click(page.getByRole("textbox", { name: "terminal" }));
    await userEvent.keyboard("4{Escape}");
    expect(useGameStore.getState().dialogOpen).toBe(true);
    expect(useGameStore.getState().dialogNode).toBe("intro-2");
    expect(choices(container)).toHaveLength(4);
  });

  test("the page preserves its dimensions with smooth adventure lettering", async () => {
    const { container } = await render(<Panel />);
    for (const node of ["intro-2", "hire-info", "bye"]) {
      await talkAt(node);
      const canvas = container.querySelector("canvas")!;
      expect([canvas.width, canvas.height]).toEqual([1280, 160]);
      expect(offGridPixels(canvas), node).toBeGreaterThan(0);
    }
    await talkAt("intro", false);
    expect(offGridPixels(container.querySelector("canvas")!)).toBeGreaterThan(
      0,
    );
  });
});
