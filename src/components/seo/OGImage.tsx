import { PROFILE } from "../../config/profile";
import { SEO_CONFIG } from "../../config/seo";
import retroDaniele from "../../assets/retro-daniele.png";
import "./OGImage.css";

/**
 * OG Image Component
 * Renders a 1200x630 image optimized for social sharing
 * Access via /?og-image=true in development
 */
export function OGImage() {
  const topSkills = ["React", "TypeScript", "Node.js", "AI"];

  return (
    <div className="og-image">
      {/* Decorative pixel corners */}
      <div className="og-image__decoration og-image__decoration--tl" />
      <div className="og-image__decoration og-image__decoration--tr" />
      <div className="og-image__decoration og-image__decoration--bl" />
      <div className="og-image__decoration og-image__decoration--br" />

      {/* Header */}
      <div className="og-image__header">
        <span className="og-image__speaker">{PROFILE.name.split(" ")[0]}</span>
      </div>

      <div className="og-image__container">
        <div className="og-image__left">
          <img
            src={retroDaniele}
            alt={PROFILE.name}
            className="og-image__avatar"
          />
        </div>
        <div className="og-image__right">
          <h1 className="og-image__name">{PROFILE.name}</h1>
          <p className="og-image__title">{SEO_CONFIG.currentRole}</p>
          <p className="og-image__description">{SEO_CONFIG.shortDescription}</p>
          <div className="og-image__skills">
            {topSkills.map((skill) => (
              <span key={skill} className="og-image__skill">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="og-image__footer">
        <span className="og-image__url">
          {SEO_CONFIG.siteUrl.replace("https://", "")}
        </span>
      </div>
    </div>
  );
}
