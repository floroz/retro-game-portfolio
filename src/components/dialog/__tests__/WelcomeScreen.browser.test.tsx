import { beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { WelcomeScreen } from "../WelcomeScreen";
import { useGameStore } from "../../../store/gameStore";
import { offGridPixels } from "../../../test/helpers/canvas";

const initial = useGameStore.getState();

/** The title card at the game window's size: 1280x800 content. */
function Card({
  onDismiss,
  ready,
}: {
  onDismiss: () => void;
  ready?: boolean;
}) {
  return (
    <div style={{ width: 1280, height: 800, position: "relative" }}>
      <WelcomeScreen onDismiss={onDismiss} ready={ready} />
    </div>
  );
}

beforeEach(async () => {
  useGameStore.setState({ ...initial }, true);
  // Wide enough for the card to be on screen, so a click can land.
  await page.viewport(1300, 900);
});

describe("WelcomeScreen: the title card", () => {
  test("names Daniele and his title for screen readers", async () => {
    await render(<Card onDismiss={vi.fn()} />);
    await expect
      .element(page.getByRole("heading", { name: "Daniele Tortora" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Senior Software Engineer"))
      .toBeInTheDocument();
  });

  test("Space starts the game", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await userEvent.keyboard(" ");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("a held Space starts it once, not on every repeat", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", code: "Space", repeat: true }),
    );
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("other keys don't start it", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await userEvent.keyboard("a{Enter}{Escape}");
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("clicking the pass starts the game", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await page
      .getByRole("button", { name: "Press space or click to start" })
      .click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("the pass is a button that starts the game from the keyboard too", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await userEvent.tab();
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Press space or click to start",
    );
    await userEvent.keyboard("{Enter}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("the sound fitting toggles the sound without starting the game", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    const sound = page.getByRole("button", { name: "Sound" });
    await expect.element(sound).toHaveAttribute("aria-pressed", "false");
    await sound.click();
    expect(useGameStore.getState().soundEnabled).toBe(true);
    await expect.element(sound).toHaveAttribute("aria-pressed", "true");
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("Space on the sound fitting toggles it, and doesn't start the game", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Sound");
    await userEvent.keyboard(" ");
    expect(useGameStore.getState().soundEnabled).toBe(true);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("Space after clicking the sound fitting still starts the game", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await page.getByRole("button", { name: "Sound" }).click();
    await userEvent.keyboard(" ");
    expect(useGameStore.getState().soundEnabled).toBe(true);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("a start before the art has loaded waits for it, once", async () => {
    const onDismiss = vi.fn();
    const screen = await render(<Card onDismiss={onDismiss} ready={false} />);
    await userEvent.keyboard(" ");
    await userEvent.keyboard(" ");
    const card = screen.container.querySelector("[data-e2e=welcome-screen]");
    expect(onDismiss).not.toHaveBeenCalled();
    // The card says so, for screen readers as well as on the stub.
    expect(card?.getAttribute("aria-busy")).toBe("true");
    await screen.rerender(<Card onDismiss={onDismiss} ready />);
    await vi.waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
  });

  test("a click before the art has loaded waits for it too", async () => {
    const onDismiss = vi.fn();
    const screen = await render(<Card onDismiss={onDismiss} ready={false} />);
    await page
      .getByRole("button", { name: "Press space or click to start" })
      .click();
    expect(onDismiss).not.toHaveBeenCalled();
    await screen.rerender(<Card onDismiss={onDismiss} ready />);
    await vi.waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
  });

  test("the ticket artwork loads above the pixel-grid backdrop", async () => {
    const { container } = await render(<Card onDismiss={vi.fn()} />);
    const artwork = container.querySelector("img")!;
    await vi.waitFor(() => {
      expect(artwork.complete).toBe(true);
      expect(artwork.naturalWidth).toBeGreaterThan(1000);
    });
    await expect
      .element(page.getByText("SPACE", { exact: true }))
      .toBeVisible();
    const canvas = container.querySelector("canvas")!;
    expect([canvas.width, canvas.height]).toEqual([1280, 800]);
    expect(offGridPixels(canvas)).toBe(0);
    // Hovering the live key leaves the backdrop on its native grid.
    await userEvent.hover(
      page.getByRole("button", { name: "Press space or click to start" }),
    );
    expect(offGridPixels(canvas)).toBe(0);
  });
});
