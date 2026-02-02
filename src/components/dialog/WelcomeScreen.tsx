import { useEffect, useCallback } from "react";
import { DialogPortrait } from "./DialogPortrait";
import { useIsMobile } from "../../hooks/useIsMobile";
import { SoundToggleButton } from "../shared/SoundToggleButton";
import styles from "./WelcomeScreen.module.scss";

interface WelcomeScreenProps {
  onDismiss: () => void;
}

/**
 * Full-screen welcome intro featuring large portrait
 * Displays once per session, dismisses only on SPACE key or clicking the prompt
 */
export function WelcomeScreen({ onDismiss }: WelcomeScreenProps) {
  const isMobile = useIsMobile();

  // Handle dismiss - only triggered by space key or clicking prompt
  const handleDismiss = useCallback(() => {
    // Optional: Haptic feedback on mobile
    if (isMobile && "vibrate" in navigator) {
      navigator.vibrate(50);
    }

    onDismiss();
  }, [isMobile, onDismiss]);

  // Handle prompt click
  const handlePromptClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleDismiss();
    },
    [handleDismiss],
  );

  // Handle touch events on mobile
  const handleTouch = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleDismiss();
    },
    [handleDismiss],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only dismiss on SPACE key
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDismiss]);

  return (
    <div
      className={styles.screen}
      data-e2e="welcome-screen"
      role="dialog"
      aria-modal="true"
      aria-label={
        isMobile
          ? "Welcome screen - tap to start"
          : "Welcome screen - press space to start"
      }
      onTouchEnd={isMobile ? handleTouch : undefined}
    >
      {/* CRT scanline overlay */}
      <div className={styles.scanlines} aria-hidden="true" />

      {/* Sound toggle in corner */}
      <div className={styles.soundToggleWrapper}>
        <SoundToggleButton />
      </div>

      {/* Content container */}
      <div className={styles.content}>
        {/* Large portrait with frame */}
        <div className={styles.portraitWrapper}>
          <DialogPortrait size="large" />
        </div>

        {/* Name and title */}
        <h1 className={styles.name} data-e2e="welcome-screen-name">
          DANIELE TORTORA
        </h1>
        <p className={styles.title} data-e2e="welcome-screen-title">
          Senior Software Engineer
        </p>

        {/* Press space to start prompt - clickable */}
        <button
          className={styles.prompt}
          data-e2e="welcome-screen-prompt"
          onClick={handlePromptClick}
          aria-label={
            isMobile ? "Tap to start" : "Press space or click to start"
          }
        >
          {isMobile ? "[ Tap to begin ]" : "[ Press SPACE to start ]"}
        </button>
      </div>

      {/* Decorative corner elements */}
      <div className={`${styles.corner} ${styles.cornerTl}`} />
      <div className={`${styles.corner} ${styles.cornerTr}`} />
      <div className={`${styles.corner} ${styles.cornerBl}`} />
      <div className={`${styles.corner} ${styles.cornerBr}`} />
    </div>
  );
}
