/**
 * Draws one frame on a 640x320 canvas, in logical px (320x160) scaled by
 * RENDER_SCALE. CSS scales the canvas 2x with `image-rendering: pixelated`,
 * so every pixel stays on the grid. Each image draws at its own density
 * (density.ts): density-1 art at 2x nearest-neighbour, pixel for pixel as
 * it looked on the old 320x160 canvas, and density-2 art 1:1. The pixel
 * font draws at canvas resolution.
 *
 * Layers, back to front (docs/art-spec.md, "Layers, depth, and slots"):
 * 1. `bg`
 * 2. everything without a `baselineY`: wall objects, doors, loops, slots, labels
 * 3. everything with a `baselineY`, plus Daniele, sorted by floor line
 * 4. `fg`
 * 5. speech, then the iris
 * The travel map replaces all of it while it plays.
 */
import { sectionList, COUNTRIES } from "../config/sections";
import type { ImageStore } from "./assets";
import { slotSpriteUrl } from "./assets";
import { placeCell, type CharacterSheet } from "./character";
import { animationFrame } from "./animation";
import { paintOrder, type Paintable } from "./depth";
import { CORE, IRIS_MS, NATIVE_H, NATIVE_W, RENDER_SCALE } from "./constants";
import { snap } from "./density";
import { drawText, lineHeight, measureText, wrapText } from "./font";
import { resolveLabel } from "./labels";
import type { SceneEngine, Transition } from "./SceneEngine";
import type { SlotItem } from "./slots";
import {
  flightProgress,
  headingAt,
  headingIndex,
  pointOnRoute,
} from "./travelMap";
import type {
  SceneAnimation,
  SceneLabel,
  SlotRow,
  TravelMapData,
  Vec,
} from "./types";

type Ctx = CanvasRenderingContext2D;

interface Drawable extends Paintable {
  draw: () => void;
}

export interface RenderContext {
  ctx: Ctx;
  engine: SceneEngine;
  images: ImageStore;
  sheet: CharacterSheet;
  map: TravelMapData;
}

export function renderFrame(rc: RenderContext) {
  const { ctx, engine } = rc;
  ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const tr = engine.transition;
  if (tr?.kind === "map") {
    drawTravelMap(rc, tr);
    return;
  }

  ctx.fillStyle = CORE.black;
  ctx.fillRect(0, 0, NATIVE_W, NATIVE_H);
  const scene = engine.scene;
  drawImageAt(rc, scene.background, 0, 0);

  const items: Drawable[] = [];
  const add = (y: number | undefined, draw: () => void, actor = false) =>
    items.push({ y: y ?? null, actor, draw });

  for (const thing of [...scene.objects, ...scene.exits]) {
    const state = engine.stateOf(thing.id);
    const url = (state && thing.states?.[state]) || thing.sprite;
    if (!url || thing.x === undefined || thing.y === undefined) continue;
    const { x, y } = thing;
    add(thing.baselineY, () => drawImageAt(rc, url, x, y));
  }
  for (const anim of scene.animations ?? []) {
    add(anim.baselineY, () => drawAnimation(rc, anim));
  }
  for (const row of scene.slots ?? []) {
    const rowItems = engine.slots.filter((i) => i.rowId === row.id);
    add(row.baselineY, () => drawSlotRow(rc, row, rowItems));
  }
  for (const label of scene.labels ?? []) {
    add(label.baselineY, () => drawLabel(ctx, label));
  }
  const actor = engine.position;
  add(actor.y, () => drawCharacter(rc), true);

  paintOrder(items).forEach((i) => i.draw());

  if (scene.foreground) drawImageAt(rc, scene.foreground, 0, 0);

  drawSpeech(rc);
  if (tr?.kind === "iris") drawIris(ctx, tr);
}

/** Draws a whole image with its top-left at logical `x`,`y`. */
function drawImageAt(rc: RenderContext, url: string, x: number, y: number) {
  const img = rc.images.get(url);
  if (!img) return;
  const d = rc.images.density(url);
  rc.ctx.drawImage(
    img,
    snap(x, d),
    snap(y, d),
    img.naturalWidth / d,
    img.naturalHeight / d,
  );
}

function drawAnimation(rc: RenderContext, anim: SceneAnimation) {
  const img = rc.images.get(anim.strip);
  const f = animationFrame(anim, rc.engine.now);
  if (!img || !f) return;
  const { ctx } = rc;
  const d = rc.images.density(anim.strip);
  // Frame size in image pixels.
  const w = Math.floor(img.naturalWidth / anim.frames);
  const h = img.naturalHeight;
  if (anim.clip) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(anim.clip.x, anim.clip.y, anim.clip.w, anim.clip.h);
    ctx.clip();
  }
  ctx.drawImage(
    img,
    f.frame * w,
    0,
    w,
    h,
    snap(f.x, d),
    snap(f.y, d),
    w / d,
    h / d,
  );
  if (anim.clip) ctx.restore();
}

function drawSlotRow(rc: RenderContext, row: SlotRow, items: SlotItem[]) {
  for (const item of items) {
    const url = slotSpriteUrl(item.sprite);
    if (url) drawImageAt(rc, url, item.x, item.y);
    if (row.caption) {
      drawText(
        rc.ctx,
        item.name,
        item.x + row.caption.dx,
        item.y + row.caption.dy,
        {
          font: "small",
          color: row.caption.color ?? CORE.paper,
        },
      );
    }
  }
}

function drawLabel(ctx: Ctx, label: SceneLabel) {
  const font = label.font ?? "regular";
  const lines = resolveLabel(label.source).flatMap((l) =>
    label.maxWidth ? wrapText(l, label.maxWidth, font) : [l],
  );
  const style = {
    font,
    color: label.color ?? CORE.paper,
    outline: label.outline ?? false,
  };
  lines.forEach((line, i) => {
    const w = measureText(line, font);
    const x =
      label.align === "center"
        ? label.x - Math.floor(w / 2)
        : label.align === "right"
          ? label.x - w
          : label.x;
    drawText(ctx, line, x, label.y + i * lineHeight(font), style);
  });
}

let characterCanvas: HTMLCanvasElement | null = null;

/** A cleared scratch canvas of at least `w`x`h`, reused every frame. */
function scratch(w: number, h: number): HTMLCanvasElement {
  const c = characterCanvas ?? document.createElement("canvas");
  characterCanvas = c;
  if (c.width < w || c.height < h) {
    c.width = Math.max(c.width, w);
    c.height = Math.max(c.height, h);
  }
  const sctx = c.getContext("2d");
  if (sctx) {
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, c.width, c.height);
  }
  return c;
}

/**
 * Daniele, depth-scaled with nearest-neighbour. He's scaled at his sheet's
 * own resolution first, on a scratch canvas, then drawn at its density: a
 * density-1 sheet at 2x, pixel for pixel as on the old 320x160 canvas, and
 * a density-2 sheet 1:1.
 */
function drawCharacter(rc: RenderContext) {
  const { ctx, engine, sheet } = rc;
  const img = rc.images.get(sheet.image);
  if (!img) return;
  const pose = engine.pose();
  const { x, y } = engine.position;
  const s = engine.scale;
  const d = sheet.density;
  const { left, top, w, h } = placeCell(sheet, pose.body, x, y, s);
  if (w < 1 || h < 1) return;

  const cell = scratch(w, h);
  const cctx = cell.getContext("2d");
  if (!cctx) return;
  cctx.imageSmoothingEnabled = false;
  if (pose.mirror) {
    cctx.translate(w, 0);
    cctx.scale(-1, 1);
  }
  const b = pose.body;
  cctx.drawImage(img, b.x, b.y, b.w, b.h, 0, 0, w, h);
  if (pose.head) {
    const hd = pose.head;
    const ox = Math.round(sheet.talkHeadOffset.x * s);
    const oy = Math.round(sheet.talkHeadOffset.y * s);
    cctx.drawImage(
      img,
      hd.x,
      hd.y,
      hd.w,
      hd.h,
      ox,
      oy,
      Math.round(hd.w * s),
      Math.round(hd.h * s),
    );
  }

  ctx.save();
  ctx.scale(1 / d, 1 / d);
  ctx.drawImage(cell, 0, 0, w, h, left, top, w, h);
  ctx.restore();
}

/** Daniele's lines: centred over his head, kept on screen, SCUMM style. */
function drawSpeech(rc: RenderContext) {
  const speech = rc.engine.speech;
  if (!speech) return;
  const { ctx, engine, sheet } = rc;
  const { x, y } = engine.position;
  const lh = lineHeight("regular");
  // The top of the cell, just above the hair, in logical px above the feet.
  const head = sheet.origin.y / sheet.density - 1;
  const headTop = y - head * engine.scale;
  const top = Math.max(2, Math.round(headTop - 3 - speech.lines.length * lh));
  const widest = Math.max(...speech.lines.map((l) => measureText(l)));
  const center = Math.max(
    2 + widest / 2,
    Math.min(NATIVE_W - 2 - widest / 2, x),
  );
  speech.lines.forEach((line, i) => {
    const w = measureText(line);
    drawText(ctx, line, Math.round(center - w / 2), top + i * lh, {
      color: CORE.paper,
      outline: CORE.black,
    });
  });
}

function drawIris(ctx: Ctx, tr: Extract<Transition, { kind: "iris" }>) {
  const reach = Math.hypot(NATIVE_W, NATIVE_H);
  const p =
    tr.phase === "close"
      ? 1 - Math.min(1, tr.t / IRIS_MS)
      : Math.min(1, tr.t / IRIS_MS);
  const r = tr.phase === "close" && tr.t >= IRIS_MS ? 0 : Math.round(reach * p);
  const [cx, cy] = tr.center;
  ctx.fillStyle = CORE.black;
  for (let y = 0; y < NATIVE_H; y++) {
    const d = y - cy;
    if (Math.abs(d) >= r) {
      ctx.fillRect(0, y, NATIVE_W, 1);
      continue;
    }
    const half = Math.floor(Math.sqrt(r * r - d * d));
    ctx.fillRect(0, y, Math.max(0, cx - half), 1);
    ctx.fillRect(cx + half, y, NATIVE_W, 1);
  }
}

// --- Travel map --------------------------------------------------------------

/** A top-down plane facing east, drawn when no plane sprite exists yet. */
// prettier-ignore
const PLANE = [
  "....#....",
  "....##...",
  "#...###..",
  "#########",
  "#...###..",
  "....##...",
  "....#....",
];

let planeCanvas: HTMLCanvasElement | null = null;
function fallbackPlane(): HTMLCanvasElement {
  if (planeCanvas) return planeCanvas;
  const c = document.createElement("canvas");
  c.width = PLANE[0].length;
  c.height = PLANE.length;
  const pctx = c.getContext("2d");
  if (pctx) {
    PLANE.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === "#") {
          pctx.fillStyle = CORE.black;
          pctx.fillRect(x, y, 1, 1);
        }
      }
    });
  }
  planeCanvas = c;
  return c;
}

function drawTravelMap(
  rc: RenderContext,
  tr: Extract<Transition, { kind: "map" }>,
) {
  const { ctx, map, images } = rc;
  ctx.fillStyle = CORE.paper;
  ctx.fillRect(0, 0, NATIVE_W, NATIVE_H);
  drawImageAt(rc, map.background, 0, 0);

  const markerImg = map.marker ? images.get(map.marker) : undefined;
  if (map.marker && markerImg) {
    const d = images.density(map.marker);
    const mw = markerImg.naturalWidth / d;
    const mh = markerImg.naturalHeight / d;
    for (const [mx, my] of Object.values(map.markers)) {
      drawImageAt(rc, map.marker, mx - mw / 2, my - mh / 2);
    }
  }

  const progress = flightProgress(tr.t);
  const routeColor = map.routeColor ?? CORE.red;
  ctx.fillStyle = routeColor;
  // Dashes: 3 px on, 2 px off, sampled every native px along the curve.
  const steps = 240;
  let last: Vec | null = null;
  let travelled = 0;
  for (let i = 0; i <= steps * progress; i++) {
    const p = pointOnRoute(tr.route, i / steps);
    if (last) travelled += Math.hypot(p[0] - last[0], p[1] - last[1]);
    last = p;
    if (Math.floor(travelled) % 5 < 3) {
      ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1);
    }
  }

  // Destination label: the city and its sections.
  const label = `${COUNTRIES[tr.to].name}: ${sectionList(tr.to)}`;
  const [bx, by] = tr.route.b;
  const lw = measureText(label, "small");
  const lx = Math.max(2, Math.min(NATIVE_W - lw - 2, Math.round(bx - lw / 2)));
  const ly = by - 12 < 2 ? by + 6 : by - 12;
  drawText(ctx, label, lx, ly, {
    font: "small",
    color: map.labelColor ?? CORE.black,
    outline: CORE.paper,
  });

  drawPlane(rc, tr, progress);
}

function drawPlane(
  rc: RenderContext,
  tr: Extract<Transition, { kind: "map" }>,
  progress: number,
) {
  const { ctx, map, images } = rc;
  const [px, py] = pointOnRoute(tr.route, progress);
  const angle = headingAt(tr.route, Math.min(0.999, Math.max(0.001, progress)));
  const sprite = map.plane ? images.get(map.plane.strip) : undefined;
  const d = sprite && map.plane ? images.density(map.plane.strip) : 1;
  ctx.save();
  ctx.translate(snap(px, d), snap(py, d));
  // Sizes in image pixels; the sprite is centred on the route.
  if (sprite && map.plane?.headings === 8) {
    const w = Math.floor(sprite.naturalWidth / 8);
    const h = sprite.naturalHeight;
    const i = headingIndex(angle);
    ctx.drawImage(
      sprite,
      i * w,
      0,
      w,
      h,
      -Math.floor(w / 2) / d,
      -Math.floor(h / 2) / d,
      w / d,
      h / d,
    );
  } else {
    const img = sprite ?? fallbackPlane();
    // One heading: rotate in 90 degree steps for a sprite, 45 for the fallback.
    const step = sprite ? Math.PI / 2 : Math.PI / 4;
    ctx.rotate(Math.round(angle / step) * step);
    const w = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
    const h = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
    ctx.drawImage(
      img,
      -Math.floor(w / 2) / d,
      -Math.floor(h / 2) / d,
      w / d,
      h / d,
    );
  }
  ctx.restore();
}
