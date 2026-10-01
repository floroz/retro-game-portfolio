import { useEffect, useRef, useState } from "react";
import { createPocketScene } from "./pocketRenderer";
import {
  loadPocketArt,
  POCKET_ART,
  preloadPocketReading,
} from "./pocketAssets";
import styles from "./PocketScene.module.scss";

interface Props {
  active: boolean;
  playing: boolean;
  sipRequest: number;
}

export function PocketScene({ active, playing, sipRequest }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof createPocketScene> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void loadPocketArt()
      .then((images) => {
        if (cancelled || !root.current) return;
        controller.current = createPocketScene(root.current, images);
        setStatus("ready");
        preloadPocketReading();
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      controller.current?.dispose();
      controller.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    controller.current?.setState({ active, playing });
  }, [active, playing, status]);
  useEffect(() => {
    if (sipRequest > 0) controller.current?.sip();
  }, [sipRequest]);
  return (
    <>
      <div
        key={attempt}
        ref={root}
        className={styles.art}
        aria-hidden="true"
        data-e2e="pocket-art"
      >
        <div className={styles.lightScene}>
          <img
            className={styles.lightPainting}
            src={POCKET_ART.day}
            alt=""
            width="1024"
            height="1536"
          />
          <img
            className={styles.lightNight}
            data-layer="night"
            src={POCKET_ART.night}
            alt=""
            width="1024"
            height="1536"
          />
          <canvas
            className={styles.sceneMotion}
            data-layer="motion"
            data-e2e="pocket-motion"
            width="1024"
            height="1536"
          />
          <div className={styles.lightGold} data-layer="gold" />
          <div className={styles.lightDawn} data-layer="dawn" />
          <div className={styles.lightSkyColor} data-layer="sky-color" />
          <div className={styles.lightSky}>
            <div className={styles.lightSun} data-layer="sun" />
          </div>
          <div className={styles.lightSky}>
            <div className={styles.lightMoon} data-layer="moon">
              <img src={POCKET_ART.raisedNight} alt="" />
            </div>
          </div>
          <div className={styles.lightReflection} data-layer="reflection" />
          <div className={styles.lightMoonWater}>
            <div
              className={styles.lightMoonReflection}
              data-layer="moon-reflection"
              style={{ backgroundImage: `url("${POCKET_ART.raisedNight}")` }}
            />
          </div>
        </div>
      </div>
      {status !== "ready" && (
        <div className={styles.loading} role="status">
          {status === "error" ? (
            <>
              The kitchen is taking a moment. Your portfolio links are ready.
              <button
                type="button"
                onClick={() => {
                  setStatus("loading");
                  setAttempt(attempt + 1);
                }}
              >
                Try the scene again
              </button>
            </>
          ) : (
            "Opening the shutters…"
          )}
        </div>
      )}
    </>
  );
}
