import "./Toolbar.css";
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
    <div className="toolbar" data-e2e="toolbar">
      <div className="toolbar__actions">
        <ActionGrid />
      </div>

      <div className="toolbar__status">
        <span className="toolbar__status-text">{getStatusText()}</span>
      </div>

      <div className="toolbar__icons">
        <IconGrid />
      </div>
    </div>
  );
}
