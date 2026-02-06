import { useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import styles from "./Win95LoadingWidget.module.scss";

interface Win95LoadingWidgetProps {
  onCancel: () => void;
  onComplete: () => void;
  isActive: boolean;
  onFocus: () => void;
  zIndex: number;
}

const LOADING_DURATION = 1500; // 3.5 seconds
const TOTAL_SEGMENTS = 22;

/**
 * Windows 95 style loading dialog
 * Shows a progress bar that fills over 3.5 seconds
 */
export function Win95LoadingWidget({
  onCancel,
  onComplete,
  onFocus,
  zIndex,
}: Win95LoadingWidgetProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= TOTAL_SEGMENTS) {
          clearInterval(interval);
          // Call onComplete when finished
          setTimeout(onComplete, 100);
          return TOTAL_SEGMENTS;
        }
        return prev + 1;
      });
    }, LOADING_DURATION / TOTAL_SEGMENTS);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <Rnd
      default={{
        x: window.innerWidth / 2 - 160,
        y: window.innerHeight / 2 - 70,
        width: 320,
        height: 140,
      }}
      minWidth={320}
      minHeight={140}
      maxWidth={320}
      maxHeight={140}
      disableResize={true}
      dragHandleClassName={styles.titleBar}
      style={{ zIndex }}
      onMouseDown={onFocus}
    >
      <div className={styles.window} data-e2e="win95-loading-widget">
        {/* Title bar */}
        <div className={styles.titleBar}>
          <div className={styles.titleText}>
            Daniele_Tortora_Portfolio.exe - Interactive Portfolio
          </div>
          <div className={styles.systemButtons}>
            <button
              className={styles.closeButton}
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              aria-label="Cancel loading"
              type="button"
            >
              <span>×</span>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className={styles.content}>
          <div className={styles.loadingText}>Loading...</div>

          {/* Progress bar */}
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBar}>
              {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
                <div
                  key={i}
                  className={`${styles.progressSegment} ${i < progress ? styles.filled : ""}`}
                />
              ))}
            </div>
          </div>

          {/* Cancel button */}
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
