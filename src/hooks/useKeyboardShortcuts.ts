import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";

/**
 * Global keyboard shortcuts for the game
 * The inspection dialog also handles Escape while it has focus.
 */
export function useKeyboardShortcuts() {
  const { closeContent, contentSection, inspection } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "Escape":
          // Close the content screen if open
          if (contentSection || inspection) {
            closeContent();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeContent, contentSection, inspection]);
}
