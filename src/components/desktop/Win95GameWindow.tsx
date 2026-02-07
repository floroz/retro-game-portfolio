import type { ReactNode } from "react";
import { useMemo } from "react";
import { Win95Window } from "./Win95Window";
import styles from "./Win95GameWindow.module.scss";

/**
 * Window chrome measurements (borders, margins, title bar).
 * These must stay in sync with Win95Window.module.scss & Win95GameWindow.module.scss.
 *
 * Horizontal (per side): .window border 2px + .content margin 2px + .content border 2px = 6px
 * Vertical: .window border-top 2px + titleBar ~26px + .content margin-top 2px
 *         + .content border-top 2px + .content border-bottom 2px
 *         + .content margin-bottom 2px + .window border-bottom 2px = 38px
 */
const CHROME_H = 12; // 6px × 2 sides
const CHROME_V = 38; // title bar + borders + margins

/** Full-size outer dimensions so the inner content area is exactly 1280×800 */
const FULL_WIDTH = 1280 + CHROME_H; // 1292
const FULL_HEIGHT = 800 + CHROME_V; // 838

/** Outer aspect ratio — accounts for chrome so the game canvas fills perfectly */
const ASPECT_RATIO = FULL_WIDTH / FULL_HEIGHT;

/** Minimum window width – game should never be smaller than this */
const MIN_WIDTH = 900;
const MIN_HEIGHT = Math.round(MIN_WIDTH / ASPECT_RATIO);

interface Win95GameWindowProps {
  children?: ReactNode; // Optional since welcome screen might be shown instead
  onClose: () => void;
  isActive: boolean;
  onFocus: () => void;
  zIndex: number;
  dialogContent?: ReactNode; // Dialog content to render inside window
  welcomeContent?: ReactNode; // Welcome screen content to render before game
}

/**
 * Compute the initial window dimensions so the window fits in the viewport
 * while respecting the locked aspect ratio and the minimum size.
 */
function computeInitialSize(): { width: number; height: number } {
  const maxW = window.innerWidth * 0.95;
  const maxH = window.innerHeight * 0.9;

  // Start from full size and shrink to fit
  let width = Math.min(FULL_WIDTH, maxW);
  let height = Math.round(width / ASPECT_RATIO);

  if (height > maxH) {
    height = maxH;
    width = Math.round(height * ASPECT_RATIO);
  }

  // Clamp to minimum
  width = Math.max(width, MIN_WIDTH);
  height = Math.max(height, MIN_HEIGHT);

  return { width, height };
}

/**
 * Windows 95 style game window
 * Wraps the game scene in a Win95 window frame
 * Can show welcome screen or game content
 * Dialogs are rendered inside the content area for containment
 */
export function Win95GameWindow({
  children,
  onClose,
  isActive,
  onFocus,
  zIndex,
  dialogContent,
  welcomeContent,
}: Win95GameWindowProps) {
  const initialSize = useMemo(() => computeInitialSize(), []);

  return (
    <Win95Window
      title="Daniele_Tortora_Portfolio.exe - Interactive Portfolio"
      onClose={onClose}
      isActive={isActive}
      onFocus={onFocus}
      zIndex={zIndex}
      initialWidth={initialSize.width}
      initialHeight={initialSize.height}
      minWidth={MIN_WIDTH}
      minHeight={MIN_HEIGHT}
      maxWidth="95vw"
      maxHeight="90vh"
      aspectRatio={ASPECT_RATIO}
      initialX="center"
      initialY="center"
      contentClassName={styles.gameContent}
      showMinimizeButton={true}
    >
      <div className={styles.innerContent} data-e2e="win95-game-window">
        {/* Show welcome screen if provided, otherwise show game content */}
        {welcomeContent || children}
        {/* Dialogs rendered inside window for containment */}
        {dialogContent}
      </div>
    </Win95Window>
  );
}
