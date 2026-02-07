import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";

/**
 * Global keyboard shortcuts for the game
 * Note: Win95 Desktop is now always active, so terminal toggle is removed
 * ESC for terminal screen is handled by the TerminalScreen component itself
 */
export function useKeyboardShortcuts() {
  const { closeTerminalScreen, terminalScreenAction } = useGameStore();

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
          if (terminalScreenAction) {
            closeTerminalScreen();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeTerminalScreen, terminalScreenAction]);
}
