import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Win95Window } from "./Win95Window";
import { PROFILE } from "../../config/profile";
import styles from "./Win95GameWindow.module.scss";

/**
 * Window chrome measurements (borders, margins, title bar).
 * These must stay in sync with Win95Window.module.scss & Win95GameWindow.module.scss.
 *
 * Horizontal (per side): .window border 2px + .content margin 2px + .content border 2px = 6px
 * Vertical: .window border-top 2px + titleBar 22px + .content margin-top 2px
 *         + .content border-top 2px + .content border-bottom 2px
 *         + .content margin-bottom 2px + .window border-bottom 2px = 34px
 */
const CHROME_H = 12; // 6px × 2 sides
const CHROME_V = 34; // title bar + borders + margins

/** Full-size outer dimensions so the inner content area is exactly 1280×800 */
const FULL_WIDTH = 1280 + CHROME_H; // 1292
const FULL_HEIGHT = 800 + CHROME_V; // 834

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
  welcomeContent?: ReactNode; // Welcome screen content to render before game
}

/**
 * Compute constrained window dimensions that fit the viewport
 * while respecting the locked aspect ratio and reserving room for the taskbar.
 */
function computeConstrainedSize(
  currentWidth: number,
  currentHeight: number,
): { width: number; height: number } {
  const maxW = Math.max(1, window.innerWidth - 24);
  const maxH = Math.max(1, window.innerHeight - 36 - 24);
  const width = Math.min(
    currentWidth,
    currentHeight * ASPECT_RATIO,
    maxW,
    maxH * ASPECT_RATIO,
  );
  const height = width / ASPECT_RATIO;

  return { width, height };
}

/**
 * Compute the initial window dimensions so the window fits in the viewport
 * while respecting the locked aspect ratio and reserving room for the taskbar.
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
    y: Math.max(0, (window.innerHeight - 36 - size.height) / 2),
  };
}

/** Clamp position so the window stays within the viewport bounds */
function clampPosition(
  pos: { x: number; y: number },
  size: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(pos.x, window.innerWidth - size.width)),
    y: Math.max(0, Math.min(pos.y, window.innerHeight - 36 - size.height)),
  };
}

/**
 * Windows 98 style game window
 * Wraps the game scene in a Windows 98 window frame
 * Can show the title card or game content
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
      title={`${PROFILE.name} — Portfolio Remastered`}
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
      maxWidth="100vw"
      maxHeight="calc(100vh - 36px)"
      aspectRatio={ASPECT_RATIO}
      contentClassName={styles.gameContent}
      showMinimizeButton={true}
    >
      <div className={styles.innerContent} data-e2e="win95-game-window">
        {/* Show welcome screen if provided, otherwise show game content */}
        {welcomeContent || children}
      </div>
    </Win95Window>
  );
}
