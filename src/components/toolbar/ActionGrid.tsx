import styles from "./ActionGrid.module.scss";
import { useGameStore } from "../../store/gameStore";
import type { SectionId } from "../../engine/types";
import { SECTIONS, isCountryScene, sectionWhere } from "../../config/sections";
import { PixelIcon } from "../shared/PixelIcon";
import { CountryBadge } from "./CountryBadge";

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
 *
 * The toolbar teaches where each section lives (docs/expansion-plan.md, "How
 * visitors know where each section is"): every button carries its country's
 * badge, hovering it says "Skills, in London", and in a country scene (or on
 * the way to one) the buttons for that scene's sections are lit.
 */
export function ActionGrid() {
  const setHoveredObject = useGameStore((state) => state.setHoveredObject);
  const goToSection = useGameStore((state) => state.goToSection);
  const currentScene = useGameStore((state) => state.currentScene);
  const flyingTo = useGameStore((state) => state.flyingTo);
  // While the travel map plays, the destination's buttons light up already.
  const here = flyingTo ?? (isCountryScene(currentScene) ? currentScene : null);

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
        const { label, home } = SECTIONS[action];
        const where = sectionWhere(action);
        const lit = home === here;
        return (
          <button
            key={action}
            className={lit ? `${styles.button} ${styles.here}` : styles.button}
            data-e2e="toolbar-button"
            data-section={action}
            data-country={home}
            data-here={lit}
            onClick={() => handleActionClick(action)}
            onMouseEnter={() => setHoveredObject(where)}
            onMouseLeave={() => setHoveredObject(null)}
            onFocus={() => setHoveredObject(where)}
            onBlur={() => setHoveredObject(null)}
            type="button"
            title={where}
            aria-label={lit ? `${where} (you are here)` : where}
            tabIndex={0}
          >
            <PixelIcon section={action} className={styles.icon} />
            <span className={styles.label}>{label}</span>
            <CountryBadge country={home} className={styles.badge} />
          </button>
        );
      })}
    </div>
  );
}
