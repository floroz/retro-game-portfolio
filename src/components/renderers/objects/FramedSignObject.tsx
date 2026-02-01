import "./FramedSignObject.css";

interface FramedSignObjectProps {
  highlighted?: boolean;
}

/**
 * Framed certificate/sign for Resume section
 */
export function FramedSignObject({
  highlighted = false,
}: FramedSignObjectProps) {
  return (
    <div
      className={`framed-sign ${highlighted ? "framed-sign--highlighted" : ""}`}
      role="button"
      tabIndex={-1}
      aria-label="Resume - click to interact"
    >
      {/* Frame */}
      <div className="framed-sign__frame">
        {/* Inner mat */}
        <div className="framed-sign__mat">
          {/* Certificate content */}
          <div className="framed-sign__content">
            <div className="framed-sign__header">CV</div>
            <div className="framed-sign__lines">
              <div className="framed-sign__line" />
              <div className="framed-sign__line" />
              <div className="framed-sign__line" />
              <div className="framed-sign__line framed-sign__line--short" />
            </div>
            <div className="framed-sign__seal" />
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="framed-sign__label">Resume</div>
    </div>
  );
}
