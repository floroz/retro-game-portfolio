import { useEffect, useCallback } from "react";
import { DialogPortrait } from "./DialogPortrait";
import { useGameStore } from "../../store/gameStore";
import "./WelcomeScreen.css";

interface WelcomeScreenProps {
  onDismiss: () => void;
}

/**
 * Full-screen welcome intro featuring large portrait
 * Displays once per session, dismisses only on SPACE key or clicking the prompt
 */
export function WelcomeScreen({ onDismiss }: WelcomeScreenProps) {
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const toggleSound = useGameStore((state) => state.toggleSound);

  // Handle dismiss - only triggered by space key or clicking prompt
  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // Handle sound toggle without dismissing the screen
  const handleSoundToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleSound();
    },
    [toggleSound],
  );

  // Handle prompt click
  const handlePromptClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleDismiss();
    },
    [handleDismiss],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only dismiss on SPACE key
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDismiss]);

  return (
    <div
      className="welcome-screen"
      data-e2e="welcome-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome screen - press space to start"
    >
      {/* CRT scanline overlay */}
      <div className="welcome-screen__scanlines" aria-hidden="true" />

      {/* Sound toggle in corner */}
      <div className="welcome-screen__sound-corner">
        <button
          className={`welcome-screen__sound-toggle ${soundEnabled ? "welcome-screen__sound-toggle--on" : ""}`}
          onClick={handleSoundToggle}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? "Sound enabled" : "Sound disabled"}
        >
          <span className="welcome-screen__sound-icon" aria-hidden="true">
            {soundEnabled ? "🔊" : "🔇"}
          </span>
          <span className="welcome-screen__sound-label">
            SOUND: {soundEnabled ? "ON" : "OFF"}
          </span>
        </button>
        <p className="welcome-screen__sound-hint">
          Enable for better experience
        </p>
      </div>

      {/* Content container */}
      <div className="welcome-screen__content">
        {/* Large portrait with frame */}
        <div className="welcome-screen__portrait-wrapper">
          <DialogPortrait size="large" />
        </div>

        {/* Name and title */}
        <h1 className="welcome-screen__name" data-e2e="welcome-screen-name">
          DANIELE TORTORA
        </h1>
        <p className="welcome-screen__title" data-e2e="welcome-screen-title">
          Senior Software Engineer
        </p>

        {/* Press space to start prompt - clickable */}
        <button
          className="welcome-screen__prompt"
          data-e2e="welcome-screen-prompt"
          onClick={handlePromptClick}
          aria-label="Press space or click to start"
        >
          [ Press SPACE to start ]
        </button>
      </div>

      {/* Decorative corner elements */}
      <div className="welcome-screen__corner welcome-screen__corner--tl" />
      <div className="welcome-screen__corner welcome-screen__corner--tr" />
      <div className="welcome-screen__corner welcome-screen__corner--bl" />
      <div className="welcome-screen__corner welcome-screen__corner--br" />
    </div>
  );
}
