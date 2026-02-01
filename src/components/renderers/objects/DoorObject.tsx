import "./DoorObject.css";

interface DoorObjectProps {
  label: string;
  variant?: "office" | "default";
  highlighted?: boolean;
}

/**
 * Door object - used for Experience/Office section
 * Styled like a classic office door with sign
 */
export function DoorObject({
  label,
  variant = "default",
  highlighted = false,
}: DoorObjectProps) {
  return (
    <div
      className={`door door--${variant} ${highlighted ? "door--highlighted" : ""}`}
      role="button"
      tabIndex={-1}
      aria-label={`${label} - click to interact`}
    >
      {/* Door frame */}
      <div className="door__frame">
        {/* Door body */}
        <div className="door__body">
          {/* Window */}
          <div className="door__window">
            <div className="door__window-text">{label}</div>
          </div>

          {/* Door handle */}
          <div className="door__handle" />

          {/* Door panels */}
          <div className="door__panel door__panel--top" />
          <div className="door__panel door__panel--bottom" />
        </div>
      </div>

      {/* Sign below or on door */}
      <div className="door__sign">{label}</div>
    </div>
  );
}
