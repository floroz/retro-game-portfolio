import { Briefcase, Wrench, User, Phone, FileText } from "lucide-react";
import styles from "./ActionGrid.module.scss";
import { useGameStore } from "../../store/gameStore";
import type { SectionId } from "../../engine/types";
import { COUNTRIES, SECTIONS } from "../../config/sections";
import type { LucideIcon } from "lucide-react";

interface ActionButton {
  action: SectionId;
  label: string;
  icon: LucideIcon;
}

const ACTIONS: ActionButton[] = [
  { action: "experience", label: "Experience", icon: Briefcase },
  { action: "skills", label: "Skills", icon: Wrench },
  { action: "about", label: "About", icon: User },
  { action: "contact", label: "Contact", icon: Phone },
  { action: "resume", label: "Resume", icon: FileText },
];

/**
 * 2x3 grid of verb shortcuts. Each reaches its section in one click: Daniele
 * walks to the nearest exit, flies to the section's country, and the content
 * opens on arrival. A click during the trip skips straight to the content.
 */
export function ActionGrid() {
  const setHoveredObject = useGameStore((state) => state.setHoveredObject);
  const goToSection = useGameStore((state) => state.goToSection);

  const handleActionClick = (action: SectionId) => {
    const { terminalScreenAction, terminalOpen, gameWindowActive } =
      useGameStore.getState();
    // Ignore clicks while content is open, or while another window has focus.
    if (terminalScreenAction) return;
    if (terminalOpen && !gameWindowActive) return;
    goToSection(action);
  };

  return (
    <div className={styles.grid}>
      {ACTIONS.map(({ action, label, icon: Icon }) => (
        <button
          key={action}
          className={styles.button}
          data-e2e="toolbar-button"
          onClick={() => handleActionClick(action)}
          onMouseEnter={() =>
            setHoveredObject(
              `View ${label} (${COUNTRIES[SECTIONS[action].home].name})`,
            )
          }
          onMouseLeave={() => setHoveredObject(null)}
          type="button"
          title={label}
          tabIndex={0}
        >
          <Icon className={styles.icon} size={12} strokeWidth={2} />
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </div>
  );
}
