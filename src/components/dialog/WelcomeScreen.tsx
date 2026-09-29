import { useCallback, useEffect, useRef, useState } from "react";
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
  /**
   * False while the scene's art is still loading. A start requested until
   * then waits, and the card says so (default true).
   */
  ready?: boolean;
}

/** How often the space bar presses itself, in ms. */
const PRESS_MS = 700;

/**
 * The longest a requested start waits for the art, in ms. A stalled
 * download must never lock the visitor out of the content.
 */
const WAIT_LIMIT_MS = 12000;

/**
 * The title card, shown in the game window until the visitor starts: a
 * boarding pass laid on the travel trunk's lid (titleCard.ts). The pass is
 * the button, and Space starts the game too. A brass fitting toggles the
 * sound.
 *
 * If the visitor starts before the scene's art has loaded, the pass stays
 * up with "loading" on its stub and the game starts as soon as the art is in.
 *
 * The art is one canvas; the button and the fitting over it are real
 * controls, and the name and title are also in the page for screen readers.
 */
export function WelcomeScreen({ onDismiss, ready = true }: WelcomeScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const [passLit, setPassLit] = useState(false);
  const [soundHover, setSoundHover] = useState(false);
  const [soundFocus, setSoundFocus] = useState(false);
  const soundLit = soundHover || soundFocus;
  const [pressed, setPressed] = useState(false);
  const [queued, setQueued] = useState(false);
  const waiting = queued && !ready;

  // The visitor asked to start: now if the art is in, else once it is.
  const start = useCallback(() => {
    if (ready) onDismiss();
    else setQueued(true);
  }, [ready, onDismiss]);

  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (queued && ready) dismissRef.current();
  }, [queued, ready]);

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => dismissRef.current(), WAIT_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

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
        pressed: pressed || passLit || waiting,
        soundEnabled,
        soundLit,
        waiting,
      });
    }
  }, [passLit, pressed, soundEnabled, soundLit, waiting]);

  // Space starts the game, whatever has focus except a button the visitor
  // tabbed to, which handles its own Space (the pass starts, the fitting
  // toggles the sound). A click blurs the fitting for that reason.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== " " && e.code !== "Space") return;
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      if (!e.repeat) start();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [start]);

  return (
    <div
      className={styles.screen}
      data-e2e="welcome-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome screen - press space to start"
      aria-busy={waiting}
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
        onClick={start}
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
        onClick={(e) => {
          toggleSound();
          // A click (detail > 0, unlike Enter or Space) hands the keyboard
          // back, so the next Space starts the game.
          if (e.detail > 0) e.currentTarget.blur();
        }}
        onMouseEnter={() => setSoundHover(true)}
        onMouseLeave={() => setSoundHover(false)}
        onFocus={() => setSoundFocus(true)}
        onBlur={() => setSoundFocus(false)}
      />
    </div>
  );
}
