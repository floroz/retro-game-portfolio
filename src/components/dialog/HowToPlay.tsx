import { useEffect, useRef } from "react";
import { GameCanvas } from "../game/GameCanvas";
import artwork from "../../assets/remaster/title/how-to-play.png";
import styles from "./HowToPlay.module.scss";

interface HowToPlayProps {
  returning: boolean;
  onContinue: () => void;
}

/** Live Pixel Operator lettering over the approved airport trunk artwork. */
export function HowToPlay({ returning, onContinue }: HowToPlayProps) {
  const screen = useRef<HTMLDivElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = screen.current;
    if (previous instanceof HTMLElement && !dialog?.contains(previous))
      opener.current = previous;
    // Focus the dialog, not its action: a carried-over Space cannot dismiss it.
    screen.current?.focus();
    return () => {
      if (returning) {
        queueMicrotask(() => {
          if (!dialog?.isConnected && opener.current?.isConnected)
            opener.current.focus({ preventScroll: true });
        });
      }
    };
  }, [returning]);

  return (
    <div className={styles.overlay}>
      <GameCanvas>
        <div
          ref={screen}
          className={styles.screen}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-to-play-title"
          data-e2e="how-to-play"
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Tab") {
              e.preventDefault();
              action.current?.focus();
            } else if (e.key === "Escape" && returning) {
              onContinue();
            } else if (e.key === " " || e.key === "Enter") {
              if (e.repeat || e.target !== action.current) e.preventDefault();
            }
          }}
        >
          <img className={styles.art} src={artwork} alt="" draggable={false} />
          <h1 id="how-to-play-title" className={styles.title}>
            HOW TO PLAY
          </h1>
          <div className={styles.leftMouse}>
            <h2>LEFT CLICK</h2>
            <p>Walk, talk, or interact.</p>
          </div>
          <div className={styles.rightMouse}>
            <h2>RIGHT CLICK</h2>
            <p>
              Look without
              <br />
              walking over.
            </p>
          </div>
          <span className={styles.arrows}>↑ ← ↓ →</span>
          <span className={styles.walkOr}>or</span>
          <span className={styles.wasd}>WASD</span>
          <span className={styles.tab}>Tab</span>
          <span className={styles.enter}>Enter</span>
          <span className={styles.useOr}>or</span>
          <span className={styles.space}>Space</span>
          <span className={styles.escape}>Esc</span>
          <p className={styles.walk}>Walk around.</p>
          <p className={styles.focus}>Focus objects and buttons.</p>
          <p className={styles.use}>Use focused control.</p>
          <p className={styles.stop}>Stop walking or skip a flight.</p>
          <div className={styles.bottomRow}>
            <p className={styles.footer}>
              Every portfolio section is
              <br />
              one click away in the trunk.
            </p>
            <button
              ref={action}
              type="button"
              className={styles.action}
              style={returning ? { fontSize: 28 } : undefined}
              onClick={onContinue}
              data-e2e="how-to-play-continue"
            >
              <span className={styles.actionLabel}>
                {returning ? "Back to the adventure" : "Let’s go"}
                <span className={styles.actionHint}>
                  Click or focus and press Space
                </span>
              </span>
            </button>
          </div>
        </div>
      </GameCanvas>
    </div>
  );
}
