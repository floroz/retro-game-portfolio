import { useState, useCallback, useRef } from "react";

export type RetroSectionId =
  | "about"
  | "experience"
  | "skills"
  | "contact"
  | "resume";

export const MENU_ITEMS: { id: RetroSectionId; label: string }[] = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
  { id: "resume", label: "Resume" },
];

const SCROLL_STEP = 40;

interface UseRetroNavigationReturn {
  /** Currently highlighted menu cursor index (0-4) */
  cursorIndex: number;
  /** Which section is open, or null for menu */
  activeSection: RetroSectionId | null;
  /** Ref to attach to the scrollable section content area */
  scrollRef: React.RefObject<HTMLDivElement | null>;

  // D-pad handlers
  onDpadUp: () => void;
  onDpadDown: () => void;

  // Button handlers
  /** A button: confirm selection (open section from menu) */
  onButtonA: () => void;
  /** B button: go back to menu from section */
  onButtonB: () => void;
  /** Start button: return to menu from anywhere */
  onButtonStart: () => void;

  // Direct selection (tap on menu item)
  onSelectItem: (index: number) => void;
}

/**
 * Navigation hook for the RetroPlay Game Boy-style console.
 * Manages menu cursor, D-pad movement, section navigation, and content scrolling.
 */
export function useRetroNavigation(): UseRetroNavigationReturn {
  const [cursorIndex, setCursorIndex] = useState(0);
  const [activeSection, setActiveSection] = useState<RetroSectionId | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const onDpadUp = useCallback(() => {
    if (activeSection) {
      // In section view: scroll content up
      scrollRef.current?.scrollBy({ top: -SCROLL_STEP, behavior: "smooth" });
    } else {
      // In menu: move cursor up, stop at boundary
      setCursorIndex((prev) => Math.max(0, prev - 1));
    }
  }, [activeSection]);

  const onDpadDown = useCallback(() => {
    if (activeSection) {
      // In section view: scroll content down
      scrollRef.current?.scrollBy({ top: SCROLL_STEP, behavior: "smooth" });
    } else {
      // In menu: move cursor down, stop at boundary
      setCursorIndex((prev) => Math.min(MENU_ITEMS.length - 1, prev + 1));
    }
  }, [activeSection]);

  const onButtonA = useCallback(() => {
    if (!activeSection) {
      // In menu: open the selected section
      setActiveSection(MENU_ITEMS[cursorIndex].id);
    }
    // In section view: A does nothing (content is read-only)
  }, [activeSection, cursorIndex]);

  const onButtonB = useCallback(() => {
    if (activeSection) {
      // In section view: go back to menu
      setActiveSection(null);
    }
  }, [activeSection]);

  const onButtonStart = useCallback(() => {
    // Return to menu from anywhere
    setActiveSection(null);
  }, []);

  const onSelectItem = useCallback((index: number) => {
    setCursorIndex(index);
    setActiveSection(MENU_ITEMS[index].id);
  }, []);

  return {
    cursorIndex,
    activeSection,
    scrollRef,
    onDpadUp,
    onDpadDown,
    onButtonA,
    onButtonB,
    onButtonStart,
    onSelectItem,
  };
}
