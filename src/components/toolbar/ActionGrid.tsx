import styles from "./ActionGrid.module.scss";
import { useGameStore } from "../../store/gameStore";
import type { SectionId } from "../../engine/types";
import { COUNTRIES, SECTIONS } from "../../config/sections";
import { PixelIcon } from "../shared/PixelIcon";

const ACTIONS: SectionId[] = [
  "experience",
  "skills",
  "about",
  "contact",
  "resume",
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
      {ACTIONS.map((action) => {
        const label = SECTIONS[action].label;
        return (
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
            <PixelIcon section={action} className={styles.icon} />
            <span className={styles.label}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
