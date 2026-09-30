import { useEffect, useId, useRef, useState } from "react";
import type { InspectionReading } from "../../config/inspections";
import styles from "./ObjectInspectionView.module.scss";

interface Props {
  inspection: InspectionReading;
  onClose: () => void;
}

/** An illustrated object close-up; text and links remain real, readable HTML. */
export function ObjectInspectionView({ inspection, onClose }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const pages = inspection.pages?.length
    ? inspection.pages
    : [{ title: inspection.title, paragraphs: inspection.paragraphs }];
  const currentPage = Math.min(pageIndex, pages.length - 1);
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

  const turnPage = (next: number) => {
    setPageIndex(Math.max(0, Math.min(pages.length - 1, next)));
    copy.current?.scrollTo(0, 0);
  };

  return (
    <div className={styles.backdrop}>
      <div
        ref={dialog}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-e2e="object-inspection"
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
              inspection.paperTop
                ? { top: `${inspection.paperTop}%` }
                : undefined
            }
            ref={copy}
            tabIndex={0}
            aria-label="Inspection text"
          >
            <p className={styles.subtitle}>{inspection.subtitle}</p>
            <h2 id={titleId}>{inspection.title}</h2>
            <div aria-live="polite" aria-atomic="true">
              {page.title !== inspection.title && <h3>{page.title}</h3>}
              {page.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
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
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <nav className={styles.controls} aria-label="Inspection navigation">
          <button type="button" onClick={onClose}>
            Back to the scene <span aria-hidden="true">↩</span>
          </button>
          {pages.length > 1 && (
            <div className={styles.pages}>
              <button
                type="button"
                onClick={() => turnPage(currentPage - 1)}
                disabled={currentPage === 0}
                aria-label="Previous page"
              >
                ←
              </button>
              <span aria-label={`Page ${currentPage + 1} of ${pages.length}`}>
                {currentPage + 1} / {pages.length}
              </span>
              <button
                type="button"
                onClick={() => turnPage(currentPage + 1)}
                disabled={currentPage === pages.length - 1}
                aria-label="Next page"
              >
                →
              </button>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
