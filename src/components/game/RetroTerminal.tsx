import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTerminal } from "../../hooks/useTerminal";
import { PROFILE } from "../../config/profile";
import styles from "./RetroTerminal.module.scss";

interface RetroTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Retro CRT-style terminal interface
 * Command-line interface for keyboard-first users
 */
export function RetroTerminal({ isOpen, onClose }: RetroTerminalProps) {
  const { history, input, setInput, handleKeyDown, inputRef } = useTerminal();
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  // Handle escape key and backtick to close
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.key === "Escape" || e.key === "`")) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Focus input when terminal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, inputRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Terminal window */}
          <motion.div
            className={styles.terminal}
            data-e2e="terminal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Scanline overlay */}
            <div className={styles.scanlines} />

            {/* Header */}
            <div className={styles.header}>
              <span className={styles.title}>
                {PROFILE.portfolio.title} v{PROFILE.portfolio.version}
              </span>
              <button
                className={styles.close}
                onClick={onClose}
                aria-label="Close terminal"
                type="button"
              >
                [X]
              </button>
            </div>

            {/* Output area */}
            <div className={styles.output} ref={outputRef}>
              {history.map((line, index) => (
                <div
                  key={index}
                  className={`${styles.line} ${styles[line.type]}`}
                >
                  {line.content}
                </div>
              ))}
            </div>

            {/* Input area */}
            <div className={styles.inputLine}>
              <span className={styles.prompt}>&gt;</span>
              <div className={styles.inputWrapper}>
                <span className={styles.inputText}>{input}</span>
                <span className={styles.cursor} aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.input}
                  data-e2e="terminal-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="Terminal input"
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
