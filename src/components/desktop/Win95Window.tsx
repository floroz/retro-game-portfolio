import type { ReactNode } from "react";
import { Rnd } from "react-rnd";
import styles from "./Win95Window.module.scss";

interface Win95WindowProps {
  title: string;
  onClose: () => void;
  onMinimize?: () => void;
  isActive: boolean;
  onFocus: () => void;
  zIndex: number;
  children: ReactNode;

  // Size constraints
  initialWidth: number;
  initialHeight: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number | string;
  maxHeight?: number | string;
  aspectRatio?: number; // e.g., 16/10 for locked aspect ratio

  // Position
  initialX?: number | string; // 'center' or pixel value
  initialY?: number | string;

  // Customization
  contentClassName?: string;
  showMinimizeButton?: boolean;
}

/**
 * Reusable Windows 95 window wrapper with drag and resize
 * Uses react-rnd for draggable and resizable functionality
 */
export function Win95Window({
  title,
  onClose,
  onMinimize,
  isActive,
  onFocus,
  zIndex,
  children,
  initialWidth,
  initialHeight,
  minWidth = 200,
  minHeight = 150,
  maxWidth = "95vw",
  maxHeight = "90vh",
  aspectRatio,
  initialX = "center",
  initialY = "center",
  contentClassName = "",
  showMinimizeButton = true,
}: Win95WindowProps) {
  // Calculate centered position
  const defaultX =
    initialX === "center"
      ? window.innerWidth / 2 - initialWidth / 2
      : (initialX as number);
  const defaultY =
    initialY === "center"
      ? window.innerHeight / 2 - initialHeight / 2
      : (initialY as number);

  return (
    <Rnd
      default={{
        x: defaultX,
        y: defaultY,
        width: initialWidth,
        height: initialHeight,
      }}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      lockAspectRatio={aspectRatio}
      dragHandleClassName={styles.titleBar}
      bounds="parent"
      style={{ zIndex }}
      onMouseDown={onFocus}
    >
      <div
        className={`${styles.window} ${isActive ? styles.active : ""}`}
        data-e2e="win95-window"
      >
        {/* Title bar */}
        <div className={styles.titleBar}>
          <div className={styles.titleText}>{title}</div>
          <div className={styles.systemButtons}>
            {showMinimizeButton && onMinimize && (
              <button
                className={styles.minimizeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimize();
                }}
                aria-label="Minimize (presentational)"
                type="button"
                title="Minimize (not functional)"
              >
                <span>_</span>
              </button>
            )}
            <button
              className={styles.closeButton}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close window"
              type="button"
            >
              <span>×</span>
            </button>
          </div>
        </div>

        {/* Window content area */}
        <div className={`${styles.content} ${contentClassName}`}>
          {children}
        </div>
      </div>
    </Rnd>
  );
}
