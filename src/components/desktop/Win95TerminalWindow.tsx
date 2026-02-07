import { useCallback, useEffect, useRef } from "react";
import type { TerminalLine } from "../../types/game";
import { Win95Window } from "./Win95Window";
import styles from "./Win95TerminalWindow.module.scss";

interface Win95TerminalWindowProps {
  history: TerminalLine[];
  input: string;
  setInput: (value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  executeInput: (input: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  currentDialogMessage: string;
  isTyping: boolean;
  skipTypewriter: () => void;
  onClose: () => void;
  isActive: boolean;
  onFocus: () => void;
  zIndex: number;
}

/**
 * Windows 95 style terminal window with frame, title bar, and system buttons
 * Contains the terminal content area with CRT effects
 */
export function Win95TerminalWindow({
  history,
  input,
  setInput,
  handleKeyDown,
  executeInput,
  inputRef,
  currentDialogMessage,
  isTyping,
  skipTypewriter,
  onClose,
  isActive,
  onFocus,
  zIndex,
}: Win95TerminalWindowProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when terminal becomes active
  useEffect(() => {
    if (isActive) {
      // Small delay to ensure the window is fully rendered/visible
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isActive, inputRef]);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history, currentDialogMessage, isTyping, input]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) {
        executeInput(input);
        setInput("");
      }
    } else {
      handleKeyDown(e);
    }
  };

  const handleInputAreaClick = () => {
    // Focus the input when clicking on the input area
    inputRef.current?.focus();
  };

  // Redirect all keyboard events to the input field, regardless of
  // where focus currently is within the terminal
  const handleTerminalKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't intercept Tab (accessibility), or modifier-key combos (shortcuts)
      if (e.key === "Tab" || e.ctrlKey || e.metaKey || e.altKey) return;

      // If the input is not focused, redirect focus there.
      // The browser will deliver subsequent key events to the now-focused input.
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    },
    [inputRef],
  );

  // Clicking anywhere in the output area should focus the input
  const handleOutputClick = useCallback(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  return (
    <Win95Window
      title="MS-DOS Prompt"
      onClose={onClose}
      isActive={isActive}
      onFocus={onFocus}
      zIndex={zIndex}
      initialWidth={1000}
      initialHeight={600}
      minWidth={1000}
      minHeight={600}
      maxWidth="95vw"
      maxHeight="90vh"
      initialX="center"
      initialY="center"
      contentClassName={styles.terminalContent}
      showMinimizeButton={true}
    >
      <div
        className={styles.innerContent}
        data-e2e="win95-terminal-window"
        onKeyDown={handleTerminalKeyDown}
      >
        {/* CRT scanlines overlay */}
        <div className={styles.scanlines} />

        {/* Terminal output area */}
        <div
          className={styles.output}
          ref={outputRef}
          onClick={handleOutputClick}
          data-e2e="terminal-output"
        >
          {history.map((line, index) => {
            // Render dialog agent messages
            if (line.type === "dialog-agent") {
              return (
                <div
                  key={index}
                  className={`${styles.line} ${styles.dialogAgent}`}
                  data-e2e="dialog-agent-message"
                >
                  <span className={styles.agentPrefix}>
                    λ{" "}
                    {line.metadata?.speaker === "daniele"
                      ? "Daniele"
                      : "Narrator"}
                    :{" "}
                  </span>
                  {line.content}
                </div>
              );
            }

            // Render dialog options
            if (line.type === "dialog-options" && line.metadata?.options) {
              const selectedId = line.metadata.selectedOptionId;
              const isResolved = !!selectedId;

              return (
                <div key={index} className={styles.dialogOptions}>
                  {line.metadata.options.map((option, idx) => {
                    // If an option was already selected, hide all non-selected options
                    if (isResolved && option.id !== selectedId) {
                      return null;
                    }

                    return (
                      <div
                        key={option.id}
                        className={`${styles.optionLine} ${isResolved ? styles.optionDisabled : ""}`}
                        onClick={
                          isResolved
                            ? undefined
                            : (e) => {
                                e.stopPropagation();
                                executeInput(String(idx + 1));
                                inputRef.current?.focus();
                              }
                        }
                        role={isResolved ? undefined : "button"}
                        tabIndex={isResolved ? undefined : -1}
                        onKeyDown={
                          isResolved
                            ? undefined
                            : (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  executeInput(String(idx + 1));
                                }
                              }
                        }
                        data-e2e="dialog-option"
                      >
                        <span className={styles.optionNumber}>{idx + 1}.</span>{" "}
                        {option.label}
                      </div>
                    );
                  })}
                </div>
              );
            }

            // Render regular terminal lines
            return (
              <div
                key={index}
                className={`${styles.line} ${
                  line.type === "input"
                    ? styles.input
                    : line.type === "error"
                      ? styles.error
                      : styles.output
                }`}
              >
                {line.content}
              </div>
            );
          })}

          {/* Currently typing message */}
          {isTyping && (
            <div
              className={`${styles.line} ${styles.dialogAgent}`}
              onClick={(e) => {
                e.stopPropagation();
                skipTypewriter();
              }}
              data-e2e="dialog-agent-typing"
            >
              <span className={styles.agentPrefix}>λ Daniele: </span>
              {currentDialogMessage}
              <span className={styles.cursor}>▌</span>
            </div>
          )}
        </div>

        {/* Input line */}
        <div className={styles.inputLine} onClick={handleInputAreaClick}>
          <span className={styles.prompt}>C:\DANIELE&gt;</span>
          <div className={styles.inputWrapper}>
            {/* Visible text mirror + cursor */}
            <span className={styles.inputMirror}>
              {input}
              <span className={styles.inputCursor}>_</span>
            </span>
            {/* Hidden actual input for capturing keystrokes */}
            <input
              ref={inputRef}
              type="text"
              className={styles.inputField}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-label="Terminal input"
              data-e2e="terminal-input"
            />
          </div>
        </div>
      </div>
    </Win95Window>
  );
}
