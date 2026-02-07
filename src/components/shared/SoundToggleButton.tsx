import { useCallback } from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./SoundToggleButton.module.scss";

/**
 * Retro-styled sound toggle button
 * Position-agnostic - parent components handle positioning
 */
export function SoundToggleButton() {
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const toggleSound = useGameStore((state) => state.toggleSound);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleSound();
    },
    [toggleSound],
  );

  return (
    <button
      className={`${styles.soundToggle} ${soundEnabled ? styles.soundToggleOn : styles.soundToggleOff}`}
      onClick={handleClick}
      aria-pressed={soundEnabled}
      aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
      title={soundEnabled ? "Click to mute" : "Click for sound effects!"}
    >
      <span className={styles.soundIcon} aria-hidden="true">
        {soundEnabled ? "📢" : "🔇"}
      </span>
      <span className={styles.soundLabel}>
        Sound {soundEnabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}
