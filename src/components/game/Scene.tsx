import { useEffect, useRef, useSyncExternalStore } from "react";
import type { MouseEvent } from "react";
import styles from "./Scene.module.scss";
import { useGameStore } from "../../store/gameStore";
import { useSceneKeyboard } from "../../hooks/useSceneKeyboard";
import { useConversation } from "../../hooks/useConversation";
import { CHARACTER_RIG, CHARACTER_SHEET } from "../../engine/assets";
import { NATIVE_H, NATIVE_W } from "../../engine/constants";
import { renderFrame } from "../../engine/render";
import { paintLettering } from "../../engine/lettering";
import { allImages, getEngine, images } from "../../engine/runtime";
import { interactablesFor, type Hit } from "../../engine/SceneEngine";
import { SCENES, TRAVEL_MAP_DATA } from "../../engine/scenes";
import type { Rect } from "../../engine/types";
import { SceneDebugOverlay } from "./SceneDebugOverlay";
import { SCENE_DEBUG } from "./sceneDebug";

const pct = (r: Rect) => ({
  left: `${(r.x / NATIVE_W) * 100}%`,
  top: `${(r.y / NATIVE_H) * 100}%`,
  width: `${(r.w / NATIVE_W) * 100}%`,
  height: `${(r.h / NATIVE_H) * 100}%`,
});

const hitKey = (hit: Hit) =>
  hit.target.kind === "object"
    ? `object:${hit.target.object.id}`
    : hit.target.kind === "exit"
      ? `exit:${hit.target.exit.id}`
      : `slot:${hit.target.item.id}`;

/** Logical scene px under the pointer. */
function nativePoint(e: MouseEvent<HTMLElement>): [number, number] {
  const r = e.currentTarget.getBoundingClientRect();
  return [
    ((e.clientX - r.left) / r.width) * NATIVE_W,
    ((e.clientY - r.top) / r.height) * NATIVE_H,
  ];
}

/** Text renders at the same density as the recovered adventure artwork. */
const TEXT_SCALE = 4;

/**
 * The game scene: art and lettering at 1280x640, sharing the original
 * 320x160 logical coordinates (render.ts). The higher density changes no
 * walking paths or interaction geometry. There are
 * invisible buttons over each hotspot for the
 * pointer, the keyboard, and screen readers. Left click walks or uses;
 * right click looks.
 */
export function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLCanvasElement>(null);
  const currentScene = useGameStore((s) => s.currentScene);
  const contentOpen = useGameStore(
    (s) => s.contentSection !== null || s.inspection !== null,
  );
  const setHoveredObject = useGameStore((s) => s.setHoveredObject);
  const spriteInfo = useSyncExternalStore(images.subscribe, images.getInfo);
  const scene = SCENES[currentScene];
  const hits = interactablesFor(scene, spriteInfo);

  useSceneKeyboard();
  useConversation();

  // Preload everything once, so no scene change ever flashes.
  useEffect(() => {
    void images.loadAll(allImages());
    useGameStore.getState().setCurrentScene(getEngine().scene.id);
  }, []);

  // The frame loop pauses while the content screen covers the scene.
  useEffect(() => {
    if (contentOpen) return;
    const ctx = canvasRef.current?.getContext("2d");
    const textCtx = textRef.current?.getContext("2d");
    if (!ctx || !textCtx) return;
    const text = { ctx: textCtx, scale: TEXT_SCALE, paintLine: paintLettering };
    const engine = getEngine();
    engine.contentClosed();
    let last = performance.now();
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let raf = 0;
    const frame = (t: number) => {
      engine.update(t - last, { reducedMotion: motionPreference.matches });
      last = t;
      renderFrame({
        ctx,
        text,
        engine,
        images,
        sheet: CHARACTER_SHEET,
        rig: CHARACTER_RIG,
        map: TRAVEL_MAP_DATA,
        reducedMotion: motionPreference.matches,
        smooth: true,
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [contentOpen]);

  const onFloorClick = (e: MouseEvent<HTMLDivElement>) => {
    const [x, y] = nativePoint(e);
    getEngine().walkTo(x, y);
  };

  return (
    <div
      className={styles.scene}
      data-e2e="scene"
      data-scene={currentScene}
      onClick={onFloorClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onFloorClick(e);
      }}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={NATIVE_W * TEXT_SCALE}
        height={NATIVE_H * TEXT_SCALE}
        aria-hidden="true"
      />
      <canvas
        ref={textRef}
        className={styles.text}
        width={NATIVE_W * TEXT_SCALE}
        height={NATIVE_H * TEXT_SCALE}
        aria-hidden="true"
      />
      <div className={styles.hotspots}>
        {hits.map((hit) => (
          <button
            key={hit.part ? `${hitKey(hit)}:${hit.part}` : hitKey(hit)}
            type="button"
            className={styles.hotspot}
            style={pct(hit.rect)}
            data-e2e="hotspot"
            data-hotspot={hitKey(hit)}
            aria-label={hit.text}
            onClick={(e) => {
              e.stopPropagation();
              getEngine().activate(hit.target);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              getEngine().look(hit.target);
            }}
            onMouseEnter={() => setHoveredObject(hit.text)}
            onMouseLeave={() => setHoveredObject(null)}
            onFocus={() => setHoveredObject(hit.text)}
            onBlur={() => setHoveredObject(null)}
          />
        ))}
      </div>
      {SCENE_DEBUG && <SceneDebugOverlay scene={scene} hits={hits} />}
    </div>
  );
}
