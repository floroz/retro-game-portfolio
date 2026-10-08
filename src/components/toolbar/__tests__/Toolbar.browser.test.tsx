import { beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { Toolbar } from "../Toolbar";
import { useGameStore } from "../../../store/gameStore";
import { PROFILE } from "../../../config/profile";
import type { SectionId } from "../../../engine/types";

const initial = useGameStore.getState();

/** The toolbar at its real size: 1280x160 under the scene. */
function Panel({ onShowControls }: { onShowControls?: () => void } = {}) {
  return (
    <div style={{ width: 1280, height: 160, position: "relative" }}>
      <Toolbar onShowControls={onShowControls} />
    </div>
  );
}

const sectionButton = (container: HTMLElement, section: SectionId) =>
  container.querySelector<HTMLButtonElement>(
    `[data-e2e="toolbar-button"][data-section="${section}"]`,
  )!;

const status = (container: HTMLElement) =>
  container.querySelector('[data-e2e="toolbar-status"]')?.textContent;

beforeEach(() => {
  useGameStore.setState(
    { ...initial, welcomeShown: true, visitedNodes: new Set() },
    true,
  );
});

describe("Toolbar: the travel trunk", () => {
  test("every section is a labelled button naming its city", async () => {
    await render(<Panel />);
    for (const [name, city] of [
      ["Experience", "Zürich"],
      ["Skills", "London"],
      ["About", "Sorrento"],
      ["Contact", "Sorrento"],
      ["Resume", "Zürich"],
    ]) {
      await expect
        .element(page.getByRole("button", { name: `${name}, in ${city}` }))
        .toBeVisible();
    }
  });

  test("sections are grouped on their city's ticket", async () => {
    await render(<Panel />);
    const zurich = page.getByRole("group", { name: "Zürich" });
    await expect
      .element(zurich.getByRole("button", { name: /Experience/ }))
      .toBeVisible();
    await expect
      .element(zurich.getByRole("button", { name: /Resume/ }))
      .toBeVisible();
    const london = page.getByRole("group", { name: "London" });
    await expect
      .element(london.getByRole("button", { name: /Skills/ }))
      .toBeVisible();
  });

  test("one click opens every section without leaving the current scene", async () => {
    useGameStore.setState({ currentScene: "sorrento" });
    const { container } = await render(<Panel />);
    for (const section of [
      "experience",
      "skills",
      "about",
      "contact",
      "resume",
    ] as SectionId[]) {
      await userEvent.click(sectionButton(container, section));
      expect(useGameStore.getState()).toMatchObject({
        contentSection: section,
        inspection: null,
        currentScene: "sorrento",
        dialogOpen: false,
      });
      useGameStore.getState().closeContent();
    }
  });

  test("a click is ignored while content is open", async () => {
    useGameStore.setState({ contentSection: "skills" });
    const { container } = await render(<Panel />);
    await userEvent.click(sectionButton(container, "about"));
    expect(useGameStore.getState().contentSection).toBe("skills");
  });

  test("the current city's ticket and sections say you are here", async () => {
    useGameStore.setState({ currentScene: "zurich" });
    await render(<Panel />);
    await expect
      .element(page.getByRole("group", { name: "Zürich (you are here)" }))
      .toBeInTheDocument();
    await expect
      .element(
        page.getByRole("button", { name: "Resume, in Zürich (you are here)" }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Skills, in London" }))
      .toBeVisible();
  });

  test("in the Hall no ticket is stamped; in flight the destination is", async () => {
    const { container } = await render(<Panel />);
    const here = () =>
      [
        ...container.querySelectorAll<HTMLElement>(
          '[data-e2e="toolbar-ticket"][data-here="true"]',
        ),
      ].map((t) => t.dataset.country);
    expect(here()).toEqual([]);
    useGameStore.setState({ flyingTo: "sorrento", skippable: true });
    await expect.poll(here).toEqual(["sorrento"]);
    await expect
      .poll(() => status(container))
      .toBe("Off to Sorrento: About, Contact");
  });

  test("hovering a control fills the sentence line", async () => {
    const { container } = await render(<Panel />);
    // Browser pointer position survives prior test files. Establish the
    // unhovered state before checking the transition this test exercises.
    await userEvent.unhover(sectionButton(container, "skills"));
    await expect.poll(() => status(container)).toBe("Walk to");
    await userEvent.hover(sectionButton(container, "skills"));
    await expect.poll(() => status(container)).toBe("Skills, in London");
    await userEvent.unhover(sectionButton(container, "skills"));
    await expect.poll(() => status(container)).toBe("Walk to");
  });

  test("Tab walks every control in order, and focus fills the sentence line", async () => {
    const { container } = await render(<Panel />);
    const expected = [
      "About, in Sorrento",
      "Contact, in Sorrento",
      "Skills, in London",
      "Experience, in Zürich",
      "Resume, in Zürich",
      "Talk to Daniele",
      "Sound",
      "Visit GitHub profile",
      "Visit LinkedIn profile",
      "How to play",
    ];
    sectionButton(container, "about").focus();
    for (const [i, name] of expected.entries()) {
      if (i > 0) await userEvent.keyboard("{Tab}");
      expect(document.activeElement?.getAttribute("aria-label")).toBe(name);
    }
    await expect.poll(() => status(container)).toBe("How to play");
  });

  test("Enter opens a focused section without starting a trip", async () => {
    const { container } = await render(<Panel />);
    sectionButton(container, "contact").focus();
    await userEvent.keyboard("{Enter}");
    expect(useGameStore.getState()).toMatchObject({
      contentSection: "contact",
      currentScene: "hall",
    });
  });

  test("Talk opens the dialog", async () => {
    await render(<Panel />);
    await page.getByRole("button", { name: "Talk to Daniele" }).click();
    expect(useGameStore.getState().dialogOpen).toBe(true);
    expect(useGameStore.getState().dialogNode).toBe("intro");
  });

  test("Sound is a toggle button", async () => {
    await render(<Panel />);
    const sound = page.getByRole("button", { name: "Sound" });
    await expect.element(sound).toHaveAttribute("aria-pressed", "true");
    await sound.click();
    expect(useGameStore.getState().soundEnabled).toBe(false);
    await expect.element(sound).toHaveAttribute("aria-pressed", "false");
  });

  test("Help identifies itself on hover and opens controls from the keyboard", async () => {
    const onShowControls = vi.fn();
    const { container } = await render(
      <Panel onShowControls={onShowControls} />,
    );
    const help = page.getByRole("button", { name: "How to play" });
    await userEvent.hover(help);
    await expect.poll(() => status(container)).toBe("How to play");
    container
      .querySelector<HTMLButtonElement>('[data-control="help"]')!
      .focus();
    await userEvent.keyboard("{Enter}");
    expect(onShowControls).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState()).toMatchObject({
      currentScene: "hall",
      contentSection: null,
      dialogOpen: false,
    });
  });

  test("GitHub and LinkedIn open the profiles in a new tab", async () => {
    await render(<Panel />);
    const github = page.getByRole("link", { name: "Visit GitHub profile" });
    const linkedin = page.getByRole("link", { name: "Visit LinkedIn profile" });
    await expect.element(github).toHaveAttribute("href", PROFILE.social.github);
    await expect
      .element(linkedin)
      .toHaveAttribute("href", PROFILE.social.linkedin);
    await expect.element(github).toHaveAttribute("target", "_blank");
    await expect
      .element(linkedin)
      .toHaveAttribute("rel", "noopener noreferrer");
  });

  test("the trunk preserves its dimensions and opaque art with smooth lettering", async () => {
    const { container } = await render(<Panel />);
    const canvas = container.querySelector("canvas")!;
    expect([canvas.width, canvas.height]).toEqual([1280, 160]);
    const ctx = canvas.getContext("2d")!;
    // The trunk stays opaque, while native lettering can use the full
    // canvas resolution instead of repeating every pixel in a 2x2 block.
    const { width, height } = canvas;
    const { data } = ctx.getImageData(0, 0, width, height);
    const px = (x: number, y: number) =>
      data.slice((y * width + x) * 4, (y * width + x) * 4 + 4).join();
    const colours = new Set<string>();
    let offGrid = 0;
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const c = px(x, y);
        colours.add(c);

        if (px(x + 1, y) !== c || px(x, y + 1) !== c || px(x + 1, y + 1) !== c)
          offGrid++;
      }
    }
    expect(data.every((value, index) => index % 4 !== 3 || value === 255)).toBe(
      true,
    );
    expect(offGrid).toBeGreaterThan(0);
    expect(colours.size).toBeGreaterThan(8);
  });
});
