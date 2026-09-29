import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../../store/gameStore";
import {
  CANVAS_CARD_H,
  CANVAS_CARD_W,
  PASS,
  SOUND_FITTING,
  cardPct,
  paintCard,
} from "./titleCard";
import styles from "./WelcomeScreen.module.scss";

interface WelcomeScreenProps {
  onDismiss: () => void;
}

/** How often the space bar presses itself, in ms. */
const PRESS_MS = 700;

/**
 * The title card, shown in the game window until the visitor starts: a
 * boarding pass laid on the travel trunk's lid (titleCard.ts). The pass is
 * the button, and Space starts the game too. A brass fitting toggles the
 * sound.
 *
 * The art is one canvas; the button and the fitting over it are real
 * controls, and the name and title are also in the page for screen readers.
 */
export function WelcomeScreen({ onDismiss }: WelcomeScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const [passLit, setPassLit] = useState(false);
  const [soundLit, setSoundLit] = useState(false);
  const [pressed, setPressed] = useState(false);

  // The space bar presses itself, unless the visitor would rather it didn't.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setPressed((p) => !p), PRESS_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      paintCard(ctx, {
        lit: passLit,
        pressed: pressed || passLit,
        soundEnabled,
        soundLit,
      });
    }
  }, [passLit, pressed, soundEnabled, soundLit]);

  // Space starts the game, whatever has focus (the pass or the fitting
  // handle their own Enter and Space).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== " " && e.code !== "Space") return;
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      if (!e.repeat) onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div
      className={styles.screen}
      data-e2e="welcome-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome screen - press space to start"
    >
      <canvas
        ref={canvasRef}
        className={styles.art}
        width={CANVAS_CARD_W}
        height={CANVAS_CARD_H}
        aria-hidden="true"
      />

      <h1 className={styles.text} data-e2e="welcome-screen-name">
        Daniele Tortora
      </h1>
      <p className={styles.text} data-e2e="welcome-screen-title">
        Senior Software Engineer
      </p>

      <button
        type="button"
        className={styles.pass}
        style={cardPct(PASS)}
        data-e2e="welcome-screen-prompt"
        aria-label="Press space or click to start"
        onClick={onDismiss}
        onMouseEnter={() => setPassLit(true)}
        onMouseLeave={() => setPassLit(false)}
        onFocus={() => setPassLit(true)}
        onBlur={() => setPassLit(false)}
      />

      <button
        type="button"
        className={styles.fitting}
        style={cardPct(SOUND_FITTING)}
        data-e2e="welcome-screen-sound"
        aria-pressed={soundEnabled}
        aria-label="Sound"
        onClick={toggleSound}
        onMouseEnter={() => setSoundLit(true)}
        onMouseLeave={() => setSoundLit(false)}
        onFocus={() => setSoundLit(true)}
        onBlur={() => setSoundLit(false)}
      />
    </div>
  );
}
