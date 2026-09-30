import { StrictMode, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import type { InspectionReading } from "../../../config/inspections";
import aboutArt from "../../../assets/inspections/about.png";
import { ObjectInspectionView } from "../ObjectInspectionView";
import { Toolbar } from "../../toolbar/Toolbar";
import { useGameStore } from "../../../store/gameStore";
import { sectionInspection } from "../../../config/inspections";

const initialState = useGameStore.getState();

const inspection: InspectionReading = {
  title: "A postcard from home",
  subtitle: "Sorrento",
  art: aboutArt,
  artAlt: "A postcard album on the kitchen table",
  paragraphs: ["A story printed in the album, ready to read."],
};

const pagedInspection: InspectionReading = {
  ...inspection,
  pages: [
    { title: "The first page", paragraphs: ["The beginning of the story."] },
    { title: "The next page", paragraphs: ["The rest of the story."] },
  ],
};

function SceneWithInspection() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", width: 1000, height: 600 }}>
      {open && (
        <ObjectInspectionView
          inspection={inspection}
          onClose={() => setOpen(false)}
        />
      )}
      <div inert={open}>
        <button type="button" onClick={() => setOpen(true)}>
          Inspect the postcard
        </button>
        <button type="button">Walk to the door</button>
      </div>
    </div>
  );
}

function ToolbarWithInspection() {
  const section = useGameStore((state) => state.terminalScreenAction);
  const close = useGameStore((state) => state.closeTerminalScreen);
  return (
    <div style={{ position: "relative", width: 1000, height: 600 }}>
      {section && section !== "talk" && (
        <ObjectInspectionView
          inspection={sectionInspection(section)}
          onClose={close}
        />
      )}
      <div
        inert={section !== null}
        style={{ position: "absolute", bottom: 0, width: 1000, height: 125 }}
      >
        <Toolbar />
      </div>
    </div>
  );
}

describe("Object inspection", () => {
  test("StrictMode preserves the keyboard opener through effect replay", async () => {
    await render(
      <StrictMode>
        <SceneWithInspection />
      </StrictMode>,
    );
    const opener = page.getByRole("button", { name: "Inspect the postcard" });
    opener.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(page.getByRole("dialog")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect.element(opener).toHaveFocus();
  });

  test("the real toolbar shortcut returns keyboard focus without changing rooms", async () => {
    useGameStore.setState(
      {
        ...initialState,
        welcomeShown: true,
        currentScene: "sorrento",
        visitedNodes: new Set(),
      },
      true,
    );
    await render(
      <StrictMode>
        <ToolbarWithInspection />
      </StrictMode>,
    );
    const opener = page.getByRole("button", { name: "Skills, in London" });
    opener.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("dialog", { name: "Skills" }))
      .toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect.element(opener).toHaveFocus();
    expect(useGameStore.getState()).toMatchObject({
      currentScene: "sorrento",
      terminalScreenAction: null,
      sceneRequest: null,
    });
  });

  test("names the modal and renders the artwork and readable text", async () => {
    await render(
      <ObjectInspectionView inspection={inspection} onClose={vi.fn()} />,
    );
    const dialog = page.getByRole("dialog", { name: inspection.title });
    await expect.element(dialog).toHaveAttribute("aria-modal", "true");
    await expect.element(dialog).toHaveFocus();
    await expect
      .element(page.getByRole("img", { name: inspection.artAlt }))
      .toBeVisible();
    await expect
      .element(page.getByText(inspection.paragraphs[0]))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Next page" }))
      .not.toBeInTheDocument();
  });

  test("turns pages with buttons and arrow keys and stops at both ends", async () => {
    await render(
      <ObjectInspectionView inspection={pagedInspection} onClose={vi.fn()} />,
    );
    const previous = page.getByRole("button", { name: "Previous page" });
    const next = page.getByRole("button", { name: "Next page" });
    await expect.element(previous).toBeDisabled();
    await userEvent.keyboard("{ArrowLeft}");
    await expect
      .element(page.getByRole("heading", { name: "The first page" }))
      .toBeVisible();
    await next.click();
    await expect
      .element(page.getByRole("heading", { name: "The next page" }))
      .toBeVisible();
    await expect
      .element(page.getByText("The beginning of the story."))
      .not.toBeInTheDocument();
    await expect.element(next).toBeDisabled();
    await page.getByRole("dialog").element().focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(page.getByRole("heading", { name: "The next page" }))
      .toBeVisible();
    await userEvent.keyboard("{ArrowLeft}");
    await expect
      .element(page.getByRole("heading", { name: "The first page" }))
      .toBeVisible();
    await expect.element(previous).toBeDisabled();
  });

  test("keeps Tab and Shift-Tab inside the inspection, skipping disabled controls", async () => {
    const { container } = await render(
      <ObjectInspectionView inspection={pagedInspection} onClose={vi.fn()} />,
    );
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    await expect
      .element(page.getByRole("button", { name: "Next page" }))
      .toHaveFocus();
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(
      container.querySelector('[aria-label="Inspection text"]'),
    );
    await userEvent.keyboard("{Tab}");
    await expect
      .element(page.getByRole("button", { name: "Back to the scene" }))
      .toHaveFocus();
    await userEvent.keyboard("{Tab}");
    await expect
      .element(page.getByRole("button", { name: "Next page" }))
      .toHaveFocus();
  });

  test("keeps email and external profile links actionable", async () => {
    await render(
      <ObjectInspectionView
        inspection={{
          ...inspection,
          pages: [
            {
              title: "Contact",
              paragraphs: ["Let's talk."],
              links: [
                { label: "Email", href: "mailto:hello@example.com" },
                { label: "Profile", href: "https://example.com/profile" },
              ],
            },
          ],
        }}
        onClose={vi.fn()}
      />,
    );
    const email = page.getByRole("link", { name: "Email" });
    const profile = page.getByRole("link", { name: "Profile" });
    await expect
      .element(email)
      .toHaveAttribute("href", "mailto:hello@example.com");
    await expect.element(email).not.toHaveAttribute("target");
    await expect.element(profile).toHaveAttribute("target", "_blank");
    await expect.element(profile).toHaveAttribute("rel", "noopener noreferrer");
  });

  test.each(["Escape", "Back"])(
    "%s returns focus to the opener in the preserved scene",
    async (close) => {
      await render(<SceneWithInspection />);
      const opener = page.getByRole("button", { name: "Inspect the postcard" });
      const sceneButton = page
        .getByRole("button", { name: "Walk to the door" })
        .element();
      await opener.click();
      await expect.element(page.getByRole("dialog")).toHaveFocus();
      expect(sceneButton.closest("[inert]")).not.toBeNull();
      if (close === "Escape") await userEvent.keyboard("{Escape}");
      else
        await page.getByRole("button", { name: "Back to the scene" }).click();
      await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
      await expect.element(opener).toHaveFocus();
      await expect
        .element(page.getByRole("button", { name: "Walk to the door" }))
        .toBeVisible();
      expect(
        page.getByRole("button", { name: "Walk to the door" }).element(),
      ).toBe(sceneButton);
      expect(sceneButton.closest("[inert]")).toBeNull();
    },
  );
});
