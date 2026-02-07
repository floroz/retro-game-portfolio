import type { ReactNode } from "react";
import { Rnd } from "react-rnd";
import type { DraggableData, RndDragEvent, RndResizeCallback } from "react-rnd";
import styles from "./Win95Window.module.scss";

interface Win95WindowBaseProps {
  title: string;
  onClose: () => void;
  onMinimize?: () => void;
  isActive: boolean;
  onFocus: () => void;
  zIndex: number;
  children: ReactNode;

  // Size constraints
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number | string;
  maxHeight?: number | string;
  aspectRatio?: number; // e.g., 16/10 for locked aspect ratio

  // Customization
  contentClassName?: string;
  showMinimizeButton?: boolean;
}

/** Uncontrolled mode: size/position managed internally by Rnd */
interface Win95WindowUncontrolledProps extends Win95WindowBaseProps {
  controlled?: false;
  initialWidth: number;
  initialHeight: number;
  initialX?: number | string; // 'center' or pixel value
  initialY?: number | string;
  size?: never;
  position?: never;
  onResizeStop?: never;
  onDragStop?: never;
}

/** Controlled mode: size/position driven by parent state */
interface Win95WindowControlledProps extends Win95WindowBaseProps {
  controlled: true;
  size: { width: number; height: number };
  position: { x: number; y: number };
  onResizeStop: (width: number, height: number, x: number, y: number) => void;
  onDragStop: (x: number, y: number) => void;
  initialWidth?: never;
  initialHeight?: never;
  initialX?: never;
  initialY?: never;
}

type Win95WindowProps =
  | Win95WindowUncontrolledProps
  | Win95WindowControlledProps;

/**
 * Reusable Windows 95 window wrapper with drag and resize
 * Uses react-rnd for draggable and resizable functionality
 *
 * Supports two modes:
 * - Uncontrolled (default): uses `initialWidth`/`initialHeight`/`initialX`/`initialY`
 * - Controlled (`controlled={true}`): uses `size`/`position` with `onResizeStop`/`onDragStop`
 */
export function Win95Window(props: Win95WindowProps) {
  const {
    title,
    onClose,
    onMinimize,
    isActive,
    onFocus,
    zIndex,
    children,
    minWidth = 200,
    minHeight = 150,
    maxWidth = "95vw",
    maxHeight = "90vh",
    aspectRatio,
    contentClassName = "",
    showMinimizeButton = true,
  } = props;

  // Build Rnd props based on controlled vs uncontrolled mode
  const rndSizePositionProps = props.controlled
    ? {
        size: props.size,
        position: props.position,
      }
    : (() => {
        const defaultX =
          props.initialX === "center"
            ? window.innerWidth / 2 - props.initialWidth / 2
            : ((props.initialX as number) ?? 0);
        const defaultY =
          props.initialY === "center"
            ? window.innerHeight / 2 - props.initialHeight / 2
            : ((props.initialY as number) ?? 0);
        return {
          default: {
            x: defaultX,
            y: defaultY,
            width: props.initialWidth,
            height: props.initialHeight,
          },
        };
      })();

  const handleDragStop = props.controlled
    ? (_e: RndDragEvent, data: DraggableData) => {
        props.onDragStop(data.x, data.y);
      }
    : undefined;

  const handleResizeStop: RndResizeCallback | undefined = props.controlled
    ? (_e, _dir, elementRef, _delta, position) => {
        props.onResizeStop(
          elementRef.offsetWidth,
          elementRef.offsetHeight,
          position.x,
          position.y,
        );
      }
    : undefined;

  return (
    <Rnd
      {...rndSizePositionProps}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      lockAspectRatio={aspectRatio}
      dragHandleClassName={styles.titleBar}
      bounds="parent"
      style={{ zIndex }}
      onMouseDown={onFocus}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
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
                aria-label="Minimize window"
                type="button"
                title="Minimize"
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
              <span>&times;</span>
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
