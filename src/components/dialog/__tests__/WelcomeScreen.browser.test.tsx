import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { WelcomeScreen } from "../WelcomeScreen";
import { useGameStore } from "../../../store/gameStore";
import { offGridPixels } from "../../../test/helpers/canvas";
import { sceneAudio } from "../../../engine/runtime";
import { useSceneAudio } from "../../../hooks/useSceneAudio";
import { PROFILE } from "../../../config/profile";

const initial = useGameStore.getState();

/** The title card at the game window's size: 1280x800 content. */
function Card({
  onDismiss,
  ready,
}: {
  onDismiss: () => void;
  ready?: boolean;
}) {
  useSceneAudio();
  return (
    <div style={{ width: 1280, height: 800, position: "relative" }}>
      <WelcomeScreen onDismiss={onDismiss} ready={ready} />
    </div>
  );
}

beforeEach(async () => {
  vi.spyOn(sceneAudio, "unlock").mockImplementation(() => {});
  vi.spyOn(sceneAudio, "setEnabled").mockImplementation(() => {});
  useGameStore.setState({ ...initial }, true);
  // Wide enough for the card to be on screen, so a click can land.
  await page.viewport(1300, 900);
});

afterEach(() => vi.restoreAllMocks());

describe("WelcomeScreen: the title card", () => {
  test("selects sound on arrival but stays silent until Start", async () => {
    await render(
      <Card onDismiss={() => useGameStore.getState().dismissWelcome()} />,
    );
    await expect.element(page.getByText("Starts with sound")).toBeVisible();
    expect(sceneAudio.unlock).not.toHaveBeenCalled();
    expect(sceneAudio.setEnabled).not.toHaveBeenCalledWith(true);
    await page
      .getByRole("button", { name: "Press space or click to start" })
      .element()
      .focus();
    await userEvent.keyboard(" ");
    expect(sceneAudio.unlock).toHaveBeenCalledTimes(1);
    expect(sceneAudio.setEnabled).toHaveBeenLastCalledWith(true);
    useGameStore.getState().toggleSound();
    expect(sceneAudio.setEnabled).toHaveBeenLastCalledWith(false);
  });

  test("muting before Start keeps the adventure silent", async () => {
    await render(
      <Card onDismiss={() => useGameStore.getState().dismissWelcome()} />,
    );
    await page.getByRole("button", { name: "Sound" }).click();
    await expect.element(page.getByText("Starts silently")).toBeVisible();
    await page
      .getByRole("button", { name: "Press space or click to start" })
      .element()
      .focus();
    await userEvent.keyboard(" ");
    expect(sceneAudio.unlock).not.toHaveBeenCalled();
    expect(sceneAudio.setEnabled).not.toHaveBeenCalledWith(true);
  });

  test("names Daniele and his title for screen readers", async () => {
    await render(<Card onDismiss={vi.fn()} />);
    await expect
      .element(page.getByRole("heading", { name: PROFILE.name }))
      .toBeInTheDocument();
    await expect.element(page.getByText(PROFILE.title)).toBeInTheDocument();
  });

  test("Space on the focused start button starts the game", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await page
      .getByRole("button", { name: "Press space or click to start" })
      .element()
      .focus();
    await userEvent.keyboard(" ");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("unfocused Space and clicks elsewhere on the card cannot start", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await userEvent.keyboard(" ");
    document.querySelector<HTMLElement>("[data-e2e=welcome-screen]")!.click();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("a held Space starts it once, not on every repeat", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    const key = page
      .getByRole("button", { name: "Press space or click to start" })
      .element();
    key.focus();
    const repeat = new KeyboardEvent("keydown", {
      key: " ",
      code: "Space",
      repeat: true,
      bubbles: true,
      cancelable: true,
    });
    key.dispatchEvent(repeat);
    expect(repeat.defaultPrevented).toBe(true);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("other keys don't start it", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await userEvent.keyboard("a{Enter}{Escape}");
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("clicking the explicit key starts the game", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await page
      .getByRole("button", { name: "Press space or click to start" })
      .click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("the explicit key starts the game from the keyboard too", async () => {
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
    await expect.element(sound).toHaveAttribute("aria-pressed", "true");
    await sound.click();
    expect(useGameStore.getState().soundEnabled).toBe(false);
    await expect.element(sound).toHaveAttribute("aria-pressed", "false");
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("Space on the sound fitting toggles it, and doesn't start the game", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Sound");
    await userEvent.keyboard(" ");
    expect(useGameStore.getState().soundEnabled).toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("Space after clicking the sound fitting does not start the game", async () => {
    const onDismiss = vi.fn();
    await render(<Card onDismiss={onDismiss} />);
    await page.getByRole("button", { name: "Sound" }).click();
    await userEvent.keyboard(" ");
    expect(useGameStore.getState().soundEnabled).toBe(true);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("a start before the art has loaded waits for it, once", async () => {
    const onDismiss = vi.fn();
    const screen = await render(<Card onDismiss={onDismiss} ready={false} />);
    await page
      .getByRole("button", { name: "Press space or click to start" })
      .element()
      .focus();
    await userEvent.keyboard(" ");
    await page
      .getByRole("button", { name: "Press space or click to start" })
      .element()
      .focus();
    await userEvent.keyboard(" ");
    const card = screen.container.querySelector("[data-e2e=welcome-screen]");
    expect(onDismiss).not.toHaveBeenCalled();
    expect(sceneAudio.unlock).toHaveBeenCalled();
    expect(sceneAudio.setEnabled).not.toHaveBeenCalledWith(true);
    // The card says so, for screen readers as well as on the stub.
    expect(card?.getAttribute("aria-busy")).toBe("true");
    await screen.rerender(<Card onDismiss={onDismiss} ready />);
    await vi.waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
  });

  test("a queued click unlocks audio silently, then starts playback when ready", async () => {
    const onDismiss = vi.fn(() => useGameStore.getState().dismissWelcome());
    const screen = await render(<Card onDismiss={onDismiss} ready={false} />);
    await page
      .getByRole("button", { name: "Press space or click to start" })
      .click();
    expect(sceneAudio.unlock).toHaveBeenCalledTimes(1);
    expect(sceneAudio.setEnabled).not.toHaveBeenCalledWith(true);
    expect(onDismiss).not.toHaveBeenCalled();
    await screen.rerender(<Card onDismiss={onDismiss} ready />);
    await vi.waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
    expect(sceneAudio.setEnabled).toHaveBeenLastCalledWith(true);
  });

  test("sound can be muted and reselected while a start is queued", async () => {
    const onDismiss = vi.fn(() => useGameStore.getState().dismissWelcome());
    const screen = await render(<Card onDismiss={onDismiss} ready={false} />);
    await page
      .getByRole("button", { name: "Press space or click to start" })
      .element()
      .focus();
    await userEvent.keyboard(" ");
    const sound = page.getByRole("button", { name: "Sound" });
    await sound.click();
    await sound.click();
    expect(sceneAudio.unlock).toHaveBeenCalledTimes(2);
    expect(sceneAudio.setEnabled).not.toHaveBeenCalledWith(true);
    await screen.rerender(<Card onDismiss={onDismiss} ready />);
    await vi.waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
    expect(sceneAudio.setEnabled).toHaveBeenLastCalledWith(true);
  });

  test("the full-resolution ticket loads above the smoothly lettered backdrop", async () => {
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
    expect(offGridPixels(canvas)).toBeGreaterThan(0);
    // Hovering the live key preserves the native-resolution backdrop.
    await userEvent.hover(
      page.getByRole("button", { name: "Press space or click to start" }),
    );
    expect(offGridPixels(canvas)).toBeGreaterThan(0);
  });
});
