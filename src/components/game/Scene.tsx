import { useEffect, useRef, useSyncExternalStore } from "react";
import type { MouseEvent } from "react";
import styles from "./Scene.module.scss";
import { useGameStore } from "../../store/gameStore";
import { useSceneKeyboard } from "../../hooks/useSceneKeyboard";
import { CHARACTER_SHEET } from "../../engine/assets";
import { NATIVE_H, NATIVE_W } from "../../engine/constants";
import { renderFrame } from "../../engine/render";
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

/** Native px under the pointer. */
function nativePoint(e: MouseEvent<HTMLElement>): [number, number] {
  const r = e.currentTarget.getBoundingClientRect();
  return [
    ((e.clientX - r.left) / r.width) * NATIVE_W,
    ((e.clientY - r.top) / r.height) * NATIVE_H,
  ];
}

/**
 * The game scene: a 320x160 canvas drawn by the engine every frame, with
 * invisible buttons over each hotspot for the pointer, the keyboard, and
 * screen readers. Left click walks or uses; right click looks.
 */
export function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentScene = useGameStore((s) => s.currentScene);
  const sceneRequest = useGameStore((s) => s.sceneRequest);
  const contentOpen = useGameStore((s) => s.terminalScreenAction !== null);
  const setHoveredObject = useGameStore((s) => s.setHoveredObject);
  const spriteInfo = useSyncExternalStore(images.subscribe, images.getInfo);
  const scene = SCENES[currentScene];
  const hits = interactablesFor(scene, spriteInfo);

  useSceneKeyboard();

  // Preload everything once, so no scene change ever flashes. Requests
  // posted while the game was closed (a terminal command) are dropped.
  useEffect(() => {
    void images.loadAll(allImages());
    useGameStore.getState().takeSceneRequest();
    useGameStore.getState().setCurrentScene(getEngine().scene.id);
  }, []);

  // The frame loop pauses while the content screen covers the scene.
  useEffect(() => {
    if (contentOpen) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const engine = getEngine();
    engine.contentClosed();
    let last = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      engine.update(t - last);
      last = t;
      renderFrame({
        ctx,
        engine,
        images,
        sheet: CHARACTER_SHEET,
        map: TRAVEL_MAP_DATA,
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [contentOpen]);

  // Toolbar and terminal shortcuts arrive through the store.
  useEffect(() => {
    if (!sceneRequest) return;
    const request = useGameStore.getState().takeSceneRequest();
    if (!request) return;
    const engine = getEngine();
    if (request.kind === "section") engine.goToSection(request.section);
    else engine.travelTo(request.scene);
  }, [sceneRequest]);

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
        width={NATIVE_W}
        height={NATIVE_H}
        aria-hidden="true"
      />
      <div className={styles.hotspots}>
        {hits.map((hit) => (
          <button
            key={hitKey(hit)}
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
