import { useAdventureFont } from "../../hooks/useAdventureFont";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useGameStore } from "../../store/gameStore";
import {
  CANVAS_CARD_H,
  CANVAS_CARD_W,
  PASS,
  SOUND_FITTING,
  cardPct,
  paintCard,
} from "./titleCard";
import boardingPass from "../../assets/remaster/title/boarding-pass.webp";
// To restore the former role wording, point this import to
// boarding-pass-senior-software-engineer.webp instead.
import { PROFILE } from "../../config/profile";
import { sceneAudio } from "../../engine/runtime";
import styles from "./WelcomeScreen.module.scss";

interface WelcomeScreenProps {
  onDismiss: () => void;
  /**
   * False while the scene's art is still loading. A start requested until
   * then waits, and the card says so (default true).
   */
  ready?: boolean;
}

/**
 * The longest a requested start waits for the art, in ms. A stalled
 * download must never lock the visitor out of the content.
 */
const WAIT_LIMIT_MS = 12000;

/** Illustrated boarding pass with real keyboard, pointer and sound controls. */
export function WelcomeScreen({ onDismiss, ready = true }: WelcomeScreenProps) {
  const fontSettled = useAdventureFont();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundHintId = useId();
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const [soundHover, setSoundHover] = useState(false);
  const [soundFocus, setSoundFocus] = useState(false);
  const soundLit = soundHover || soundFocus;
  const [queued, setQueued] = useState(false);
  const waiting = queued && !ready;

  // The visitor asked to start: now if the art is in, else once it is.
  const start = useCallback(() => {
    if (useGameStore.getState().soundEnabled) sceneAudio.unlock();
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

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      paintCard(ctx, {
        soundEnabled,
        soundLit,
      });
    }
  }, [soundEnabled, soundLit, fontSettled]);

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

      <img
        className={styles.ticket}
        style={cardPct(PASS)}
        src={boardingPass}
        alt=""
        aria-hidden="true"
        data-e2e="welcome-screen-artwork"
        draggable={false}
      />

      <h1 className={styles.text} data-e2e="welcome-screen-name">
        {PROFILE.name}
      </h1>
      <p className={styles.text} data-e2e="welcome-screen-title">
        {PROFILE.title.split(" | ")[0]}
      </p>

      <button
        type="button"
        className={styles.pass}
        style={cardPct(PASS)}
        data-e2e="welcome-screen-prompt"
        aria-label="Press space or click to start"
        aria-describedby={soundHintId}
        onClick={start}
      >
        <span className={styles.prompt}>
          <span className={styles.promptLabel}>
            {waiting ? "HOLD ON" : "PRESS"}
          </span>
          <span className={styles.key}>SPACE</span>
          <span className={styles.promptHint} role="status">
            {waiting ? "Loading…" : "to start"}
          </span>
          <span id={soundHintId} className={styles.soundHint}>
            {soundEnabled ? "Starts with sound" : "Starts silently"}
          </span>
        </span>
      </button>

      <button
        type="button"
        className={styles.fitting}
        style={cardPct(SOUND_FITTING)}
        data-e2e="welcome-screen-sound"
        aria-pressed={soundEnabled}
        aria-label="Sound"
        onClick={(e) => {
          toggleSound();
          if (queued && useGameStore.getState().soundEnabled)
            sceneAudio.unlock();
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
