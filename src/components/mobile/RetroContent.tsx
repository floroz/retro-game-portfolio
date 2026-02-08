import { PROFILE } from "../../config/profile";
import styles from "./RetroContent.module.scss";

/** About section — bio from PROFILE.bio, Game Boy LCD style */
export function AboutContent() {
  const paragraphs = PROFILE.bio.split("\n\n");
  const mainParagraphs = paragraphs.slice(0, -1);
  const funFacts = paragraphs[paragraphs.length - 1];

  return (
    <div>
      <h3 className={styles.heading}>ABOUT ME</h3>
      {mainParagraphs.map((p, i) => (
        <p key={i} className={styles.paragraph}>
          {p}
        </p>
      ))}

      <h3 className={styles.heading}>OFF DUTY</h3>
      <div className={styles.callout}>
        {funFacts.split("\n").map((line, i) => (
          <p
            key={i}
            className={styles.paragraph}
            style={{
              marginBottom:
                i === funFacts.split("\n").length - 1 ? 0 : "0.375rem",
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Experience section — work history timeline */
export function ExperienceContent() {
  return (
    <div>
      <h3 className={styles.heading}>WORK HISTORY</h3>
      {PROFILE.workExperience.map((job, i) => (
        <div key={i} className={styles.card}>
          <h4 className={styles.cardTitle}>{job.company}</h4>
          <p className={styles.cardBody}>{job.role}</p>
          <p className={styles.cardMeta}>{job.period}</p>
        </div>
      ))}

      <h3 className={styles.heading}>SUMMARY</h3>
      {PROFILE.experienceSummary.split("\n\n").map((p, i) => (
        <p key={i} className={styles.paragraph}>
          {p.split("\n").map((line, j) => (
            <span key={j}>
              {line}
              {j < p.split("\n").length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

/** Skills section — grouped skill tags */
export function SkillsContent() {
  const categories: { key: keyof typeof PROFILE.skills; label: string }[] = [
    { key: "frontend", label: "FRONTEND" },
    { key: "backend", label: "BACKEND" },
    { key: "ai", label: "AI & ML" },
    { key: "cloud", label: "CLOUD & DEVOPS" },
    { key: "data", label: "DATA" },
    { key: "testing", label: "TESTING" },
    { key: "leadership", label: "LEADERSHIP" },
  ];

  return (
    <div>
      {categories.map(({ key, label }) => (
        <div key={key}>
          <h3 className={styles.heading}>{label}</h3>
          <div className={styles.tagGroup}>
            {PROFILE.skills[key].map((skill) => (
              <span key={skill} className={styles.tag}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Contact section — retro list with ">" prefix, tappable links */
export function ContactContent() {
  return (
    <div>
      <h3 className={styles.heading}>GET IN TOUCH</h3>

      <a
        href={`mailto:${PROFILE.email}`}
        className={styles.linkRow}
        data-e2e="retro-contact-email"
      >
        <span className={styles.linkPrefix} aria-hidden="true">
          {">"}
        </span>
        <span className={styles.linkLabel}>{PROFILE.email}</span>
      </a>

      <a
        href={PROFILE.social.linkedin}
        className={styles.linkRow}
        target="_blank"
        rel="noopener noreferrer"
        data-e2e="retro-contact-linkedin"
      >
        <span className={styles.linkPrefix} aria-hidden="true">
          {">"}
        </span>
        <span className={styles.linkLabel}>LinkedIn</span>
      </a>

      <a
        href={PROFILE.social.github}
        className={styles.linkRow}
        target="_blank"
        rel="noopener noreferrer"
        data-e2e="retro-contact-github"
      >
        <span className={styles.linkPrefix} aria-hidden="true">
          {">"}
        </span>
        <span className={styles.linkLabel}>GitHub</span>
      </a>

      <div className={styles.linkRow}>
        <span className={styles.linkPrefix} aria-hidden="true">
          {">"}
        </span>
        <span className={styles.linkLabel}>{PROFILE.location}</span>
      </div>

      <h3 className={styles.heading}>INTERESTS</h3>
      <div className={styles.callout}>
        {PROFILE.contactInterests.map((interest, i) => (
          <p
            key={i}
            className={styles.paragraph}
            style={{
              marginBottom:
                i === PROFILE.contactInterests.length - 1 ? 0 : "0.375rem",
            }}
          >
            {">"} {interest}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Resume section — summary + retro download button */
export function ResumeContent() {
  return (
    <div>
      <h3 className={styles.heading}>RESUME</h3>
      <p className={styles.paragraph}>{PROFILE.title}</p>
      <p className={styles.paragraph}>
        {PROFILE.experienceSummary.split("\n\n")[0]}
      </p>

      <a
        href={PROFILE.resumeUrl}
        download
        className={styles.downloadBtn}
        data-e2e="retro-resume-download"
      >
        {">"} DOWNLOAD RESUME (PDF)
      </a>
    </div>
  );
}
