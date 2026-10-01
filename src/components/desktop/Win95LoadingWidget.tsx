import { useEffect, useEffectEvent, useState } from "react";
import { Rnd } from "react-rnd";
import styles from "./Win95LoadingWidget.module.scss";

interface Win95LoadingWidgetProps {
  onCancel: () => void;
  onComplete: () => void;
  isActive: boolean;
  onFocus: () => void;
  zIndex: number;
  /** Share of the launch art loaded, from 0 to 1 (default 1). */
  progress?: number;
}

/** The shortest launch, in ms, so the dialog reads as a real one. */
const LOADING_DURATION = 1500;
/**
 * The longest launch, in ms. A stalled download must never lock the
 * visitor out of the content; the title card still holds the start.
 */
const LOADING_LIMIT = 12000;
const TOTAL_SEGMENTS = 22;

/**
 * Windows 98 launch dialog. The bar fills no faster than the art loads
 * and no faster than the shortest launch, and the game opens once both
 * are done. Every scheduled callback is disposed on close.
 */
export function Win95LoadingWidget({
  onCancel,
  onComplete,
  isActive,
  onFocus,
  zIndex,
  progress: loaded = 1,
}: Win95LoadingWidgetProps) {
  const [elapsed, setElapsed] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const completeLoading = useEffectEvent(onComplete);
  const done = timedOut || (timeUp && loaded >= 1);
  const progress = done
    ? TOTAL_SEGMENTS
    : Math.floor(Math.min(elapsed / LOADING_DURATION, loaded) * TOTAL_SEGMENTS);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsed(Math.min(LOADING_DURATION, Date.now() - startedAt));
    }, LOADING_DURATION / TOTAL_SEGMENTS);
    const minimum = window.setTimeout(() => {
      window.clearInterval(interval);
      setElapsed(LOADING_DURATION);
      setTimeUp(true);
    }, LOADING_DURATION + 100);
    const limit = window.setTimeout(() => setTimedOut(true), LOADING_LIMIT);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(minimum);
      window.clearTimeout(limit);
    };
  }, []);

  useEffect(() => {
    if (done) completeLoading();
  }, [done]);

  return (
    <Rnd
      default={{
        x: Math.max(0, (window.innerWidth - 370) / 2),
        y: Math.max(0, (window.innerHeight - 36 - 190) / 2),
        width: 370,
        height: 190,
      }}
      enableResizing={false}
      bounds="parent"
      dragHandleClassName={styles.titleBar}
      cancel="button"
      style={{ zIndex }}
      onMouseDown={onFocus}
    >
      <div
        className={`${styles.window} ${isActive ? styles.active : ""}`}
        data-e2e="win95-loading-widget"
      >
        <div className={styles.titleBar}>
          <div className={styles.titleText}>Portfolio Remastered</div>
          <button
            className={styles.closeButton}
            onClick={(event) => {
              event.stopPropagation();
              onCancel();
            }}
            aria-label="Cancel loading"
            title="Close"
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.heading}>
            <span className={styles.applicationIcon} aria-hidden="true">
              <span>C:\</span>
            </span>
            <div>
              <div className={styles.productName}>Portfolio Remastered</div>
              <div className={styles.systemName}>Windows 98 Edition</div>
            </div>
          </div>
          <div className={styles.loadingText}>
            Preparing your point-and-click adventure...
          </div>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-label="Starting Portfolio Remastered"
            aria-valuemin={0}
            aria-valuemax={TOTAL_SEGMENTS}
            aria-valuenow={progress}
          >
            {Array.from({ length: TOTAL_SEGMENTS }).map((_, index) => (
              <div
                key={index}
                className={`${styles.progressSegment} ${index < progress ? styles.filled : ""}`}
              />
            ))}
          </div>
          <div className={styles.buttonContainer}>
            <button
              className={styles.cancelButton}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Rnd>
  );
}
