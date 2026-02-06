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
  return (
    <div className="og-image">
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
          <p className="og-image__title">Senior Software Engineer</p>
          <p className="og-image__description">{SEO_CONFIG.shortDescription}</p>
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
