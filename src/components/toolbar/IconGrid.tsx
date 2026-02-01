import { Github, Linkedin, Terminal, MessageCircle } from "lucide-react";
import "./IconGrid.css";
import { useGameStore } from "../../store/gameStore";
import { PROFILE } from "../../config/profile";

/**
 * 2x2 grid of buttons matching the retro SCUMM toolbar style
 * - Top row: Social links (GitHub, LinkedIn)
 * - Bottom row: Talk and Terminal
 */
export function IconGrid() {
  const { toggleTerminal, openDialog, setHoveredObject } = useGameStore();

  return (
    <div className="icon-grid">
      {/* Row 1: Social links */}
      <a
        className="icon-grid__button"
        href={PROFILE.social.github}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHoveredObject("github")}
        onMouseLeave={() => setHoveredObject(null)}
      >
        <Github className="icon-grid__icon" size={12} strokeWidth={2} />
        <span className="icon-grid__label">GitHub</span>
      </a>
      <a
        className="icon-grid__button"
        href={PROFILE.social.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHoveredObject("linkedin")}
        onMouseLeave={() => setHoveredObject(null)}
      >
        <Linkedin className="icon-grid__icon" size={12} strokeWidth={2} />
        <span className="icon-grid__label">LinkedIn</span>
      </a>

      {/* Row 2: Talk and Terminal */}
      <button
        className="icon-grid__button icon-grid__button--highlight"
        onClick={() => openDialog("intro")}
        onMouseEnter={() => setHoveredObject("talk")}
        onMouseLeave={() => setHoveredObject(null)}
        type="button"
        tabIndex={0}
      >
        <MessageCircle className="icon-grid__icon" size={12} strokeWidth={2} />
        <span className="icon-grid__label">Talk</span>
      </button>
      <button
        className="icon-grid__button icon-grid__button--highlight"
        onClick={toggleTerminal}
        onMouseEnter={() => setHoveredObject("terminal")}
        onMouseLeave={() => setHoveredObject(null)}
        type="button"
        tabIndex={0}
      >
        <Terminal className="icon-grid__icon" size={12} strokeWidth={2} />
        <span className="icon-grid__label">Terminal</span>
      </button>
    </div>
  );
}
