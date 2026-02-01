import styles from "./Toolbar.module.scss";
import { ActionGrid } from "./ActionGrid";
import { IconGrid } from "./IconGrid";
import { useGameStore } from "../../store/gameStore";

/**
 * SCUMM-style toolbar at bottom of game canvas
 * Layout: ActionGrid (40%) | Status Text (40%) | IconGrid (20%)
 */
export function Toolbar() {
  const { hoveredObject, activeAction } = useGameStore();

  // Generate status text based on current state
  const getStatusText = () => {
    if (activeAction) {
      return `View ${activeAction.charAt(0).toUpperCase() + activeAction.slice(1)}`;
    }
    if (hoveredObject) {
      const labels: Record<string, string> = {
        experience: "View Experience",
        projects: "View Projects",
        skills: "View Skills",
        contact: "View Contact",
        resume: "View Resume",
        about: "View About",
        github: "Visit GitHub Profile",
        linkedin: "Visit LinkedIn Profile",
        talk: "Talk to Daniele",
        terminal: "Open Terminal",
      };
      return labels[hoveredObject] || hoveredObject;
    }
    return "Click to move or explore";
  };

  return (
    <div className={styles.toolbar} data-e2e="toolbar">
      <div className={styles.actions}>
        <ActionGrid />
      </div>

      <div className={styles.status}>
        <span className={styles.statusText}>{getStatusText()}</span>
      </div>

      <div className={styles.icons}>
        <IconGrid />
      </div>
    </div>
  );
}
