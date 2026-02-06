import { Github, Linkedin, MessageCircle } from "lucide-react";
import styles from "./IconGrid.module.scss";
import { useGameStore } from "../../store/gameStore";
import { PROFILE } from "../../config/profile";

/**
 * 2x2 grid of buttons matching the retro SCUMM toolbar style
 * - Top row: Social links (GitHub, LinkedIn)
 * - Bottom row: Talk and (placeholder for future feature)
 */
export function IconGrid() {
  const { openDialog, setHoveredObject } = useGameStore();

  return (
    <div className={styles.grid}>
      {/* Row 1: Social links */}
      <a
        className={styles.button}
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
        className={styles.button}
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

      {/* Row 2: Talk button */}
      <button
        className={styles.buttonHighlight}
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
    </div>
  );
}
