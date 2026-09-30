import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";

/**
 * Global keyboard shortcuts for the game
 * Note: Win95 Desktop is now always active, so terminal toggle is removed
 * The inspection dialog also handles Escape while it has focus.
 */
export function useKeyboardShortcuts() {
  const { closeTerminalScreen, terminalScreenAction, inspection } =
    useGameStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input (except for terminal which handles its own)
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "Escape":
          // Close terminal screen if open
          if (terminalScreenAction || inspection) {
            closeTerminalScreen();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeTerminalScreen, terminalScreenAction, inspection]);
}
