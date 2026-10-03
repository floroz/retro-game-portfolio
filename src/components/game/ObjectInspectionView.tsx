import { useEffect, useId, useRef, type CSSProperties } from "react";
import type { InspectionReading } from "../../config/inspections";
import { useInspectionPagination } from "./useInspectionPagination";
import styles from "./ObjectInspectionView.module.scss";

interface Props {
  inspection: InspectionReading;
  onClose: () => void;
}

/** An illustrated object close-up; text and links remain real, readable HTML. */
export function ObjectInspectionView({ inspection, onClose }: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const {
    pages,
    index: currentPage,
    ready,
    turnPage,
  } = useInspectionPagination(inspection, copy);
  const page = pages[currentPage];

  useEffect(() => {
    const previous = document.activeElement;
    const dialogElement = dialog.current;
    // StrictMode replays this effect while the dialog already has focus.
    // Keep the original scene control instead of saving the dialog itself.
    if (previous instanceof HTMLElement && !dialogElement?.contains(previous))
      opener.current = previous;
    dialogElement?.focus({ preventScroll: true });
    return () => {
      queueMicrotask(() => {
        // Run after React removes inert from the scene; effect replay must
        // never move focus away from a dialog that is still mounted.
        if (!dialogElement?.isConnected && opener.current?.isConnected)
          opener.current.focus({ preventScroll: true });
      });
    };
  }, []);

  return (
    <div className={styles.backdrop}>
      <div
        ref={dialog}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={page ? titleId : undefined}
        aria-label={page ? undefined : inspection.title}
        tabIndex={-1}
        data-e2e="object-inspection"
        data-ready={ready}
        data-travel-art={Boolean(inspection.paperInsets)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            event.stopPropagation();
            turnPage(currentPage + (event.key === "ArrowRight" ? 1 : -1));
          } else if (event.key === "Tab") {
            const controls = [
              ...(dialog.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), a[href], [tabindex="0"]',
              ) ?? []),
            ];
            const first = controls[0];
            const last = controls.at(-1);
            if (
              event.shiftKey &&
              (document.activeElement === first ||
                document.activeElement === dialog.current)
            ) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className={styles.illustration}>
          <img
            className={styles.art}
            src={inspection.art}
            alt={inspection.artAlt}
          />
          <div
            className={styles.copy}
            style={
              inspection.paperInsets
                ? ({
                    "--paper-top": `${inspection.paperInsets.top}%`,
                    "--paper-right": `${inspection.paperInsets.right}%`,
                    "--paper-bottom": `${inspection.paperInsets.bottom}%`,
                    "--paper-left": `${inspection.paperInsets.left}%`,
                  } as CSSProperties)
                : inspection.paperTop !== undefined
                  ? ({
                      "--paper-top": `${inspection.paperTop}%`,
                    } as CSSProperties)
                  : undefined
            }
            ref={copy}
            tabIndex={0}
            aria-label="Inspection text"
          >
            {page && (
              <div
                className={styles.page}
                style={{ fontSize: page.fontSize }}
                data-e2e="inspection-page"
                aria-live="polite"
                aria-atomic="true"
              >
                {inspection.subtitle && (
                  <p className={styles.subtitle}>{inspection.subtitle}</p>
                )}
                <h2 id={titleId}>{inspection.title}</h2>
                {page.title !== inspection.title && <h3>{page.title}</h3>}
                {page.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                {page.links?.length ? (
                  <ul className={styles.links}>
                    {page.links.map((link, index) => (
                      <li key={`${link.href}-${index}`}>
                        <a
                          href={link.href}
                          target={
                            link.href.startsWith("mailto:")
                              ? undefined
                              : "_blank"
                          }
                          rel="noopener noreferrer"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
        </div>
        <nav className={styles.controls} aria-label="Inspection navigation">
          <button
            type="button"
            className={styles.returnButton}
            onClick={onClose}
          >
            <PageArrow previous />
            <span>Back to the scene</span>
          </button>
          {pages.length > 1 && (
            <div className={styles.pages}>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => turnPage(currentPage - 1)}
                disabled={currentPage === 0}
                aria-label="Previous page"
              >
                <PageArrow previous />
              </button>
              <span
                className={styles.pageCounter}
                aria-label={`Page ${currentPage + 1} of ${pages.length}`}
              >
                {currentPage + 1} / {pages.length}
              </span>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => turnPage(currentPage + 1)}
                disabled={currentPage === pages.length - 1}
                aria-label="Next page"
              >
                <PageArrow />
              </button>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}

/** Solid adventure arrows, independent of the platform's Unicode glyphs. */
function PageArrow({ previous = false }: { previous?: boolean }) {
  return (
    <svg
      className={styles.arrow}
      viewBox="0 0 24 20"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 6h11V1l9 9-9 9v-5H2z"
        transform={previous ? "translate(24 0) scale(-1 1)" : undefined}
      />
    </svg>
  );
}
