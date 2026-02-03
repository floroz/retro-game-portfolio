import { useCallback } from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./MobileASCIIWelcome.module.scss";

interface MobileASCIIWelcomeProps {
  onDismiss: () => void;
}

export function MobileASCIIWelcome({ onDismiss }: MobileASCIIWelcomeProps) {
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const toggleSound = useGameStore((state) => state.toggleSound);

  const handleTap = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      onDismiss();
    },
    [onDismiss],
  );

  const handleSoundToggle = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      toggleSound();
    },
    [toggleSound],
  );

  return (
    <div
      className={styles.screen}
      data-e2e="mobile-ascii-welcome"
      onClick={handleTap}
      onTouchEnd={handleTap}
    >
      <div className={styles.scanlines} />

      {/* Sound toggle */}
      <div className={styles.soundCorner}>
        <button
          className={`${styles.soundToggle} ${soundEnabled ? styles.soundToggleOn : ""}`}
          onClick={handleSoundToggle}
          onTouchEnd={handleSoundToggle}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? "Sound enabled" : "Sound disabled"}
        >
          <span className={styles.soundIcon} aria-hidden="true">
            {soundEnabled ? "🔊" : "🔇"}
          </span>
        </button>
      </div>

      {/* Pixel art title */}
      <div className={styles.content}>
        <h1 className={styles.name}>Daniele Tortora</h1>
        <p className={styles.title}>Senior Software Engineer</p>
      </div>

      <div className={styles.tapHint}>[ Tap anywhere to continue ]</div>
    </div>
  );
}
