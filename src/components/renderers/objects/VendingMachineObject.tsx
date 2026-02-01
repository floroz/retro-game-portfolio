import "./VendingMachineObject.css";

interface VendingMachineObjectProps {
  highlighted?: boolean;
}

/**
 * Vending machine for Skills section
 * Muted DotT-style colors, no neon effects
 */
export function VendingMachineObject({
  highlighted = false,
}: VendingMachineObjectProps) {
  return (
    <div
      className={`vending ${highlighted ? "vending--highlighted" : ""}`}
      role="button"
      tabIndex={-1}
      aria-label="Skills - click to interact"
    >
      {/* Machine body */}
      <div className="vending__body">
        {/* Top sign */}
        <div className="vending__sign">SKILLS</div>

        {/* Display window */}
        <div className="vending__display">
          <div className="vending__item vending__item--1" />
          <div className="vending__item vending__item--2" />
          <div className="vending__item vending__item--3" />
          <div className="vending__item vending__item--4" />
          <div className="vending__item vending__item--5" />
          <div className="vending__item vending__item--6" />
        </div>

        {/* Control panel */}
        <div className="vending__panel">
          <div className="vending__buttons">
            <div className="vending__btn vending__btn--a" />
            <div className="vending__btn vending__btn--b" />
            <div className="vending__btn vending__btn--c" />
          </div>
          <div className="vending__slot" />
        </div>

        {/* Dispenser */}
        <div className="vending__dispenser" />
      </div>

      {/* Label */}
      <div className="vending__label">Skills</div>
    </div>
  );
}
