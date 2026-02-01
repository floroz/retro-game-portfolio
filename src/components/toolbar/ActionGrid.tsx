import {
  Briefcase,
  FolderKanban,
  Wrench,
  User,
  Phone,
  FileText,
} from "lucide-react";
import "./ActionGrid.css";
import { useSceneClick } from "../../hooks/useSceneClick";
import { useGameStore } from "../../store/gameStore";
import type { ActionType } from "../../types/game";
import type { LucideIcon } from "lucide-react";

interface ActionButton {
  action: ActionType;
  label: string;
  icon: LucideIcon;
}

const ACTIONS: ActionButton[] = [
  { action: "experience", label: "Experience", icon: Briefcase },
  { action: "projects", label: "Projects", icon: FolderKanban },
  { action: "skills", label: "Skills", icon: Wrench },
  { action: "about", label: "About", icon: User },
  { action: "contact", label: "Contact", icon: Phone },
  { action: "resume", label: "Resume", icon: FileText },
];

/**
 * 2x3 grid of action buttons with Lucide icons
 */
export function ActionGrid() {
  const { handleActionClick } = useSceneClick();
  const setHoveredObject = useGameStore((state) => state.setHoveredObject);

  return (
    <div className="action-grid">
      {ACTIONS.map(({ action, label, icon: Icon }) => (
        <button
          key={action}
          className="action-grid__button"
          onClick={() => handleActionClick(action)}
          onMouseEnter={() => setHoveredObject(action)}
          onMouseLeave={() => setHoveredObject(null)}
          type="button"
          title={label}
          tabIndex={0}
        >
          <Icon className="action-grid__icon" size={12} strokeWidth={2} />
          <span className="action-grid__label">{label}</span>
        </button>
      ))}
    </div>
  );
}
