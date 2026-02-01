import { useEffect, useState } from "react";
import styles from "./App.module.scss";
import { GameCanvas } from "./components/game/GameCanvas";
import gameCanvasStyles from "./components/game/GameCanvas.module.scss";
import { Scene } from "./components/game/Scene";
import { Toolbar } from "./components/toolbar/Toolbar";
import { ContentModal } from "./components/game/ContentModal";
import { RetroTerminal } from "./components/game/RetroTerminal";
import { WelcomeScreen } from "./components/dialog/WelcomeScreen";
import { AdventureDialog } from "./components/dialog/AdventureDialog";
import { MobileTerminal } from "./components/mobile/MobileTerminal";
import { useGameStore } from "./store/gameStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useIsMobile } from "./hooks/useIsMobile";

/**
 * Day of the Tentacle inspired portfolio
 * Interactive point-and-click adventure game UI
 */
function App() {
  const isMobile = useIsMobile();

  // Global keyboard shortcuts (only for desktop)
  useKeyboardShortcuts();

  // Track when welcome screen is dismissed to trigger dialog
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const {
    modalOpen,
    activeAction,
    closeModal,
    terminalOpen,
    closeTerminal,
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

  // Mobile experience - show full-screen terminal with modals
  if (isMobile) {
    return (
      <>
        <MobileTerminal />

        {/* Content modal overlay - shared with desktop */}
        <ContentModal
          isOpen={modalOpen}
          action={activeAction}
          onClose={closeModal}
        />

        {/* Adventure dialog overlay - shared with desktop */}
        <AdventureDialog isOpen={dialogOpen} onClose={closeDialog} />
      </>
    );
  }

  // Desktop: Don't render game content until welcome screen is dismissed
  if (!welcomeShown) {
    return (
      <div className={styles.app}>
        <WelcomeScreen
          onDismiss={() => {
            dismissWelcome();
            setWelcomeDismissed(true);
          }}
        />
      </div>
    );
  }

  // Desktop experience - interactive game
  return (
    <div className={styles.app}>
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

      {/* Content modal overlay */}
      <ContentModal
        isOpen={modalOpen}
        action={activeAction}
        onClose={closeModal}
      />

      {/* Retro terminal overlay */}
      <RetroTerminal isOpen={terminalOpen} onClose={closeTerminal} />

      {/* Adventure dialog overlay */}
      <AdventureDialog isOpen={dialogOpen} onClose={closeDialog} />

      {/* Copyright footer */}
      <footer className={styles.copyright}>© 2026 Daniele Tortora</footer>
    </div>
  );
}

export default App;
