import { useEffect } from "react";
import styles from "./MobileDesktop.module.scss";

interface MobileDesktopProps {
  isOpen: boolean;
  onClose: () => void;
  onCommandSelect: (command: string) => void;
}

interface DesktopIcon {
  id: string;
  label: string;
  command: string;
  icon: React.ReactNode;
}

/**
 * Desktop overlay component with Windows 3.1 style icons
 * Provides a visual GUI alternative to terminal commands
 */
export function MobileDesktop({
  isOpen,
  onClose,
  onCommandSelect,
}: MobileDesktopProps) {
  // Prevent body scroll when desktop is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleIconClick = (command: string) => {
    onCommandSelect(command);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.overlay} ${isOpen ? styles.open : ""}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Desktop shortcuts"
      data-e2e="mobile-desktop"
    >
      <div className={styles.desktop}>
        {/* Header bar */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>DANIELE'S DESKTOP</span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close desktop"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Icon grid */}
        <div className={styles.iconGrid}>
          {DESKTOP_ICONS.map((icon) => (
            <button
              key={icon.id}
              className={styles.iconButton}
              onClick={() => handleIconClick(icon.command)}
              type="button"
              aria-label={`Open ${icon.label}`}
            >
              <div className={styles.iconImage}>{icon.icon}</div>
              <span className={styles.iconLabel}>{icon.label}</span>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className={styles.footer}>
          <span>5 object(s)</span>
          <span>Tap icon to execute</span>
        </div>
      </div>
    </div>
  );
}

// Windows 3.1 style pixel-art icons
const DESKTOP_ICONS: DesktopIcon[] = [
  {
    id: "about",
    label: "ABOUT.EXE",
    command: "about",
    icon: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        {/* Document/paper icon */}
        <rect x="5" y="2" width="12" height="20" fill="#fff" stroke="#000" />
        <path d="M14 2 L17 2 L17 5 L14 5 Z" fill="#c0c0c0" />
        <line x1="7" y1="8" x2="15" y2="8" stroke="#000" />
        <line x1="7" y1="11" x2="15" y2="11" stroke="#000" />
        <line x1="7" y1="14" x2="13" y2="14" stroke="#000" />
        <line x1="7" y1="17" x2="14" y2="17" stroke="#000" />
      </svg>
    ),
  },
  {
    id: "experience",
    label: "EXPERIENCE.EXE",
    command: "experience",
    icon: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        {/* Briefcase icon */}
        <rect x="4" y="8" width="16" height="12" fill="#8b4513" stroke="#000" />
        <rect x="4" y="8" width="16" height="3" fill="#a0522d" />
        <rect x="9" y="5" width="6" height="3" fill="#8b4513" stroke="#000" />
        <rect x="10" y="12" width="4" height="2" fill="#c0c0c0" stroke="#000" />
        <line x1="4" y1="11" x2="20" y2="11" stroke="#000" />
      </svg>
    ),
  },
  {
    id: "skills",
    label: "SKILLS.EXE",
    command: "skills",
    icon: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        {/* Wrench/tools icon */}
        <rect
          x="8"
          y="4"
          width="3"
          height="12"
          fill="#c0c0c0"
          stroke="#000"
          transform="rotate(30 12 12)"
        />
        <rect x="7" y="15" width="4" height="6" fill="#808080" stroke="#000" />
        <circle cx="16" cy="8" r="3" fill="#c0c0c0" stroke="#000" />
        <rect x="15" y="7" width="2" height="2" fill="#000" />
      </svg>
    ),
  },
  {
    id: "contact",
    label: "CONTACT.EXE",
    command: "contact",
    icon: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        {/* Envelope icon */}
        <rect x="3" y="6" width="18" height="12" fill="#fff" stroke="#000" />
        <path d="M3 6 L12 12 L21 6" fill="none" stroke="#000" strokeWidth="1" />
        <path d="M3 6 L12 12 L21 6" fill="#e0e0e0" />
        <line x1="3" y1="6" x2="12" y2="12" stroke="#000" />
        <line x1="21" y1="6" x2="12" y2="12" stroke="#000" />
      </svg>
    ),
  },
  {
    id: "talk",
    label: "TALK.EXE",
    command: "talk",
    icon: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        {/* Speech bubble icon */}
        <rect
          x="4"
          y="5"
          width="16"
          height="11"
          rx="2"
          fill="#fff"
          stroke="#000"
        />
        <path d="M8 16 L10 19 L12 16 Z" fill="#fff" stroke="#000" />
        <circle cx="8" cy="10" r="1" fill="#000" />
        <circle cx="12" cy="10" r="1" fill="#000" />
        <circle cx="16" cy="10" r="1" fill="#000" />
      </svg>
    ),
  },
];
