import { sectionInspection } from "../../config/inspections";
import { PROFILE } from "../../config/profile";
import type { SectionId } from "../../engine/types";
import styles from "./PocketAdventure.module.scss";

/** Reading is ordinary scrolling HTML, independent of the painted scene. */
export function PocketReading({ section }: { section: SectionId }) {
  const inspection = sectionInspection(section);
  return (
    <>
      <img
        className={styles.readingArt}
        src={inspection.art}
        alt={inspection.artAlt}
      />
      <div className={styles.paper}>
        <p className={styles.eyebrow}>{inspection.subtitle}</p>
        <h1>{section === "resume" ? "Résumé" : inspection.title}</h1>
        {section === "experience" ? (
          <>
            <p>{PROFILE.experienceSummary.split("\n\n")[0]}</p>
            <ol className={styles.career}>
              {PROFILE.workExperience.map((job) => (
                <li key={`${job.company}-${job.period}`}>
                  <p className={styles.period}>{job.period}</p>
                  <h2>{job.company}</h2>
                  <p>{job.role}</p>
                </li>
              ))}
            </ol>
            <h2>Between the pages</h2>
            {PROFILE.experienceSummary
              .split("\n\n")
              .slice(1)
              .map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
          </>
        ) : (
          inspection.pages?.map((page, index) => (
            <section
              className={styles.readingSection}
              key={`${page.title}-${index}`}
            >
              {(index === 0 ||
                page.title !== inspection.pages?.[index - 1]?.title) && (
                <h2>{page.title}</h2>
              )}
              {page.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {page.links && (
                <ul className={styles.links}>
                  {page.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target={
                          link.href.startsWith("mailto:") ? undefined : "_blank"
                        }
                        rel="noopener noreferrer"
                      >
                        {link.label} <span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}
      </div>
    </>
  );
}
