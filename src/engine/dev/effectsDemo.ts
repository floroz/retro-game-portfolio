/**
 * Dev-only demo of the procedural effects and moving props (effects.ts),
 * added to a scene under `npm run dev` with `?hd=<scene>` (hdPreview.ts),
 * so the engine side can be checked before the HB builds write the real
 * ones. The props' sprites are flat stand-ins painted at 640x320 density.
 * The HB builds replace all of this with the scene's own data and layers.
 */
import type { MovingProp, SceneData, SceneEffect } from "../types";

/** A stand-in sprite, `w`x`h` logical px, painted at density 2. */
function sprite(
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): string {
  const c = document.createElement("canvas");
  c.width = w * 2;
  c.height = h * 2;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.scale(2, 2);
    paint(ctx);
  }
  return c.toDataURL("image/png");
}

const INK = "#0f0d12";

const plane = () =>
  sprite(14, 6, (ctx) => {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 1.5, 14, 3);
    ctx.fillStyle = "#e8dcc8";
    ctx.fillRect(0.5, 2, 12.5, 2);
    ctx.fillStyle = "#c8483a";
    ctx.fillRect(0.5, 0, 2, 2.5);
    ctx.fillStyle = "#b0a49a";
    ctx.fillRect(5, 3.5, 4, 2);
  });

const bird = () =>
  sprite(7, 5, (ctx) => {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0.5, 7, 4);
    ctx.fillStyle = "#e0b040";
    ctx.fillRect(0.5, 1, 5, 3);
    ctx.fillStyle = "#c8483a";
    ctx.fillRect(5.5, 2, 1.5, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(3.5, 1.5, 1, 1);
  });

const bus = () =>
  sprite(22, 11, (ctx) => {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, 22, 10);
    ctx.fillStyle = "#c8483a";
    ctx.fillRect(0.5, 0.5, 21, 9);
    ctx.fillStyle = "#e0b040";
    for (let x = 2; x < 20; x += 4) ctx.fillRect(x, 1.5, 2.5, 2.5);
    for (let x = 2; x < 20; x += 4) ctx.fillRect(x, 5, 2.5, 2);
    ctx.fillStyle = INK;
    ctx.fillRect(3, 9, 3, 2);
    ctx.fillRect(16, 9, 3, 2);
  });

function zurich(): { effects: SceneEffect[]; props: MovingProp[] } {
  return {
    effects: [
      {
        kind: "stars",
        id: "demo-stars",
        points: [
          [112, 20],
          [126, 26],
          [140, 17],
          [166, 24],
          [184, 19],
          [196, 29],
        ],
        periodMs: 2400,
        color: "#e8dcc8",
        dim: "#466394",
      },
      {
        kind: "glints",
        id: "demo-lake",
        area: { x: 112, y: 64, w: 86, h: 6 },
        count: 6,
        lifeMs: 1400,
        length: 4,
        color: "#e8dcc8",
      },
      {
        kind: "steam",
        id: "demo-mug",
        x: 170,
        y: 94,
        everyMs: 700,
        lifeMs: 2600,
        rise: 22,
        drift: 3,
        size: 2.5,
        color: "#e8dcc8",
        opacity: 0.6,
        baselineY: 126,
      },
    ],
    props: [
      {
        id: "demo-plane",
        sprite: plane(),
        path: [
          { at: 0, x: 104, y: 44, scale: 1 },
          { at: 1, x: 196, y: 14, scale: 0.45 },
        ],
        durationMs: 5000,
        everyMs: 9000,
        delayMs: 800,
        ease: "in",
        clip: { x: 106, y: 13, w: 95, h: 48 },
      },
      {
        id: "demo-cuckoo",
        sprite: bird(),
        path: [
          { at: 0, x: 221, y: 19 },
          { at: 0.2, x: 212, y: 19 },
          { at: 0.8, x: 212, y: 19 },
          { at: 1, x: 221, y: 19 },
        ],
        durationMs: 2200,
        everyMs: 7000,
        delayMs: 1500,
        clip: { x: 205, y: 15, w: 22, h: 12 },
        sound: "cuckoo",
      },
    ],
  };
}

function london(): { effects: SceneEffect[]; props: MovingProp[] } {
  return {
    effects: [
      {
        kind: "rain",
        id: "demo-rain",
        area: { x: 37, y: 30, w: 75, h: 48 },
        drops: 26,
        speed: 90,
        length: 5,
        slant: 12,
        color: "#b0a49a",
        clip: { x: 37, y: 30, w: 75, h: 48 },
      },
      {
        kind: "lamps",
        id: "demo-fruit",
        points: [
          [293, 84],
          [298, 84],
          [303, 84],
          [308, 84],
          [313, 84],
        ],
        size: 2,
        pattern: "chase",
        stepMs: 180,
        on: "#e0b040",
        off: "#5a1e1e",
      },
    ],
    props: [
      {
        id: "demo-bus",
        sprite: bus(),
        path: [
          { at: 0, x: 116, y: 56 },
          { at: 1, x: 12, y: 56 },
        ],
        durationMs: 6000,
        everyMs: 11000,
        delayMs: 600,
        faceTravel: false,
        clip: { x: 37, y: 30, w: 75, h: 48 },
      },
    ],
  };
}

/** `scene` with the demo's effects and props, if it has any. */
export function withDemoEffects(scene: SceneData): SceneData {
  const demo =
    scene.id === "zurich" ? zurich() : scene.id === "london" ? london() : null;
  if (!demo) return scene;
  return {
    ...scene,
    effects: [...(scene.effects ?? []), ...demo.effects],
    props: [...(scene.props ?? []), ...demo.props],
  };
}
