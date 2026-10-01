import { useEffect, useState, type ReactNode } from "react";
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

/** Uncontrolled mode: size/position managed by this window. */
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
 * Reusable Windows 98 window wrapper with drag and resize
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

  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: Math.max(1, window.innerHeight - 36),
  }));
  const [isMaximized, setIsMaximized] = useState(false);
  const [internalBounds, setInternalBounds] = useState(() => {
    const width = props.controlled ? props.size.width : props.initialWidth;
    const height = props.controlled ? props.size.height : props.initialHeight;
    return {
      width,
      height,
      x: props.controlled
        ? props.position.x
        : props.initialX === "center"
          ? (window.innerWidth - width) / 2
          : typeof props.initialX === "number"
            ? props.initialX
            : 0,
      y: props.controlled
        ? props.position.y
        : props.initialY === "center"
          ? (window.innerHeight - 36 - height) / 2
          : typeof props.initialY === "number"
            ? props.initialY
            : 0,
    };
  });

  useEffect(() => {
    const handleResize = () =>
      setViewport({
        width: window.innerWidth,
        height: Math.max(1, window.innerHeight - 36),
      });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const normalBounds = props.controlled
    ? { ...props.size, ...props.position }
    : internalBounds;
  let width = Math.min(
    isMaximized ? viewport.width : normalBounds.width,
    viewport.width,
  );
  let height = Math.min(
    isMaximized ? viewport.height : normalBounds.height,
    viewport.height,
  );
  if (aspectRatio) {
    width = Math.min(width, height * aspectRatio);
    height = width / aspectRatio;
  }
  const size = { width, height };
  const position = isMaximized
    ? { x: (viewport.width - width) / 2, y: 0 }
    : {
        x: Math.max(0, Math.min(normalBounds.x, viewport.width - width)),
        y: Math.max(0, Math.min(normalBounds.y, viewport.height - height)),
      };

  const handleDragStop = (_e: RndDragEvent, data: DraggableData) => {
    const x = Math.max(0, Math.min(data.x, viewport.width - width));
    const y = Math.max(0, Math.min(data.y, viewport.height - height));
    if (props.controlled) props.onDragStop(x, y);
    else setInternalBounds((previous) => ({ ...previous, ...size, x, y }));
  };

  const handleResizeStop: RndResizeCallback = (
    _e,
    _dir,
    element,
    _delta,
    nextPosition,
  ) => {
    if (props.controlled) {
      props.onResizeStop(
        element.offsetWidth,
        element.offsetHeight,
        nextPosition.x,
        nextPosition.y,
      );
    } else {
      setInternalBounds({
        width: element.offsetWidth,
        height: element.offsetHeight,
        ...nextPosition,
      });
    }
  };

  const toggleMaximize = () => {
    onFocus();
    setIsMaximized((previous) => !previous);
  };

  return (
    <Rnd
      size={size}
      position={position}
      minWidth={Math.min(minWidth, width)}
      minHeight={Math.min(minHeight, height)}
      maxWidth={isMaximized ? viewport.width : maxWidth}
      maxHeight={isMaximized ? viewport.height : maxHeight}
      lockAspectRatio={aspectRatio}
      dragHandleClassName={styles.titleBar}
      cancel="button"
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
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
        <div className={styles.titleBar} onDoubleClick={toggleMaximize}>
          <div className={styles.titleText}>{title}</div>
          <div
            className={styles.systemButtons}
            onDoubleClick={(event) => event.stopPropagation()}
          >
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
                <span className={styles.minimizeGlyph} aria-hidden="true" />
              </button>
            )}
            <button
              className={styles.maximizeButton}
              onClick={(event) => {
                event.stopPropagation();
                toggleMaximize();
              }}
              aria-label={isMaximized ? "Restore window" : "Maximize window"}
              title={isMaximized ? "Restore" : "Maximize"}
              type="button"
            >
              <span
                className={
                  isMaximized ? styles.restoreGlyph : styles.maximizeGlyph
                }
                aria-hidden="true"
              />
            </button>
            <button
              className={styles.closeButton}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close window"
              title="Close"
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
