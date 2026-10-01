import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMobileTerminal } from "../../hooks/useMobileTerminal";
import { useGameStore } from "../../store/gameStore";
import { Win95TerminalWindow } from "./Win95TerminalWindow";
import { Win95GameWindow } from "./Win95GameWindow";
import { Win95LoadingWidget } from "./Win95LoadingWidget";
import { Win95RecycleBin } from "./Win95RecycleBin";
import styles from "./Win95Desktop.module.scss";
import retroDanieleImg from "../../assets/retro-daniele.png";
import recycleBinImg from "../../assets/recycle.png";
import msdosPromptImg from "../../assets/prompt.png";
import win98LogoImg from "../../assets/win-95.png";

import { Windows98StartMenu } from "./Windows98StartMenu";
import { Windows98Icon } from "./Windows98Icon";
import { Windows98About } from "./Windows98About";
import { PROFILE } from "../../config/profile";

interface Win95DesktopProps {
  isOpen: boolean;
  onClose: () => void;
  gameContent?: ReactNode;
  welcomeContent?: ReactNode; // Welcome screen to show before game content
}

interface DesktopIcon {
  id: string;
  label: string;
  command?: string;
  action?:
    | "openGame"
    | "openTerminal"
    | "openRecycleBin"
    | "openAbout"
    | "openResume";
  icon: React.ReactNode;
}

type WindowType = "game" | "terminal" | "recycleBin" | "about";
type ActiveWindow = WindowType | null;

/**
 * Windows 98 Desktop environment with multiple windowed applications
 * Manages terminal and game windows with taskbar buttons
 */
export function Win95Desktop({
  isOpen,
  gameContent,
  welcomeContent,
}: Win95DesktopProps) {
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

  // Loading state for game window
  const [isLoading, setIsLoading] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);

  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startMenuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !shellRef.current?.contains(event.target)
      ) {
        setStartMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [startMenuOpen]);

  const closeStartMenu = () => {
    setStartMenuOpen(false);
    startButtonRef.current?.focus();
  };

  const [time, setTime] = useState(new Date());
  const [openWindows, setOpenWindows] = useState<Set<WindowType>>(
    () => new Set(), // Start with no windows open
  );
  const [activeWindow, setActiveWindow] = useState<ActiveWindow>(null);
  const [minimizedWindows, setMinimizedWindows] = useState<Set<WindowType>>(
    () => new Set(),
  );
  const [windowZOrder, setWindowZOrder] = useState<WindowType[]>([]);

  const {
    setGameWindowActive,
    terminalScreenAction,
    inspection,
    dialogOpen,
    soundEnabled,
    toggleSound,
  } = useGameStore();

  // Update game store when game window becomes active/inactive
  useEffect(() => {
    setGameWindowActive(activeWindow === "game");
  }, [activeWindow, setGameWindowActive]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Rnd measures its parent on mount. Wait for initial styles to apply before
  // positioning the launch dialog, including on a cold WebKit page load.
  useEffect(() => {
    if (document.readyState === "complete") {
      startGameLoading();
      return;
    }
    window.addEventListener("load", startGameLoading, { once: true });
    return () => window.removeEventListener("load", startGameLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to get z-index for a window
  const getZIndex = (window: WindowType): number => {
    const index = windowZOrder.indexOf(window);
    return index === -1 ? 100 : 100 + index;
  };

  // Bring window to front (highest z-index)
  const bringWindowToFront = (window: WindowType) => {
    setWindowZOrder((prev) => {
      const filtered = prev.filter((w) => w !== window);
      return [...filtered, window];
    });
  };

  // Start game loading sequence
  const startGameLoading = () => {
    setIsLoading(true);
    setLoadingComplete(false);
    setOpenWindows((prev) => new Set(prev).add("game"));
    setActiveWindow("game");
    bringWindowToFront("game");
  };

  // Handle loading complete
  const handleLoadingComplete = () => {
    setIsLoading(false);
    setLoadingComplete(true);
  };

  // Handle loading cancel
  const handleLoadingCancel = () => {
    setIsLoading(false);
    setLoadingComplete(false);
    handleCloseWindow("game");
  };

  // Handle Escape key - Only close desktop if no terminal screen/dialog is open
  // (Terminal screen and dialog components handle their own ESC key)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't close desktop on ESC - let terminal screen/dialogs handle it
      // In windowed mode, ESC should not close the entire desktop
      if (
        isOpen &&
        e.key === "Escape" &&
        !terminalScreenAction &&
        !inspection &&
        !dialogOpen
      ) {
        // Do nothing - user can click the X button to close if needed
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, terminalScreenAction, inspection, dialogOpen]);

  // Focus terminal input when terminal is active and user clicks on it
  // Removed auto-focus to allow keyboard shortcuts to work in windowed mode

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleIconClick = (icon: DesktopIcon) => {
    setStartMenuOpen(false);
    if (icon.action === "openResume") {
      window.open(PROFILE.resumeUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (icon.action === "openAbout") {
      setOpenWindows((prev) => new Set(prev).add("about"));
      setMinimizedWindows((prev) => {
        const next = new Set(prev);
        next.delete("about");
        return next;
      });
      bringWindowToFront("about");
      setActiveWindow("about");
      return;
    }
    if (icon.action === "openGame") {
      if (!openWindows.has("game")) {
        // Start loading if game isn't open
        startGameLoading();
      } else if (isLoading) {
        // If loading, just bring it to front
        setMinimizedWindows((prev) => {
          const next = new Set(prev);
          next.delete("game");
          return next;
        });
        bringWindowToFront("game");
        setActiveWindow("game");
      } else {
        // Game already loaded, just bring it to front
        setMinimizedWindows((prev) => {
          const next = new Set(prev);
          next.delete("game");
          return next;
        });
        bringWindowToFront("game");
        setActiveWindow("game");
      }
    } else if (icon.action === "openTerminal") {
      setOpenWindows((prev) => new Set(prev).add("terminal"));
      setMinimizedWindows((prev) => {
        const next = new Set(prev);
        next.delete("terminal");
        return next;
      });
      bringWindowToFront("terminal");
      setActiveWindow("terminal");
    } else if (icon.action === "openRecycleBin") {
      setOpenWindows((prev) => new Set(prev).add("recycleBin"));
      setMinimizedWindows((prev) => {
        const next = new Set(prev);
        next.delete("recycleBin");
        return next;
      });
      bringWindowToFront("recycleBin");
      setActiveWindow("recycleBin");
    } else if (icon.command) {
      // Open terminal if not already open
      setOpenWindows((prev) => new Set(prev).add("terminal"));
      setMinimizedWindows((prev) => {
        const next = new Set(prev);
        next.delete("terminal");
        return next;
      });
      bringWindowToFront("terminal");
      setActiveWindow("terminal");
      executeInput(icon.command);
      // Focus input after command
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleCloseWindow = (window: WindowType) => {
    setOpenWindows((prev) => {
      const next = new Set(prev);
      next.delete(window);
      return next;
    });

    // Also remove from minimized set
    setMinimizedWindows((prev) => {
      const next = new Set(prev);
      next.delete(window);
      return next;
    });

    // If closing game, also cancel any loading
    if (window === "game") {
      setIsLoading(false);
      setLoadingComplete(false);
      // Turn off sound when closing the game window
      if (soundEnabled) {
        toggleSound();
      }
    }

    // If closing active window, switch to another open non-minimized window
    if (activeWindow === window) {
      const remaining = [...windowZOrder]
        .reverse()
        .filter(
          (w) => w !== window && openWindows.has(w) && !minimizedWindows.has(w),
        );
      setActiveWindow(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleMinimizeWindow = (window: WindowType) => {
    setMinimizedWindows((prev) => new Set(prev).add(window));
    // If this was the active window, find another non-minimized window to activate
    if (activeWindow === window) {
      const remaining = [...windowZOrder]
        .reverse()
        .filter(
          (w) => w !== window && openWindows.has(w) && !minimizedWindows.has(w),
        );
      setActiveWindow(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleTaskbarClick = (window: WindowType) => {
    if (minimizedWindows.has(window)) {
      // Restore minimized window
      setMinimizedWindows((prev) => {
        const next = new Set(prev);
        next.delete(window);
        return next;
      });
      bringWindowToFront(window);
      setActiveWindow(window);
    } else if (activeWindow === window) {
      // Clicking active window minimizes it
      handleMinimizeWindow(window);
    } else {
      // Clicking inactive, non-minimized window brings it to front
      bringWindowToFront(window);
      setActiveWindow(window);
    }
  };

  const showDesktop = () => {
    setMinimizedWindows(new Set(openWindows));
    setActiveWindow(null);
    setStartMenuOpen(false);
  };

  const launch = (action: DesktopIcon["action"]) =>
    handleIconClick({ id: "shortcut", label: "", icon: null, action });
  const runCommand = (command: string) =>
    handleIconClick({ id: command, label: command, icon: null, command });

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Windows 98 Desktop"
      data-e2e="win95-desktop"
    >
      {/* Desktop background */}
      <div className={styles.desktop}>
        <div className={styles.wallpaperBrand} aria-hidden="true">
          <img src={win98LogoImg} alt="" />
          <div>
            Microsoft
            <span>
              Windows<strong>98</strong>
            </span>
            <small>PORTFOLIO EDITION</small>
          </div>
        </div>
        {/* Desktop icons */}
        <div className={styles.desktopIcons}>
          {DESKTOP_ICONS.map((icon) => (
            <button
              key={icon.id}
              className={styles.iconButton}
              onClick={() => handleIconClick(icon)}
              type="button"
              aria-label={`Execute ${icon.label}`}
              data-e2e={`desktop-icon-${icon.id}`}
            >
              <div className={styles.iconImage}>{icon.icon}</div>
              <span className={styles.iconLabel}>{icon.label}</span>
            </button>
          ))}
        </div>

        {/* Recycle Bin (bottom-right corner) */}
        <div className={styles.recycleBinIcon}>
          <button
            className={styles.iconButton}
            onClick={() => handleIconClick(RECYCLE_BIN_ICON)}
            type="button"
            aria-label={RECYCLE_BIN_ICON.label}
            data-e2e="desktop-icon-recycle-bin"
          >
            <div className={styles.iconImage}>{RECYCLE_BIN_ICON.icon}</div>
            <span className={styles.iconLabel}>{RECYCLE_BIN_ICON.label}</span>
          </button>
        </div>

        {/* Game loading widget - shown when game is loading */}
        {openWindows.has("game") && isLoading && (
          <div
            className={styles.windowLayer}
            inert={minimizedWindows.has("game")}
            style={{
              visibility: minimizedWindows.has("game") ? "hidden" : "visible",
            }}
          >
            <Win95LoadingWidget
              onCancel={handleLoadingCancel}
              onComplete={handleLoadingComplete}
              onFocus={() => {
                bringWindowToFront("game");
                setActiveWindow("game");
              }}
              zIndex={getZIndex("game")}
              isActive={activeWindow === "game"}
            />
          </div>
        )}

        {/* Game window */}
        {openWindows.has("game") &&
          !isLoading &&
          loadingComplete &&
          (gameContent || welcomeContent) && (
            <div
              className={styles.windowLayer}
              inert={minimizedWindows.has("game")}
              style={{
                visibility: minimizedWindows.has("game") ? "hidden" : "visible",
              }}
            >
              <Win95GameWindow
                onClose={() => handleCloseWindow("game")}
                onMinimize={() => handleMinimizeWindow("game")}
                isActive={activeWindow === "game"}
                onFocus={() => {
                  bringWindowToFront("game");
                  setActiveWindow("game");
                }}
                zIndex={getZIndex("game")}
                welcomeContent={welcomeContent}
              >
                {gameContent}
              </Win95GameWindow>
            </div>
          )}

        {/* Terminal window */}
        {openWindows.has("terminal") && (
          <div
            className={styles.windowLayer}
            inert={minimizedWindows.has("terminal")}
            style={{
              visibility: minimizedWindows.has("terminal")
                ? "hidden"
                : "visible",
            }}
          >
            <Win95TerminalWindow
              history={history}
              input={input}
              setInput={setInput}
              handleKeyDown={handleKeyDown}
              executeInput={executeInput}
              inputRef={inputRef as React.RefObject<HTMLInputElement>}
              currentDialogMessage={currentDialogMessage}
              isTyping={isTyping}
              skipTypewriter={skipTypewriter}
              onClose={() => handleCloseWindow("terminal")}
              onMinimize={() => handleMinimizeWindow("terminal")}
              isActive={activeWindow === "terminal"}
              onFocus={() => {
                bringWindowToFront("terminal");
                setActiveWindow("terminal");
              }}
              zIndex={getZIndex("terminal")}
            />
          </div>
        )}

        {/* Recycle Bin window */}
        {openWindows.has("recycleBin") && (
          <div
            className={styles.windowLayer}
            inert={minimizedWindows.has("recycleBin")}
            style={{
              visibility: minimizedWindows.has("recycleBin")
                ? "hidden"
                : "visible",
            }}
          >
            <Win95RecycleBin
              onClose={() => handleCloseWindow("recycleBin")}
              onMinimize={() => handleMinimizeWindow("recycleBin")}
              isActive={activeWindow === "recycleBin"}
              onFocus={() => {
                bringWindowToFront("recycleBin");
                setActiveWindow("recycleBin");
              }}
              zIndex={getZIndex("recycleBin")}
            />
          </div>
        )}

        {openWindows.has("about") && (
          <div
            className={styles.windowLayer}
            inert={minimizedWindows.has("about")}
            style={{
              visibility: minimizedWindows.has("about") ? "hidden" : "visible",
            }}
          >
            <Windows98About
              onClose={() => handleCloseWindow("about")}
              onFocus={() => {
                bringWindowToFront("about");
                setActiveWindow("about");
              }}
              isActive={activeWindow === "about"}
              zIndex={getZIndex("about")}
            />
          </div>
        )}

        <div
          ref={shellRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setStartMenuOpen(false);
          }}
        >
          {startMenuOpen && (
            <Windows98StartMenu
              onClose={closeStartMenu}
              onGame={() => launch("openGame")}
              onTerminal={() => launch("openTerminal")}
              onResume={() => launch("openResume")}
              onContact={() => runCommand("contact")}
              onExperience={() => runCommand("experience")}
              onAbout={() => launch("openAbout")}
              onShowDesktop={showDesktop}
            />
          )}
          {/* Taskbar */}
          <div className={styles.taskbar}>
            <button
              ref={startButtonRef}
              className={`${styles.startButton} ${startMenuOpen ? styles.active : ""}`}
              type="button"
              aria-label="Start menu"
              aria-haspopup="menu"
              aria-expanded={startMenuOpen}
              aria-controls="windows98-start-menu"
              onClick={() => setStartMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                  event.preventDefault();
                  setStartMenuOpen(true);
                }
              }}
            >
              <img src={win98LogoImg} alt="" />
              <span>Start</span>
            </button>
            <div
              className={styles.quickLaunch}
              role="toolbar"
              aria-label="Quick Launch"
            >
              <button
                type="button"
                title="Show Desktop"
                aria-label="Show Desktop"
                onClick={showDesktop}
              >
                <Windows98Icon kind="desktop" />
              </button>
              <button
                type="button"
                title="Launch adventure"
                aria-label="Launch adventure"
                onClick={() => launch("openGame")}
              >
                <img src={retroDanieleImg} alt="" />
              </button>
              <button
                type="button"
                title="MS-DOS Prompt"
                aria-label="Launch MS-DOS Prompt"
                onClick={() => launch("openTerminal")}
              >
                <img src={msdosPromptImg} alt="" />
              </button>
            </div>

            <div className={styles.taskbarCenter}>
              {/* Taskbar buttons for open windows */}
              {openWindows.has("game") && (
                <button
                  className={`${styles.taskbarButton} ${activeWindow === "game" ? styles.active : ""}`}
                  onClick={() => handleTaskbarClick("game")}
                  type="button"
                  aria-label="Daniele_Tortora_Portfolio.exe"
                  data-e2e="taskbar-game"
                >
                  <img
                    className={styles.taskbarIcon}
                    src={retroDanieleImg}
                    alt=""
                  />
                  <span>Portfolio — Remastered</span>
                </button>
              )}

              {openWindows.has("terminal") && (
                <button
                  className={`${styles.taskbarButton} ${activeWindow === "terminal" ? styles.active : ""}`}
                  onClick={() => handleTaskbarClick("terminal")}
                  type="button"
                  aria-label="MS-DOS Prompt"
                  data-e2e="taskbar-terminal"
                >
                  <img
                    className={styles.taskbarIcon}
                    src={msdosPromptImg}
                    alt=""
                  />
                  <span>MS-DOS Prompt</span>
                </button>
              )}

              {openWindows.has("recycleBin") && (
                <button
                  className={`${styles.taskbarButton} ${activeWindow === "recycleBin" ? styles.active : ""}`}
                  onClick={() => handleTaskbarClick("recycleBin")}
                  type="button"
                  aria-label="Recycle Bin"
                  data-e2e="taskbar-recycle-bin"
                >
                  <img
                    className={styles.taskbarIcon}
                    src={recycleBinImg}
                    alt=""
                  />
                  <span>Recycle Bin</span>
                </button>
              )}
              {openWindows.has("about") && (
                <button
                  type="button"
                  className={`${styles.taskbarButton} ${activeWindow === "about" ? styles.active : ""}`}
                  onClick={() => handleTaskbarClick("about")}
                >
                  <span className={styles.taskbarIcon}>
                    <Windows98Icon kind="computer" />
                  </span>
                  <span>System Properties</span>
                </button>
              )}
            </div>

            <div
              className={styles.clock}
              title={time.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            >
              <button
                type="button"
                className={styles.soundButton}
                onClick={toggleSound}
                aria-label={soundEnabled ? "Mute sound" : "Enable sound"}
                aria-pressed={soundEnabled}
                title={soundEnabled ? "Mute sound" : "Enable sound"}
              >
                <Windows98Icon kind="sound" />
                {!soundEnabled && <span className={styles.muted}>×</span>}
              </button>
              {time.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// MS-DOS Prompt Icon (Windows 98 style)
function MSDOSPromptIcon() {
  return (
    <img
      src={msdosPromptImg}
      alt="MS-DOS Prompt"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  );
}

// Recycle Bin Icon (Empty - Windows 98 style)
function RecycleBinEmptyIcon() {
  return (
    <img
      src={recycleBinImg}
      alt="Recycle Bin"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  );
}

// Desktop icons
const DESKTOP_ICONS: DesktopIcon[] = [
  {
    id: "computer",
    label: "My Computer",
    action: "openAbout",
    icon: <Windows98Icon kind="computer" />,
  },
  {
    id: "resume",
    label: "My Resume",
    action: "openResume",
    icon: <Windows98Icon kind="document" />,
  },
  {
    id: "terminal",
    label: "MS-DOS Prompt",
    action: "openTerminal",
    icon: <MSDOSPromptIcon />,
  },
  {
    id: "game",
    label: "Portfolio Adventure",
    action: "openGame",
    icon: (
      <img
        src={retroDanieleImg}
        alt="Daniele"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          imageRendering: "pixelated",
        }}
      />
    ),
  },
];

// Recycle Bin as a separate icon (positioned at bottom-right)
const RECYCLE_BIN_ICON: DesktopIcon = {
  id: "recycle-bin",
  label: "Recycle Bin",
  action: "openRecycleBin",
  icon: <RecycleBinEmptyIcon />,
};
