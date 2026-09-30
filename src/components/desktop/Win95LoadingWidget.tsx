import { useEffect, useEffectEvent, useState } from "react";
import { Rnd } from "react-rnd";
import styles from "./Win95LoadingWidget.module.scss";

interface Win95LoadingWidgetProps {
  onCancel: () => void;
  onComplete: () => void;
  isActive: boolean;
  onFocus: () => void;
  zIndex: number;
}

const LOADING_DURATION = 1500;
const TOTAL_SEGMENTS = 22;

/** Windows 98 launch dialog. Every scheduled callback is disposed on close. */
export function Win95LoadingWidget({
  onCancel,
  onComplete,
  isActive,
  onFocus,
  zIndex,
}: Win95LoadingWidgetProps) {
  const [progress, setProgress] = useState(0);
  const completeLoading = useEffectEvent(onComplete);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(
        Math.min(
          TOTAL_SEGMENTS,
          Math.floor((elapsed / LOADING_DURATION) * TOTAL_SEGMENTS),
        ),
      );
    }, LOADING_DURATION / TOTAL_SEGMENTS);
    const completion = window.setTimeout(() => {
      window.clearInterval(interval);
      setProgress(TOTAL_SEGMENTS);
      completeLoading();
    }, LOADING_DURATION + 100);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(completion);
    };
  }, []);

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
