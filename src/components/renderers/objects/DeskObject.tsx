import "./DeskObject.css";

interface DeskObjectProps {
  highlighted?: boolean;
}

/**
 * Reception desk for Projects section
 * L-shaped counter with items on top
 */
export function DeskObject({ highlighted = false }: DeskObjectProps) {
  return (
    <div
      className={`desk ${highlighted ? "desk--highlighted" : ""}`}
      role="button"
      tabIndex={-1}
      aria-label="Projects - click to interact"
    >
      {/* Desk surface */}
      <div className="desk__surface">
        {/* Items on desk */}
        <div className="desk__computer">
          <div className="desk__monitor" />
          <div className="desk__keyboard" />
        </div>
        <div className="desk__papers" />
        <div className="desk__mug" />
      </div>

      {/* Desk front */}
      <div className="desk__front">
        <div className="desk__panel" />
        <div className="desk__panel" />
      </div>

      {/* Label */}
      <div className="desk__label">Projects</div>
    </div>
  );
}
