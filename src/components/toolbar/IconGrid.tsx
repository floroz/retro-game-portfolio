import { Github, Linkedin, MessageCircle } from "lucide-react";
import styles from "./IconGrid.module.scss";
import { useGameStore } from "../../store/gameStore";
import { PROFILE } from "../../config/profile";

/**
 * 2x2 grid of buttons matching the retro SCUMM toolbar style
 * - Top row: Social links (GitHub, LinkedIn)
 * - Bottom row: Talk and Sound toggle
 */
export function IconGrid() {
  const { openDialog, setHoveredObject, toggleSound, soundEnabled } =
    useGameStore();

  return (
    <div className={styles.grid}>
      {/* Row 1: Social links */}
      <a
        className={styles.buttonGithub}
        data-e2e="toolbar-button"
        href={PROFILE.social.github}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHoveredObject("github")}
        onMouseLeave={() => setHoveredObject(null)}
      >
        <Github className={styles.icon} size={12} strokeWidth={2} />
        <span className={styles.label}>GitHub</span>
      </a>
      <a
        className={styles.buttonLinkedin}
        data-e2e="toolbar-button"
        href={PROFILE.social.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHoveredObject("linkedin")}
        onMouseLeave={() => setHoveredObject(null)}
      >
        <Linkedin className={styles.icon} size={12} strokeWidth={2} />
        <span className={styles.label}>LinkedIn</span>
      </a>

      {/* Row 2: Talk button + Sound toggle */}
      <button
        className={styles.buttonTalk}
        data-e2e="toolbar-button"
        onClick={() => openDialog("intro")}
        onMouseEnter={() => setHoveredObject("talk")}
        onMouseLeave={() => setHoveredObject(null)}
        type="button"
        tabIndex={0}
      >
        <MessageCircle className={styles.icon} size={12} strokeWidth={2} />
        <span className={styles.label}>Talk</span>
      </button>
      <button
        className={`${styles.buttonSound} ${soundEnabled ? styles.soundOn : styles.soundOff}`}
        data-e2e="toolbar-button"
        onClick={toggleSound}
        onMouseEnter={() => setHoveredObject("sound")}
        onMouseLeave={() => setHoveredObject(null)}
        aria-pressed={soundEnabled}
        aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
        type="button"
        tabIndex={0}
      >
        <span className={styles.soundIcon} aria-hidden="true">
          {soundEnabled ? "📢" : "🔇"}
        </span>
        <span className={styles.label}>
          Sound {soundEnabled ? "ON" : "OFF"}
        </span>
      </button>
    </div>
  );
}
