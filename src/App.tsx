import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./App.module.scss";
import { GameCanvas } from "./components/game/GameCanvas";
import gameCanvasStyles from "./components/game/GameCanvas.module.scss";
import { Scene } from "./components/game/Scene";
import { Toolbar } from "./components/toolbar/Toolbar";
import { ObjectInspectionView } from "./components/game/ObjectInspectionView";
import { sectionInspection } from "./config/inspections";
import { Win95Desktop } from "./components/desktop/Win95Desktop";
import { WelcomeScreen } from "./components/dialog/WelcomeScreen";
import { PocketAdventure } from "./components/mobile/PocketAdventure";
import { useGameStore } from "./store/gameStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useIsMobile } from "./hooks/useIsMobile";
import { useSceneAudio } from "./hooks/useSceneAudio";
import { allImages, images } from "./engine/runtime";
import { startPreload } from "./engine/preload";

/** Every image the game draws, listed once. */
const ALL_IMAGES = allImages();
const assetsReady = () => images.ready(ALL_IMAGES);

/**
 * Day of the Tentacle inspired portfolio
 * Interactive point-and-click adventure game UI
 */
function App() {
  const isMobile = useIsMobile();

  // Global keyboard shortcuts (only for desktop)
  useKeyboardShortcuts();

  // Scene music, ambience, and effects when sound is on (desktop only; the
  // Pocket Adventure opens quietly)
  useSceneAudio({ enabled: !isMobile });

  // Start loading the art straight away, title card and Hall first, so the
  // launch dialog covers the download (desktop only).
  useEffect(() => {
    if (!isMobile) startPreload();
  }, [isMobile]);

  // True once every scene image has loaded (or failed), so the title card
  // can hold the start until the Hall can be drawn.
  const ready = useSyncExternalStore(images.subscribe, assetsReady);

  // Track when welcome screen is dismissed to trigger dialog
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const {
    terminalScreenAction,
    inspection,
    closeTerminalScreen,
    welcomeShown,
    dismissWelcome,
    openDialog,
  } = useGameStore();

  const reading =
    inspection ??
    (terminalScreenAction && terminalScreenAction !== "talk"
      ? sectionInspection(terminalScreenAction)
      : null);

  // Open intro dialog after welcome screen is dismissed (desktop only)
  useEffect(() => {
    if (!isMobile && welcomeDismissed && welcomeShown) {
      const timer = setTimeout(() => {
        openDialog("intro");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isMobile, welcomeDismissed, welcomeShown, openDialog]);

  // Portrait adventure with direct access to the portfolio.
  if (isMobile) {
    return <PocketAdventure />;
  }

  // Desktop experience - Windows 98 shell with the remastered game
  // Welcome screen is shown inside the game window when not dismissed
  return (
    <div className={styles.app}>
      {/* Windows 98 Desktop - always open on desktop */}
      <Win95Desktop
        isOpen={true}
        onClose={() => {}} // No-op since desktop is always open
        gameContent={
          welcomeShown ? (
            <>
              {reading && (
                <ObjectInspectionView
                  key={inspection?.title ?? terminalScreenAction}
                  inspection={reading}
                  onClose={closeTerminalScreen}
                />
              )}
              {/* The scene stays mounted under the content screen, so the
                  visitor comes back to the same room, mid-animation. */}
              <div
                className={styles.gameLayer}
                inert={terminalScreenAction !== null || inspection !== null}
              >
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
              </div>
            </>
          ) : undefined
        }
        welcomeContent={
          !welcomeShown ? (
            <WelcomeScreen
              ready={ready}
              onDismiss={() => {
                dismissWelcome();
                setWelcomeDismissed(true);
              }}
            />
          ) : undefined
        }
      />

      {/* Copyright footer */}
      <footer className={styles.copyright}>&copy; 2026 Daniele Tortora</footer>
    </div>
  );
}

export default App;
