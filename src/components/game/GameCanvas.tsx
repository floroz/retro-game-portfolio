import type { ReactNode } from "react";
import { useEffect, useState, useCallback } from "react";
import { VIEWPORT } from "../../config/scene";
import styles from "./GameCanvas.module.scss";

interface GameCanvasProps {
  children: ReactNode;
}

function getScale(): number {
  // Available space (accounting for padding)
  const availableWidth = window.innerWidth - 48;
  const availableHeight = window.innerHeight - 48;

  // Calculate scale to fit within available space
  const scaleX = availableWidth / VIEWPORT.width;
  const scaleY = availableHeight / VIEWPORT.height;

  // Use the smaller scale to ensure it fits both dimensions
  return Math.min(scaleX, scaleY, 1); // Cap at 1 (don't upscale)
}

/**
 * Responsive viewport container for the game
 * Base resolution: 1280x800 with CSS transform scaling for smaller screens
 */
export function GameCanvas({ children }: GameCanvasProps) {
  const [scale, setScale] = useState(getScale);

  const handleResize = useCallback(() => {
    setScale(getScale());
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.canvas}
        data-e2e="game-canvas"
        style={{
          width: VIEWPORT.width,
          height: VIEWPORT.height,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
