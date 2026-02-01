import retroDaniele from "../../assets/retro-daniele.png";
import styles from "./DialogPortrait.module.scss";

interface DialogPortraitProps {
  /** Size variant for different contexts */
  size?: "small" | "medium" | "large";
  /** Optional additional class name */
  className?: string;
}

/**
 * Reusable portrait component displaying the retro pixel art portrait
 * Used in WelcomeScreen and AdventureDialog
 */
export function DialogPortrait({
  size = "medium",
  className = "",
}: DialogPortraitProps) {
  return (
    <div className={`${styles.portrait} ${styles[size]} ${className}`}>
      <div className={styles.frame}>
        <img
          src={retroDaniele}
          alt="Daniele - Pixel art portrait"
          className={styles.image}
          draggable={false}
        />
      </div>
    </div>
  );
}
