import "./Hotspot.css";

export interface HotspotConfig {
  id: string;
  /** Position as percentage from left */
  left: number;
  /** Position as percentage from top */
  top: number;
  /** Width as percentage */
  width: number;
  /** Height as percentage */
  height: number;
  /** Action to trigger */
  action: string;
  /** Label for accessibility */
  label: string;
}

interface HotspotProps {
  config: HotspotConfig;
  isHovered: boolean;
  onClick: (id: string) => void;
  onHover: (id: string | null) => void;
}

/**
 * Interactive hotspot overlay
 * Positioned as percentage-based overlay on top of the background image
 */
export function Hotspot({ config, isHovered, onClick, onHover }: HotspotProps) {
  return (
    <button
      className={`hotspot ${isHovered ? "hotspot--hovered" : ""}`}
      style={{
        left: `${config.left}%`,
        top: `${config.top}%`,
        width: `${config.width}%`,
        height: `${config.height}%`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(config.id);
      }}
      onMouseEnter={() => onHover(config.id)}
      onMouseLeave={() => onHover(null)}
      aria-label={config.label}
      tabIndex={-1}
    >
      <span className="hotspot__label">{config.label}</span>
    </button>
  );
}
