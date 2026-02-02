import { useEffect, useRef, useState } from "react";
import { useMobileTerminal } from "../../hooks/useMobileTerminal";
import { MobileDesktop } from "./MobileDesktop";
import styles from "./MobileTerminal.module.scss";

/**
 * Mobile-optimized full-screen terminal interface
 * Primary interface for mobile users
 */
export function MobileTerminal() {
  const {
    history,
    input,
    setInput,
    handleKeyDown,
    executeInput,
    inputRef,
    currentDialogMessage,
    isTyping,
    skipTypewriter,
  } = useMobileTerminal();
  const outputRef = useRef<HTMLDivElement>(null);
  const [showDesktopBanner, setShowDesktopBanner] = useState(true);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [showBios, setShowBios] = useState(() => {
    // Only show BIOS if not dismissed in this session
    return !sessionStorage.getItem("biosDismissed");
  });
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);

  // Handle BIOS dismissal
  const handleBiosDismiss = () => {
    sessionStorage.setItem("biosDismissed", "true");
    setShowBios(false);
  };

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history, currentDialogMessage, isTyping, input]);

  // Handle orientation change
  useEffect(() => {
    const handleOrientationChange = () => {
      // Re-scroll to bottom
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    };

    window.addEventListener("orientationchange", handleOrientationChange);
    return () =>
      window.removeEventListener("orientationchange", handleOrientationChange);
  }, []);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [inputRef]);

  const handleSubmit = () => {
    if (input.trim()) {
      executeInput(input);
      setInput("");
    }
  };

  const handleTerminalClick = () => {
    // Focus the hidden input to bring up keyboard
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else {
      // Pass through to useMobileTerminal's handleKeyDown for history navigation
      handleKeyDown(e);
    }
  };

  // Swipe gesture handlers for desktop overlay
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent default if swiping from bottom area to avoid scroll conflicts
    const touch = e.touches[0];
    const isBottomArea = touchStartY.current > window.innerHeight - 150;
    const deltaY = touchStartY.current - touch.clientY;

    if (isBottomArea && deltaY > 0) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const deltaY = touchStartY.current - touch.clientY;
    const deltaX = Math.abs(touchStartX.current - touch.clientX);

    // Check if this was a swipe up gesture from bottom area
    const isBottomArea = touchStartY.current > window.innerHeight - 150;
    const isSwipeUp = deltaY > 50; // 50px threshold
    const isVertical = deltaY > deltaX; // More vertical than horizontal

    if (isBottomArea && isSwipeUp && isVertical) {
      setDesktopOpen(true);
    }
  };

  return (
    <div
      className={styles.mobileTerminal}
      data-e2e="mobile-terminal"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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

      {/* Vignette overlay */}
      <div className={styles.vignette} />

      {/* BIOS Startup Overlay */}
      {showBios && (
        <div
          className={styles.biosOverlay}
          onClick={handleBiosDismiss}
          onTouchEnd={handleBiosDismiss}
          data-e2e="bios-overlay"
        >
          <div className={styles.biosBox}>
            <div className={styles.biosContent}>
              <div className={styles.biosHeader}>SYSTEM INITIALIZATION</div>
              <div className={styles.biosDivider}>
                ═══════════════════════════════
              </div>
              <div className={styles.biosMessage}>
                MOBILE EXPERIENCE OPTIMIZED
              </div>
              <div className={styles.biosSubtext}>
                Loading interactive terminal interface...
                <br />
                Touch-optimized controls enabled
              </div>
              <div className={styles.biosDivider}>
                ═══════════════════════════════
              </div>
              <div className={styles.biosPrompt}>
                Press any key to continue
                <span className={styles.biosCursor}>█</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden input for keyboard */}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleInputKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        aria-label="Terminal input"
        data-e2e="terminal-input"
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          fontSize: "16px",
        }}
      />

      {/* Output area - tappable to focus input */}
      <div
        className={styles.output}
        ref={outputRef}
        data-e2e="terminal-output"
        role="log"
        aria-live="polite"
        onClick={handleTerminalClick}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleTerminalClick();
        }}
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
            return (
              <div key={index} className={styles.dialogOptions}>
                {line.metadata.options.map((option, idx) => (
                  <div
                    key={option.id}
                    className={styles.optionLine}
                    onClick={(e) => {
                      e.stopPropagation();
                      executeInput(String(idx + 1));
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      executeInput(String(idx + 1));
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        executeInput(String(idx + 1));
                      }
                    }}
                    data-e2e="dialog-option"
                  >
                    <span className={styles.optionNumber}>{idx + 1}.</span>{" "}
                    {option.label}
                  </div>
                ))}
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

        {/* Inline cursor prompt */}
        <div className={styles.inlinePrompt}>
          C:\DANIELE&gt; {input}
          <span className={styles.cursor}>█</span>
        </div>
      </div>

      {/* Desktop overlay */}
      <MobileDesktop
        isOpen={desktopOpen}
        onClose={() => setDesktopOpen(false)}
        onCommandSelect={(command) => {
          executeInput(command);
        }}
      />

      {/* Terminal footer - clickable to open desktop */}
      <footer
        className={styles.terminalFooter}
        onClick={() => setDesktopOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Open desktop overlay"
        data-e2e="terminal-footer"
      >
        <div className={styles.hint}>
          Type <code>help</code> for all commands or <strong>swipe up</strong>{" "}
          for desktop
        </div>
        <div className={styles.copyright}>© 2026 Daniele Tortora</div>
      </footer>
    </div>
  );
}
