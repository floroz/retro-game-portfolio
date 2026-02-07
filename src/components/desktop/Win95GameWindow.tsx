import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
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

/** Minimum window width – allows scaling down to ~768px viewports */
const MIN_WIDTH = 680;
const MIN_HEIGHT = Math.round(MIN_WIDTH / ASPECT_RATIO);

interface Win95GameWindowProps {
  children?: ReactNode; // Optional since welcome screen might be shown instead
  onClose: () => void;
  onMinimize?: () => void;
  isActive: boolean;
  onFocus: () => void;
  zIndex: number;
  dialogContent?: ReactNode; // Dialog content to render inside window
  welcomeContent?: ReactNode; // Welcome screen content to render before game
}

/**
 * Compute constrained window dimensions that fit the viewport
 * while respecting the locked aspect ratio and the minimum size.
 */
function computeConstrainedSize(
  currentWidth: number,
  currentHeight: number,
): { width: number; height: number } {
  const maxW = window.innerWidth * 0.95;
  const maxH = window.innerHeight * 0.9;

  // Start from the current size, but cap to viewport limits
  let width = Math.min(currentWidth, maxW);
  let height = Math.min(Math.round(width / ASPECT_RATIO), currentHeight);

  // Recompute with aspect ratio after clamping height
  if (height > maxH) {
    height = maxH;
    width = Math.round(height * ASPECT_RATIO);
  } else {
    // Ensure aspect ratio is maintained
    height = Math.round(width / ASPECT_RATIO);
  }

  // Clamp to minimum
  width = Math.max(width, MIN_WIDTH);
  height = Math.max(height, MIN_HEIGHT);

  return { width, height };
}

/**
 * Compute the initial window dimensions so the window fits in the viewport
 * while respecting the locked aspect ratio and the minimum size.
 */
function computeInitialSize(): { width: number; height: number } {
  return computeConstrainedSize(FULL_WIDTH, FULL_HEIGHT);
}

/** Center a window of given size within the viewport */
function computeCenteredPosition(size: { width: number; height: number }): {
  x: number;
  y: number;
} {
  return {
    x: Math.max(0, window.innerWidth / 2 - size.width / 2),
    y: Math.max(0, window.innerHeight / 2 - size.height / 2),
  };
}

/** Clamp position so the window stays within the viewport bounds */
function clampPosition(
  pos: { x: number; y: number },
  size: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(pos.x, window.innerWidth - size.width)),
    y: Math.max(0, Math.min(pos.y, window.innerHeight - size.height)),
  };
}

/**
 * Windows 95 style game window
 * Wraps the game scene in a Win95 window frame
 * Can show welcome screen or game content
 * Dialogs are rendered inside the content area for containment
 *
 * Uses controlled mode for Rnd so the window automatically adapts
 * when the browser viewport is resized.
 */
export function Win95GameWindow({
  children,
  onClose,
  onMinimize,
  isActive,
  onFocus,
  zIndex,
  dialogContent,
  welcomeContent,
}: Win95GameWindowProps) {
  const [windowState, setWindowState] = useState(() => {
    const size = computeInitialSize();
    const position = computeCenteredPosition(size);
    return { ...size, ...position };
  });

  // Recompute size/position when the viewport changes
  useEffect(() => {
    const handleResize = () => {
      setWindowState((prev) => {
        const newSize = computeConstrainedSize(prev.width, prev.height);
        const newPos = clampPosition({ x: prev.x, y: prev.y }, newSize);
        return { ...newSize, ...newPos };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleResizeStop = useCallback(
    (width: number, height: number, x: number, y: number) => {
      setWindowState({ width, height, x, y });
    },
    [],
  );

  const handleDragStop = useCallback((x: number, y: number) => {
    setWindowState((prev) => ({ ...prev, x, y }));
  }, []);

  return (
    <Win95Window
      controlled
      title="Daniele_Tortora_Portfolio.exe - Interactive Portfolio"
      onClose={onClose}
      onMinimize={onMinimize}
      isActive={isActive}
      onFocus={onFocus}
      zIndex={zIndex}
      size={{ width: windowState.width, height: windowState.height }}
      position={{ x: windowState.x, y: windowState.y }}
      onResizeStop={handleResizeStop}
      onDragStop={handleDragStop}
      minWidth={MIN_WIDTH}
      minHeight={MIN_HEIGHT}
      maxWidth="95vw"
      maxHeight="90vh"
      aspectRatio={ASPECT_RATIO}
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
