import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { Windows98StartMenu } from "../Windows98StartMenu";

function setup() {
  const actions = {
    onClose: vi.fn(),
    onGame: vi.fn(),
    onResume: vi.fn(),
    onContact: vi.fn(),
    onExperience: vi.fn(),
    onAbout: vi.fn(),
    onShowDesktop: vi.fn(),
  };
  render(<Windows98StartMenu {...actions} />);
  return actions;
}

describe("Windows 98 Start menu", () => {
  test("opens on the first item and wraps keyboard navigation in both directions", () => {
    setup();
    const items = screen.getAllByRole("menuitem");
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(items.at(-1));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: "End" });
    expect(document.activeElement).toBe(items.at(-1));
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(items[0]);
  });

  test.each([
    ["Play the adventure", "onGame"],
    ["My Resume", "onResume"],
    ["Contact", "onContact"],
    ["Work Experience", "onExperience"],
    ["About this computer", "onAbout"],
    ["Show Desktop", "onShowDesktop"],
  ] as const)(
    "%s closes the menu before launching its destination",
    (name, action) => {
      const actions = setup();
      fireEvent.click(screen.getByRole("menuitem", { name }));
      expect(actions.onClose).toHaveBeenCalledOnce();
      expect(actions[action]).toHaveBeenCalledOnce();
      expect(actions.onClose.mock.invocationCallOrder[0]).toBeLessThan(
        actions[action].mock.invocationCallOrder[0],
      );
    },
  );

  test("Escape closes the menu without launching an item or propagating to the game", () => {
    const actions = setup();
    const outer = vi.fn();
    document.addEventListener("keydown", outer);
    try {
      fireEvent.keyDown(screen.getAllByRole("menuitem")[0], { key: "Escape" });
      expect(actions.onClose).toHaveBeenCalledOnce();
      expect(actions.onGame).not.toHaveBeenCalled();
      expect(outer).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("keydown", outer);
    }
  });
});
