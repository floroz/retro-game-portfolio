import styles from "./Toolbar.module.scss";
import { ActionGrid } from "./ActionGrid";
import { IconGrid } from "./IconGrid";
import { useGameStore } from "../../store/gameStore";
import { COUNTRIES, sectionList } from "../../config/sections";

/**
 * SCUMM-style toolbar at bottom of game canvas
 * Layout: ActionGrid (40%) | Status Text (40%) | IconGrid (20%)
 */
export function Toolbar() {
  const hoveredObject = useGameStore((state) => state.hoveredObject);
  const skippable = useGameStore((state) => state.skippable);
  const flyingTo = useGameStore((state) => state.flyingTo);

  // Generate status text based on current state
  const getStatusText = () => {
    // The travel map labels only the city; the status line names its
    // sections (docs/expansion-plan.md, "How visitors know where each
    // section is").
    if (flyingTo) {
      return `Off to ${COUNTRIES[flyingTo].name}: ${sectionList(flyingTo)}`;
    }
    if (skippable) return "Click to skip";
    if (hoveredObject) {
      // Section buttons send their own text ("Skills, in London").
      const labels: Record<string, string> = {
        github: "Visit GitHub Profile",
        linkedin: "Visit LinkedIn Profile",
        talk: "Talk to Daniele",
        terminal: "Open Terminal",
        sound: "Toggle Sound",
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
        <span className={styles.statusText} data-e2e="toolbar-status">
          {getStatusText()}
        </span>
      </div>

      <div className={styles.icons}>
        <IconGrid />
      </div>
    </div>
  );
}
