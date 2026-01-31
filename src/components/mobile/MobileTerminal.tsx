import { useEffect, useRef, useState } from "react";
import { useTerminal } from "../../hooks/useTerminal";
import { PROFILE } from "../../config/profile";
import "./MobileTerminal.css";

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
  { label: "Resume", command: "resume" },
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
    <div className="mobile-terminal">
      {/* Desktop banner - dismissible */}
      {showDesktopBanner && (
        <div className="mobile-terminal__banner">
          <span>For the full interactive experience, visit on desktop</span>
          <button
            className="mobile-terminal__banner-close"
            onClick={() => setShowDesktopBanner(false)}
            aria-label="Dismiss banner"
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {/* Scanline overlay */}
      <div className="mobile-terminal__scanlines" />

      {/* Header */}
      <header className="mobile-terminal__header">
        <span className="mobile-terminal__title">
          {PROFILE.portfolio.title} v{PROFILE.portfolio.version}
        </span>
        <span className="mobile-terminal__subtitle">mobile terminal</span>
      </header>

      {/* Output area */}
      <div className="mobile-terminal__output" ref={outputRef}>
        {history.map((line, index) => (
          <div
            key={index}
            className={`mobile-terminal__line mobile-terminal__line--${line.type}`}
          >
            {line.content}
          </div>
        ))}
      </div>

      {/* Input area */}
      <form className="mobile-terminal__input-line" onSubmit={handleFormSubmit}>
        <span className="mobile-terminal__prompt">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className="mobile-terminal__input"
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
          className="mobile-terminal__submit"
          aria-label="Execute command"
        >
          ↵
        </button>
      </form>

      {/* Quick access buttons */}
      <div className="mobile-terminal__quick-commands">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd.command}
            className="mobile-terminal__quick-btn"
            onClick={() => handleQuickCommand(cmd.command)}
            type="button"
          >
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Help hint */}
      <div className="mobile-terminal__hint">
        Type <code>help</code> for all commands
      </div>

      {/* Copyright footer */}
      <footer className="mobile-terminal__copyright">
        © 2026 Daniele Tortora
      </footer>
    </div>
  );
}
