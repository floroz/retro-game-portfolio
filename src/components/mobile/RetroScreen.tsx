import { useState, type ReactNode } from "react";
import type { RetroSectionId } from "../../hooks/useRetroNavigation";
import { MENU_ITEMS } from "../../hooks/useRetroNavigation";
import {
  AboutContent,
  ExperienceContent,
  SkillsContent,
  ContactContent,
  ResumeContent,
} from "./RetroContent";
import styles from "./RetroScreen.module.scss";

const SECTION_TITLES: Record<RetroSectionId, string> = {
  about: "ABOUT",
  experience: "EXPERIENCE",
  skills: "SKILLS",
  contact: "CONTACT",
  resume: "RESUME",
};

const SECTION_CONTENT: Record<RetroSectionId, ReactNode> = {
  about: <AboutContent />,
  experience: <ExperienceContent />,
  skills: <SkillsContent />,
  contact: <ContactContent />,
  resume: <ResumeContent />,
};

interface RetroScreenProps {
  cursorIndex: number;
  activeSection: RetroSectionId | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onSelectItem: (index: number) => void;
}

/**
 * RetroScreen — the LCD display area of the Game Boy console.
 * Shows either a vertical menu with ">" cursor or a scrollable section view.
 */
export function RetroScreen({
  cursorIndex,
  activeSection,
  scrollRef,
  onSelectItem,
}: RetroScreenProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  if (activeSection) {
    return (
      <div className={styles.screen} data-e2e="retro-section-view">
        {/* Section title bar */}
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            {SECTION_TITLES[activeSection]}
          </span>
          <span className={styles.sectionHint}>B:BACK</span>
        </div>

        {/* Scrollable content */}
        <div
          className={styles.sectionContent}
          ref={scrollRef}
          role="region"
          aria-label={SECTION_TITLES[activeSection]}
          data-e2e="retro-section-content"
        >
          {SECTION_CONTENT[activeSection]}
        </div>
      </div>
    );
  }

  // Menu view
  return (
    <div className={styles.screen} data-e2e="retro-menu">
      {/* Title */}
      <div className={styles.menuTitle}>RETRO PERSONAL WEBSITE</div>

      {/* Menu list with ">" cursor */}
      <nav className={styles.menuList} role="list" aria-label="Main menu">
        {MENU_ITEMS.map((item, index) => (
          <button
            key={item.id}
            className={`${styles.menuItem} ${index === cursorIndex ? styles.menuItemActive : ""}`}
            onClick={() => onSelectItem(index)}
            role="listitem"
            aria-label={item.label}
            aria-current={index === cursorIndex ? "true" : undefined}
            data-e2e={`retro-menu-item-${item.id}`}
            type="button"
          >
            <span
              className={styles.cursor}
              aria-hidden="true"
              data-e2e={index === cursorIndex ? "retro-cursor" : undefined}
            >
              {index === cursorIndex ? ">" : "\u00A0"}
            </span>
            <span className={styles.menuLabel}>{item.label.toUpperCase()}</span>
          </button>
        ))}
      </nav>

      {/* Desktop prompt banner */}
      {!bannerDismissed && (
        <div
          className={styles.desktopBanner}
          role="note"
          data-e2e="retro-desktop-banner"
        >
          <span className={styles.bannerText}>
            Visit on desktop for the full adventure!
          </span>
          <button
            className={styles.bannerDismiss}
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss banner"
            data-e2e="retro-banner-dismiss"
            type="button"
          >
            X
          </button>
        </div>
      )}
    </div>
  );
}
