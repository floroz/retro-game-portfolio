import {
  type ReactNode,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { VIEWPORT } from "../../config/scene";
import styles from "./GameCanvas.module.scss";

interface GameCanvasProps {
  children: ReactNode;
}

/**
 * Responsive viewport container for the game.
 * The inner canvas stays at the native 1280x800 resolution so all game-logic
 * coordinates remain unchanged.  A CSS `transform: scale()` is applied to
 * shrink or grow the canvas to fill the available space while preserving the
 * 16:10 aspect ratio.  The wrapper element is sized to the *scaled* dimensions
 * so it participates normally in the document flow.
 */
export function GameCanvas({ children }: GameCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // The wrapper is flex-centered inside the window content area.
    // Its parent provides the available space.
    const parent = wrapper.parentElement;
    if (!parent) return;

    const availableWidth = parent.clientWidth;
    const availableHeight = parent.clientHeight;

    const scaleX = availableWidth / VIEWPORT.width;
    const scaleY = availableHeight / VIEWPORT.height;
    setScale(Math.min(scaleX, scaleY, 1)); // Never scale up beyond 1
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const parent = wrapper?.parentElement;
    if (!parent) return;

    // Initial measurement
    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(parent);

    return () => observer.disconnect();
  }, [updateScale]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div
        className={styles.canvas}
        data-e2e="game-canvas"
        style={{
          width: VIEWPORT.width,
          height: VIEWPORT.height,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
