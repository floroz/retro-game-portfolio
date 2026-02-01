import { useEffect, useRef, useState } from "react";
import { useTerminal } from "../../hooks/useTerminal";
import { PROFILE } from "../../config/profile";
import styles from "./MobileTerminal.module.scss";

interface QuickCommand {
  label: string;
  command: string;
}

const QUICK_COMMANDS: QuickCommand[] = [
  { label: "About", command: "about" },
  { label: "Experience", command: "experience" },
  { label: "Skills", command: "skills" },
  { label: "Projects", command: "projects" },
  { label: "Contact", command: "contact" },
  { label: "Talk", command: "talk" },
];

/**
 * Mobile-optimized full-screen terminal interface
 * Primary interface for mobile users
 */
export function MobileTerminal() {
  const { history, input, setInput, handleKeyDown, executeCommand, inputRef } =
    useTerminal();
  const outputRef = useRef<HTMLDivElement>(null);
  const [showDesktopBanner, setShowDesktopBanner] = useState(true);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [inputRef]);

  const handleQuickCommand = (command: string) => {
    executeCommand(command);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleKeyDown({
        key: "Enter",
        preventDefault: () => {},
      } as React.KeyboardEvent<HTMLInputElement>);
    }
  };

  return (
    <div className={styles.mobileTerminal}>
      {/* Desktop banner - dismissible */}
      {showDesktopBanner && (
        <div className={styles.banner}>
          <span>For the full interactive experience, visit on desktop</span>
          <button
            className={styles.bannerClose}
            onClick={() => setShowDesktopBanner(false)}
            aria-label="Dismiss banner"
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {/* Scanline overlay */}
      <div className={styles.scanlines} />

      {/* Header */}
      <header className={styles.header}>
        <span className={styles.title}>
          {PROFILE.portfolio.title} v{PROFILE.portfolio.version}
        </span>
        <span className={styles.subtitle}>mobile terminal</span>
      </header>

      {/* Output area */}
      <div className={styles.output} ref={outputRef}>
        {history.map((line, index) => (
          <div key={index} className={`${styles.line} ${styles[line.type]}`}>
            {line.content}
          </div>
        ))}
      </div>

      {/* Input area */}
      <form className={styles.inputLine} onSubmit={handleFormSubmit}>
        <span className={styles.prompt}>&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command or tap below..."
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-label="Terminal input"
        />
        <button
          type="submit"
          className={styles.submit}
          aria-label="Execute command"
        >
          ↵
        </button>
      </form>

      {/* Quick access buttons */}
      <div className={styles.quickCommands}>
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd.command}
            className={styles.quickBtn}
            onClick={() => handleQuickCommand(cmd.command)}
            type="button"
          >
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Help hint */}
      <div className={styles.hint}>
        Type <code>help</code> for all commands
      </div>

      {/* Copyright footer */}
      <footer className={styles.copyright}>© 2026 Daniele Tortora</footer>
    </div>
  );
}
