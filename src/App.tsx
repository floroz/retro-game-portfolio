import { useEffect, useState } from "react";
import styles from "./App.module.scss";
import { GameCanvas } from "./components/game/GameCanvas";
import gameCanvasStyles from "./components/game/GameCanvas.module.scss";
import { Scene } from "./components/game/Scene";
import { Toolbar } from "./components/toolbar/Toolbar";
import { TerminalScreen } from "./components/game/TerminalScreen";
import { Win95Desktop } from "./components/desktop/Win95Desktop";
import { WelcomeScreen } from "./components/dialog/WelcomeScreen";
import { AdventureDialog } from "./components/dialog/AdventureDialog";
import { MobileTerminal } from "./components/mobile/MobileTerminal";
import { MobileASCIIWelcome } from "./components/mobile/MobileASCIIWelcome";
import { useGameStore } from "./store/gameStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useIsMobile } from "./hooks/useIsMobile";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic";

/**
 * Day of the Tentacle inspired portfolio
 * Interactive point-and-click adventure game UI
 */
function App() {
  const isMobile = useIsMobile();

  // Global keyboard shortcuts (only for desktop)
  useKeyboardShortcuts();

  // Background music (plays throughout the app when sound is enabled)
  useBackgroundMusic();

  // Track when welcome screen is dismissed to trigger dialog
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const {
    terminalScreenAction,
    closeTerminalScreen,
    welcomeShown,
    dismissWelcome,
    dialogOpen,
    closeDialog,
    openDialog,
  } = useGameStore();

  // Open intro dialog after welcome screen is dismissed (desktop only)
  useEffect(() => {
    if (!isMobile && welcomeDismissed && welcomeShown) {
      const timer = setTimeout(() => {
        openDialog("intro");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isMobile, welcomeDismissed, welcomeShown, openDialog]);

  // Mobile experience - show welcome screen first, then terminal
  if (isMobile) {
    // Show ASCII welcome screen on mobile
    if (!welcomeShown) {
      return (
        <div className={styles.app}>
          <MobileASCIIWelcome
            onDismiss={() => {
              dismissWelcome();
            }}
          />
        </div>
      );
    }

    // After welcome dismissed, show mobile terminal
    return <MobileTerminal />;
  }

  // Desktop experience - always render Win95 Desktop with game window
  // Welcome screen is shown inside the game window when not dismissed
  return (
    <div className={styles.app}>
      {/* Windows 95 Desktop - always open on desktop */}
      <Win95Desktop
        isOpen={true}
        onClose={() => {}} // No-op since desktop is always open
        gameContent={
          welcomeShown ? (
            terminalScreenAction ? (
              <TerminalScreen
                action={terminalScreenAction}
                onClose={closeTerminalScreen}
              />
            ) : (
              <GameCanvas>
                {/* Scene area - 1280x640 */}
                <div className={gameCanvasStyles.scene}>
                  <Scene />
                </div>

                {/* Toolbar area - 1280x160 */}
                <div className={gameCanvasStyles.toolbar}>
                  <Toolbar />
                </div>
              </GameCanvas>
            )
          ) : undefined
        }
        welcomeContent={
          !welcomeShown ? (
            <WelcomeScreen
              contained={true}
              onDismiss={() => {
                dismissWelcome();
                setWelcomeDismissed(true);
              }}
            />
          ) : undefined
        }
        dialogContent={
          <AdventureDialog
            isOpen={dialogOpen}
            onClose={closeDialog}
            contained={true}
          />
        }
      />

      {/* Copyright footer */}
      <footer className={styles.copyright}>&copy; 2026 Daniele Tortora</footer>
    </div>
  );
}

export default App;
