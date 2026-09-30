import { useEffect, useRef, useState, type MouseEvent } from "react";
import { CHARACTER_RIG, CHARACTER_SHEET } from "../../engine/assets";
import { TRAVEL_MAP_DATA } from "../../engine/scenes";
import { renderFrame } from "../../engine/render";
import { DIALOG_TREE } from "../../config/dialogTrees";
import { paintChoices, paintPanel } from "../toolbar/paint";
import { createStudy, type Study } from "./study";
import { paintLettering } from "./lettering";
import styles from "./RemasterPreview.module.scss";

type Mode = "current" | "remastered" | "compare";
type Studies = [Study, Study];

/** An isolated, synchronized art review. The normal game never imports its assets. */
export default function RemasterPreview() {
  const [mode, setMode] = useState<Mode>("compare");
  const [split, setSplit] = useState(50);
  const [playing, setPlaying] = useState(false);
  const [dialogue, setDialogue] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const studies = useRef<Studies | null>(null);
  const surfaces = useRef<(HTMLCanvasElement | null)[]>([]);
  const controls = useRef({ playing, dialogue });

  useEffect(() => {
    controls.current = { playing, dialogue };
  }, [playing, dialogue]);

  useEffect(() => {
    let active = true;
    let raf = 0;
    const pair: Studies = [createStudy(false), createStudy(true)];
    studies.current = pair;
    const buffers = pair.map((study) => {
      const scene = document.createElement("canvas");
      const text = document.createElement("canvas");
      const toolbar = document.createElement("canvas");
      scene.width = 1280;
      scene.height = 640;
      text.width = study.smooth ? 1280 : 640;
      text.height = study.smooth ? 640 : 320;
      toolbar.width = 1280;
      toolbar.height = 160;
      return { scene, text, toolbar };
    });
    void Promise.all(
      pair.map((study) => study.images.loadAll(study.urls)),
    ).then(() => {
      if (!active) return;
      if (
        pair.some((study) => study.urls.some((url) => !study.images.get(url)))
      ) {
        setError(true);
        return;
      }
      setReady(true);
      let last = performance.now();
      let paintedControls: typeof controls.current | undefined;
      const frame = (now: number) => {
        const delta = controls.current.playing ? Math.min(now - last, 50) : 0;
        last = now;
        if (!controls.current.playing && paintedControls === controls.current) {
          raf = requestAnimationFrame(frame);
          return;
        }
        const repaintToolbar =
          paintedControls?.dialogue !== controls.current.dialogue;
        pair.forEach((study, index) => {
          study.engine.update(delta);
          const { scene, text, toolbar } = buffers[index];
          const ctx = scene.getContext("2d");
          const textCtx = text.getContext("2d");
          const panelCtx = toolbar.getContext("2d");
          const output = surfaces.current[index]?.getContext("2d");
          if (!ctx || !textCtx || !panelCtx || !output) return;
          const paintLine = study.smooth ? paintLettering : undefined;
          renderFrame({
            ctx,
            text: { ctx: textCtx, scale: study.smooth ? 4 : 2, paintLine },
            engine: study.engine,
            images: study.images,
            sheet: CHARACTER_SHEET,
            rig: CHARACTER_RIG,
            map: TRAVEL_MAP_DATA,
            smooth: study.smooth,
          });
          if (repaintToolbar && controls.current.dialogue) {
            paintChoices(
              panelCtx,
              {
                labels: DIALOG_TREE["intro-2"].options!.map((o) => o.label),
                active: 1,
              },
              paintLine,
            );
          } else if (repaintToolbar) {
            paintPanel(
              panelCtx,
              {
                here: null,
                hovered: null,
                pressed: null,
                sentence: "Walk to",
                idle: true,
                soundEnabled: true,
              },
              paintLine,
            );
          }
          output.clearRect(0, 0, 1280, 800);
          output.imageSmoothingEnabled = study.smooth;
          output.imageSmoothingQuality = "high";
          output.drawImage(scene, 0, 0, 1280, 640);
          output.drawImage(text, 0, 0, 1280, 640);
          output.drawImage(toolbar, 0, 640);
          output.canvas.dataset.ready = "true";
          output.canvas.dataset.position = JSON.stringify(
            study.engine.position,
          );
        });
        paintedControls = controls.current;
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      studies.current = null;
    };
  }, []);

  const walk = (x: number, y: number) => {
    for (const study of studies.current ?? []) {
      study.engine.endConversation();
      study.engine.walkTo(x, y);
    }
    setDialogue(false);
    setPlaying(true);
  };
  const clickScene = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = ((event.clientY - rect.top) / rect.height) * 200;
    if (ready && y < 160)
      walk(((event.clientX - rect.left) / rect.width) * 320, y);
  };
  const toggleDialogue = () => {
    for (const study of studies.current ?? []) {
      if (dialogue) study.engine.endConversation();
      else
        study.engine.converse(
          DIALOG_TREE["intro-2"].text,
          () => {},
          () => {},
        );
    }
    setDialogue(!dialogue);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>V2.1 · ART DIRECTION STUDY</p>
          <h1>A familiar place, a little clearer.</h1>
        </div>
        <a href="/">Open the game ↗</a>
      </header>
      <div className={styles.controls}>
        <div
          role="group"
          aria-label="Comparison view"
          className={styles.segment}
        >
          {(["current", "compare", "remastered"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {value === "current"
                ? "Current V2"
                : value === "compare"
                  ? "Compare"
                  : "Remaster study"}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button
            disabled={!ready}
            aria-pressed={playing}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? "Pause motion" : "Play motion"}
          </button>
          <button
            disabled={!ready}
            aria-pressed={dialogue}
            onClick={toggleDialogue}
          >
            Dialogue
          </button>
          <button disabled={!ready} onClick={() => walk(185, 96)}>
            Walk to gates
          </button>
          <button disabled={!ready} onClick={() => walk(128, 145)}>
            Walk forward
          </button>
        </div>
      </div>
      <div
        className={styles.stage}
        data-e2e="remaster-study"
        data-mode={mode}
        onClick={clickScene}
      >
        <canvas
          ref={(el) => {
            surfaces.current[0] = el;
          }}
          width={1280}
          height={800}
          aria-label="Current V2 airport"
          className={styles.current}
        />
        <canvas
          ref={(el) => {
            surfaces.current[1] = el;
          }}
          width={1280}
          height={800}
          aria-label="Remastered airport"
          className={styles.remastered}
          style={{
            clipPath:
              mode === "current"
                ? "inset(0 100% 0 0)"
                : mode === "remastered"
                  ? "none"
                  : `inset(0 0 0 ${split}%)`,
          }}
        />
        {mode === "compare" && (
          <div className={styles.divider} style={{ left: `${split}%` }} />
        )}
        {!ready && (
          <p className={styles.loading} role="status">
            {error
              ? "Artwork could not load. Reload to retry."
              : "Preparing both views…"}
          </p>
        )}
      </div>
      {mode === "compare" && (
        <label className={styles.slider}>
          <span>Current V2</span>
          <input
            aria-label="Comparison divider"
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
          />
          <span>Remaster study</span>
        </label>
      )}
      <footer className={styles.notes}>
        <p>
          <strong>The same airport.</strong> Higher-resolution source art,
          softer sprite edges and clearer lettering. Click the floor to compare
          walking; both views stay in sync.
        </p>
        <p>
          First pass using existing artwork. The small limoncello bottle and
          pixel-drawn toolbar icons still need a separate detail pass. Windows
          95 and Game Boy styling are unchanged.
        </p>
      </footer>
    </main>
  );
}
