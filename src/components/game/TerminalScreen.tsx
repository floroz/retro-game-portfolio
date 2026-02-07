import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActionType } from "../../types/game";
import { getTerminalScreenContent } from "../../config/terminalScreenContent";
import { useTypewriter } from "../../hooks/useTypewriter";
import { useDialogSound } from "../../hooks/useDialogSound";
import styles from "./TerminalScreen.module.scss";

interface TerminalScreenProps {
  action: ActionType;
  onClose: () => void;
}

/**
 * Full-screen terminal/DOS-style content viewer.
 * Replaces the game canvas when viewing Skills, About, Experience, etc.
 * Displays a boot sequence, structured content, and pagination.
 */
export function TerminalScreen({ action, onClose }: TerminalScreenProps) {
  const section = useMemo(() => getTerminalScreenContent(action), [action]);
  const [bootComplete, setBootComplete] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const { playTypingSound, playSelectSound, playConfirmSound } =
    useDialogSound();

  const bootText = section ? `Loading ${section.filename}... OK` : "";

  const { displayedText: bootDisplayed, isTyping: isBootTyping } =
    useTypewriter(bootText, {
      speed: 40,
      onType: playTypingSound,
      onComplete: () => {
        setBootComplete(true);
        playConfirmSound();
      },
    });

  const totalPages = section?.pages.length ?? 0;
  const pageContent = section?.pages[currentPage]?.content ?? "";

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 0 && page < totalPages) {
        setCurrentPage(page);
        playSelectSound();
      }
    },
    [totalPages, playSelectSound],
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToPage(currentPage + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          goToPage(currentPage - 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goToPage, currentPage]);

  if (!section) return null;

  return (
    <div
      className={styles.screen}
      data-e2e="terminal-screen"
      data-action={action}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${section.title} - Terminal Screen`}
    >
      {/* CRT scanline overlay */}
      <div className={styles.scanlines} aria-hidden="true" />

      {/* Main body - stop click propagation so clicking content doesn't close */}
      <div
        className={styles.body}
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* Boot sequence line */}
        <div className={styles.bootLine} aria-live="polite">
          {bootDisplayed}
          {isBootTyping && (
            <span className={styles.cursor} aria-hidden="true" />
          )}
        </div>

        {/* Content appears after boot */}
        {bootComplete && (
          <div className={styles.contentVisible}>
            <hr className={styles.separator} />

            <h2 className={styles.title} data-e2e="terminal-screen-title">
              {section.title}
            </h2>

            <div className={styles.contentArea}>
              <pre
                className={styles.content}
                data-e2e="terminal-screen-content"
                dangerouslySetInnerHTML={{ __html: pageContent }}
              ></pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer with pagination and nav hints */}
      {bootComplete && (
        <div
          className={`${styles.footer} ${styles.contentVisible}`}
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <hr className={styles.separator} />

          {totalPages > 1 && (
            <div
              className={styles.pagination}
              data-e2e="terminal-screen-pagination"
            >
              {"[ "}
              {currentPage + 1} / {totalPages}
              {" ]"}
            </div>
          )}

          <div className={styles.navHints}>
            <span className={styles.navHint}>[ ESC ] BACK</span>
            {totalPages > 1 ? (
              <span className={styles.navHint}>
                [ &larr; / &rarr; ] NAVIGATE
              </span>
            ) : (
              <span className={styles.navHint}>PRESS ESC TO RETURN</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
