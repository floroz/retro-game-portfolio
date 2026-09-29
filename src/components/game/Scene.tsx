import { useEffect, useRef, useSyncExternalStore } from "react";
import type { MouseEvent } from "react";
import styles from "./Scene.module.scss";
import { useGameStore } from "../../store/gameStore";
import { useSceneKeyboard } from "../../hooks/useSceneKeyboard";
import { CHARACTER_RIG, CHARACTER_SHEET } from "../../engine/assets";
import { CANVAS_H, CANVAS_W, NATIVE_H, NATIVE_W } from "../../engine/constants";
import { FONT_FAMILY, type TextLayer } from "../../engine/font";
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

/** Logical scene px under the pointer. */
function nativePoint(e: MouseEvent<HTMLElement>): [number, number] {
  const r = e.currentTarget.getBoundingClientRect();
  return [
    ((e.clientX - r.left) / r.width) * NATIVE_W,
    ((e.clientY - r.top) / r.height) * NATIVE_H,
  ];
}

/** Widest text canvas, in pixels: 4x the 1280 px scene on a 2x screen. */
const MAX_TEXT_W = 5120;

/**
 * Sizes the text canvas to the scene's on-screen size times the device
 * pixel ratio (never below 1280x640), so text is drawn 1:1 with the
 * screen's pixels. The window's CSS scaling shows in the bounding rect, so
 * this runs every frame; it only resizes when the size changes.
 */
function fitTextLayer(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): TextLayer {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.min(
    MAX_TEXT_W,
    Math.max(NATIVE_W * 4, Math.round(rect.width * dpr)),
  );
  const h = Math.round((w * NATIVE_H) / NATIVE_W);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { ctx, scale: w / NATIVE_W };
}

/**
 * The game scene: a canvas drawn by the engine every frame in 320x160
 * logical px (render.ts), 640x320 and pixelated for pixel-art scenes and at
 * display resolution for HD ones (backing.ts), a display-resolution text
 * canvas over it (font.ts), and invisible buttons over each hotspot for the
 * pointer, the keyboard, and screen readers. Left click walks or uses;
 * right click looks.
 */
export function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLCanvasElement>(null);
  const currentScene = useGameStore((s) => s.currentScene);
  const sceneRequest = useGameStore((s) => s.sceneRequest);
  const contentOpen = useGameStore((s) => s.terminalScreenAction !== null);
  const dialogOpen = useGameStore((s) => s.dialogOpen);
  const setHoveredObject = useGameStore((s) => s.setHoveredObject);
  const spriteInfo = useSyncExternalStore(images.subscribe, images.getInfo);
  const scene = SCENES[currentScene];
  const hits = interactablesFor(scene, spriteInfo);

  useSceneKeyboard();

  // Preload everything once, so no scene change ever flashes. Requests
  // posted while the game was closed (a terminal command) are dropped.
  useEffect(() => {
    void images.loadAll(allImages());
    void document.fonts?.load(`600 16px ${FONT_FAMILY}`);
    useGameStore.getState().takeSceneRequest();
    useGameStore.getState().setCurrentScene(getEngine().scene.id);
  }, []);

  // Daniele greets the visitor once the intro conversation (opened by App
  // after the welcome screen) is out of the way and the Hall is in view.
  const introSeen = useRef(false);
  useEffect(() => {
    if (dialogOpen) introSeen.current = true;
    else if (introSeen.current) getEngine().greet();
  }, [dialogOpen]);

  // The frame loop pauses while the content screen covers the scene.
  useEffect(() => {
    if (contentOpen) return;
    const ctx = canvasRef.current?.getContext("2d");
    const textCanvas = textRef.current;
    const textCtx = textCanvas?.getContext("2d");
    if (!ctx || !textCanvas || !textCtx) return;
    const engine = getEngine();
    engine.contentClosed();
    let last = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      engine.update(t - last);
      last = t;
      // On screen size, for an HD scene's display-resolution canvas.
      const box = ctx.canvas.getBoundingClientRect();
      renderFrame({
        ctx,
        text: fitTextLayer(textCanvas, textCtx),
        engine,
        images,
        sheet: CHARACTER_SHEET,
        rig: CHARACTER_RIG,
        map: TRAVEL_MAP_DATA,
        display: { w: box.width, h: box.height, dpr: devicePixelRatio || 1 },
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
        width={CANVAS_W}
        height={CANVAS_H}
        aria-hidden="true"
      />
      <canvas ref={textRef} className={styles.text} aria-hidden="true" />
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
