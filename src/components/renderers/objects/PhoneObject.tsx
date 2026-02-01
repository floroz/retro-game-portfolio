import "./PhoneObject.css";

interface PhoneObjectProps {
  highlighted?: boolean;
}

/**
 * Wall-mounted retro phone for Contact section
 */
export function PhoneObject({ highlighted = false }: PhoneObjectProps) {
  return (
    <div
      className={`phone ${highlighted ? "phone--highlighted" : ""}`}
      role="button"
      tabIndex={-1}
      aria-label="Contact - click to interact"
    >
      {/* Phone base/mount */}
      <div className="phone__mount" />

      {/* Phone body */}
      <div className="phone__body">
        {/* Dial/buttons */}
        <div className="phone__dial">
          <div className="phone__button" />
          <div className="phone__button" />
          <div className="phone__button" />
          <div className="phone__button" />
          <div className="phone__button" />
          <div className="phone__button" />
          <div className="phone__button" />
          <div className="phone__button" />
          <div className="phone__button" />
        </div>
      </div>

      {/* Handset */}
      <div className="phone__handset">
        <div className="phone__earpiece" />
        <div className="phone__handle" />
        <div className="phone__mouthpiece" />
      </div>

      {/* Cord */}
      <div className="phone__cord" />

      {/* Label */}
      <div className="phone__label">Contact</div>
    </div>
  );
}
