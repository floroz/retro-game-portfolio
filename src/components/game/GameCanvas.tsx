import type { ReactNode } from "react";
import { useEffect, useState, useCallback } from "react";
import { VIEWPORT } from "../../config/scene";
import "./GameCanvas.css";

interface GameCanvasProps {
  children: ReactNode;
}

/**
 * Responsive viewport container for the game
 * Base resolution: 1280x800 with CSS transform scaling for smaller screens
 */
export function GameCanvas({ children }: GameCanvasProps) {
  const [scale, setScale] = useState(1);

  const calculateScale = useCallback(() => {
    // Available space (accounting for padding)
    const availableWidth = window.innerWidth - 48;
    const availableHeight = window.innerHeight - 48;

    // Calculate scale to fit within available space
    const scaleX = availableWidth / VIEWPORT.width;
    const scaleY = availableHeight / VIEWPORT.height;

    // Use the smaller scale to ensure it fits both dimensions
    const newScale = Math.min(scaleX, scaleY, 1); // Cap at 1 (don't upscale)

    setScale(newScale);
  }, []);

  useEffect(() => {
    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, [calculateScale]);

  return (
    <div className="game-canvas-wrapper">
      <div
        className="game-canvas"
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
