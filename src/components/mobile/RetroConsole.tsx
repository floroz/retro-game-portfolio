import { useState, useEffect, useCallback, useMemo } from "react";
import { useRetroNavigation } from "../../hooks/useRetroNavigation";
import { useRetroSound } from "../../hooks/useRetroSound";
import { useGameStore } from "../../store/gameStore";
import { RetroScreen } from "./RetroScreen";
import styles from "./RetroConsole.module.scss";

/**
 * Check if we should skip boot animation.
 * Plays every visit UNLESS prefers-reduced-motion: reduce.
 */
function shouldSkipBoot(): boolean {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return true;
  }
  return false;
}

/**
 * RetroConsole — Game Boy-inspired handheld console shell.
 * Full-viewport device with gray plastic bezel, LCD screen,
 * cross-shaped D-pad, diagonal A/B buttons, Start/Sound buttons.
 * Boot sequence: idle (user tap/START) → off (300ms) → logo (3.8s) → menu.
 */
export function RetroConsole() {
  const [bootPhase, setBootPhase] = useState<"idle" | "off" | "logo" | "done">(
    "idle",
  );

  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);

  // Enable sound by default on mobile
  useEffect(() => {
    setSoundEnabled(true);
  }, [setSoundEnabled]);

  const { playBootChime, playTapSound, playConfirmSound, playBackSound } =
    useRetroSound();

  const {
    cursorIndex,
    activeSection,
    scrollRef,
    onDpadUp,
    onDpadDown,
    onButtonA,
    onButtonB,
    onButtonStart,
    onSelectItem,
  } = useRetroNavigation();

  // Derive view from boot phase and active section (no setState in effect)
  const view = useMemo(() => {
    if (bootPhase !== "done") return "boot";
    return activeSection ? "section" : "menu";
  }, [bootPhase, activeSection]);

  // Boot animation sequence: idle -> off -> logo -> done
  // idle: User must tap screen or press START to power on
  // off: 300ms flicker then transition to logo
  useEffect(() => {
    if (bootPhase !== "off") return;

    const logoTimer = setTimeout(() => {
      setBootPhase("logo");
    }, 300);

    return () => clearTimeout(logoTimer);
  }, [bootPhase]);

  // Logo phase: slide-down animation (3s), chime at 2.8s, then done 1s after chime
  useEffect(() => {
    if (bootPhase !== "logo") return;

    const chimeTimer = setTimeout(() => {
      playBootChime();
    }, 2800);

    const doneTimer = setTimeout(() => {
      setBootPhase("done");
    }, 3800);

    return () => {
      clearTimeout(chimeTimer);
      clearTimeout(doneTimer);
    };
  }, [bootPhase, playBootChime]);

  // Power on handler: user taps screen or presses START to begin boot
  const handlePowerOn = useCallback(() => {
    if (bootPhase === "idle") {
      if (shouldSkipBoot()) {
        setBootPhase("done");
      } else {
        setBootPhase("off");
      }
    }
  }, [bootPhase]);

  // Sound-wrapped handlers
  const handleDpadUp = useCallback(() => {
    playTapSound();
    onDpadUp();
  }, [playTapSound, onDpadUp]);

  const handleDpadDown = useCallback(() => {
    playTapSound();
    onDpadDown();
  }, [playTapSound, onDpadDown]);

  const handleButtonA = useCallback(() => {
    playConfirmSound();
    onButtonA();
  }, [playConfirmSound, onButtonA]);

  const handleButtonB = useCallback(() => {
    playBackSound();
    onButtonB();
  }, [playBackSound, onButtonB]);

  // Start button handler: power on in idle, or return to menu otherwise
  const handleStart = useCallback(() => {
    if (bootPhase === "idle") {
      handlePowerOn();
    } else {
      playBackSound();
      onButtonStart();
    }
  }, [bootPhase, handlePowerOn, playBackSound, onButtonStart]);

  // Tap on menu item: confirm sound + select
  const handleSelectItem = useCallback(
    (index: number) => {
      playConfirmSound();
      onSelectItem(index);
    },
    [playConfirmSound, onSelectItem],
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.shell} data-e2e="retro-shell">
        {/* Top bezel with printed label */}
        <div className={styles.topBezel}>
          <span className={styles.bezelLabel}>
            DANIELE TORTORA RETRO GAME PORTFOLIO
          </span>
        </div>

        {/* LCD Screen inset */}
        <div className={styles.screenInset}>
          <div className={styles.screenPowerLed}>
            <span
              className={`${styles.led} ${view !== "boot" ? styles.ledOn : ""}`}
            />
          </div>

          <div className={styles.lcdScreen} data-e2e="retro-screen">
            {bootPhase !== "done" ? (
              <div
                className={styles.bootScreen}
                data-e2e="retro-boot-screen"
                onClick={bootPhase === "idle" ? handlePowerOn : undefined}
                style={{ cursor: bootPhase === "idle" ? "pointer" : "default" }}
              >
                {bootPhase === "idle" && (
                  <div className={styles.bootIdle} data-e2e="retro-boot-idle">
                    <span className={styles.bootPrompt}>PRESS START</span>
                  </div>
                )}
                {bootPhase === "off" && <div className={styles.bootOff} />}
                {bootPhase === "logo" && (
                  <div className={styles.bootLogo} data-e2e="retro-boot-logo">
                    <span className={styles.bootBrand}>Daniele Tortora</span>
                    <span className={styles.bootSub}>
                      Senior Software Engineer
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <RetroScreen
                cursorIndex={cursorIndex}
                activeSection={activeSection}
                scrollRef={scrollRef}
                onSelectItem={handleSelectItem}
              />
            )}
          </div>
        </div>

        {/* Controls area */}
        <div className={styles.controlsArea}>
          {/* D-pad (left side) */}
          <div className={styles.dpadContainer}>
            <div className={styles.dpad}>
              <button
                className={`${styles.dpadBtn} ${styles.dpadUp}`}
                onClick={handleDpadUp}
                aria-label="D-pad up"
                data-e2e="retro-dpad-up"
                type="button"
              >
                <span className={styles.dpadArrow} aria-hidden="true">
                  {"▲"}
                </span>
              </button>
              <button
                className={`${styles.dpadBtn} ${styles.dpadRight}`}
                onClick={handleButtonA}
                aria-label="D-pad right - confirm"
                data-e2e="retro-dpad-right"
                type="button"
              >
                <span className={styles.dpadArrow} aria-hidden="true">
                  {"▶"}
                </span>
              </button>
              <button
                className={`${styles.dpadBtn} ${styles.dpadDown}`}
                onClick={handleDpadDown}
                aria-label="D-pad down"
                data-e2e="retro-dpad-down"
                type="button"
              >
                <span className={styles.dpadArrow} aria-hidden="true">
                  {"▼"}
                </span>
              </button>
              <button
                className={`${styles.dpadBtn} ${styles.dpadLeft}`}
                onClick={handleButtonB}
                aria-label="D-pad left - go back"
                data-e2e="retro-dpad-left"
                type="button"
              >
                <span className={styles.dpadArrow} aria-hidden="true">
                  {"◀"}
                </span>
              </button>
              <div className={styles.dpadCenter} />
            </div>
          </div>

          {/* A/B buttons (right side, diagonal) */}
          <div className={styles.abContainer}>
            <button
              className={`${styles.abBtn} ${styles.btnB}`}
              onClick={handleButtonB}
              aria-label="B button - go back"
              data-e2e="retro-btn-b"
              type="button"
            >
              B
            </button>
            <button
              className={`${styles.abBtn} ${styles.btnA}`}
              onClick={handleButtonA}
              aria-label="A button - confirm"
              data-e2e="retro-btn-a"
              type="button"
            >
              A
            </button>
          </div>
        </div>

        {/* Start / Sound buttons (center, below controls) */}
        <div className={styles.metaButtons}>
          <button
            className={styles.metaBtn}
            onClick={toggleSound}
            aria-label={soundEnabled ? "Sound on" : "Sound off"}
            data-e2e="retro-btn-sound"
            data-sound={soundEnabled ? "on" : "off"}
            type="button"
          >
            SOUND
          </button>
          <button
            className={styles.metaBtn}
            onClick={handleStart}
            aria-label="Start - return to menu"
            data-e2e="retro-btn-start"
            type="button"
          >
            START
          </button>
        </div>

        {/* Speaker grille (bottom) */}
        <div className={styles.speakerGrille} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.grilleLine} />
          ))}
        </div>

        {/* Landscape overlay */}
        <div
          className={styles.landscapeOverlay}
          data-e2e="retro-landscape-overlay"
        >
          <p className={styles.landscapeMsg}>Rotate for best experience</p>
        </div>
      </div>
    </div>
  );
}
