/**
 * Draws one frame in logical px (320x160), scaled by the canvas transform.
 * Frames draw on a 640x320 canvas that CSS scales 2x with
 * `image-rendering: pixelated`, so every pixel stays on the grid: density-1
 * art at 2x nearest-neighbour, pixel for pixel as it looked on the old
 * 320x160 canvas, and density-2 art (the shipped painted art) 1:1.
 * Smoothing is off throughout (docs/art-spec.md, "Phase H": hard pixels,
 * never smooth).
 *
 * Text (labels, captions, speech, the map label) draws on a separate
 * 640x320 layer in the bitmap serif font (font.ts), laid over the art and
 * scaled 2x nearest-neighbour like it, so text sits on the art's pixel
 * grid. To keep the depth order, anything drawn in front of a label also
 * erases it from the text layer (`maskText`), so Daniele walking past the
 * CRT still hides its marquee, and the iris closes over speech.
 *
 * Layers, back to front (docs/art-spec.md, "Layers, depth, and slots"):
 * 1. `bg`
 * 2. everything without a `baselineY`: wall objects, doors, loops, slots, labels
 * 3. everything with a `baselineY`, plus Daniele, sorted by floor line
 * 4. `fg`
 * 5. speech, then the iris
 * The travel map replaces all of it while it plays.
 */
import { COUNTRIES } from "../config/sections";
import type { ImageStore } from "./assets";
import { sceneImages, slotSpriteUrl, travelMapImages } from "./assets";
import { placeCell, type CharacterSheet } from "./character";
import { drawRig } from "./rig/draw";
import { effectShapes, propFrame, type Shape } from "./effects";
import { stampOnGrid } from "./raster";
import type { Rig } from "./rig/rig";
import { animationFrame } from "./animation";
import { drawChalk } from "./chalk";
import { paintOrder, type Paintable } from "./depth";
import {
  CANVAS_H,
  CANVAS_W,
  CORE,
  IRIS_MS,
  NATIVE_H,
  NATIVE_W,
} from "./constants";
import { snap } from "./density";
import {
  drawText,
  fitText,
  lineHeight,
  measureText,
  wrapText,
  type TextLayer,
} from "./font";
import { marqueeX, resolveLabel } from "./labels";
import type { SceneEngine, Transition } from "./SceneEngine";
import type { SlotItem } from "./slots";
import {
  flightProgress,
  headingAt,
  headingIndex,
  pointOnRoute,
} from "./travelMap";
import type {
  MovingProp,
  Rect,
  SceneAnimation,
  SceneData,
  SceneLabel,
  SlotRow,
  TravelMapData,
  Vec,
} from "./types";

type Ctx = CanvasRenderingContext2D;

interface Drawable extends Paintable {
  /** Art, on the art canvas. */
  draw?: (rc: RenderContext) => void;
  /** Text, on the text layer. */
  text?: (layer: TextLayer) => void;
}

export interface RenderContext {
  ctx: Ctx;
  /** The 640x320 text layer over `ctx`. */
  text: TextLayer;
  engine: SceneEngine;
  images: ImageStore;
  sheet: CharacterSheet;
  /** The cut-out rig, if there is one (assets.ts, `CHARACTER_RIG`). */
  rig?: Rig | null;
  map: TravelMapData;
}

/**
 * Sizes the canvas to 640x320 and sets its transform to logical px. Resizing
 * clears the canvas, so it only happens when the size is wrong, right before
 * a full redraw.
 */
function prepareCanvas(rc: RenderContext) {
  const { ctx } = rc;
  const canvas = ctx.canvas;
  if (canvas.width !== CANVAS_W || canvas.height !== CANVAS_H) {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
  }
  ctx.setTransform(CANVAS_W / NATIVE_W, 0, 0, CANVAS_H / NATIVE_H, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

/**
 * Erases the text layer wherever `draw` paints, for art in front of text:
 * `draw` runs again on the text layer, scaled to logical px, with
 * destination-out compositing.
 */
function maskText(rc: RenderContext, draw: (rc: RenderContext) => void) {
  const t = rc.text.ctx;
  t.save();
  t.setTransform(rc.text.scale, 0, 0, rc.text.scale, 0, 0);
  t.imageSmoothingEnabled = false;
  t.globalCompositeOperation = "destination-out";
  draw({ ...rc, ctx: t });
  t.restore();
}

/** The text layer's context, scaled to logical px, for shapes over text. */
function onText(rc: RenderContext, draw: (ctx: Ctx) => void) {
  const t = rc.text.ctx;
  t.save();
  t.setTransform(rc.text.scale, 0, 0, rc.text.scale, 0, 0);
  draw(t);
  t.restore();
}

/** What a frame needs loaded before it's drawn, per scene and for the map. */
const neededCache = new WeakMap<object, string[]>();
function needed(key: SceneData | TravelMapData, urls: () => string[]) {
  let list = neededCache.get(key);
  if (!list) {
    list = urls();
    neededCache.set(key, list);
  }
  return list;
}

export function renderFrame(rc: RenderContext) {
  const { ctx, engine } = rc;
  const tr = engine.transition;
  // Hold the last frame (black before the first) until everything this one
  // draws has loaded, so nothing flashes in half drawn.
  const urls =
    tr?.kind === "map"
      ? needed(rc.map, () => travelMapImages(rc.map))
      : needed(engine.scene, () => [
          ...sceneImages(engine.scene),
          rc.sheet.image,
          ...(rc.rig ? [rc.rig.image] : []),
        ]);
  if (!rc.images.ready(urls)) return;
  prepareCanvas(rc);
  // Test hooks for the E2E suite and the OG image script, which wait on the
  // page rather than on a timer: `data-drawn` is the scene on screen (set
  // once every image it needs has loaded), `data-speaking` is whether a line
  // of speech is up.
  const { dataset } = ctx.canvas;
  const shown = tr?.kind === "map" ? "map" : engine.scene.id;
  if (dataset.drawn !== shown) dataset.drawn = shown;
  const speaking = String(engine.speech !== null);
  if (dataset.speaking !== speaking) dataset.speaking = speaking;
  const t = rc.text.ctx;
  t.setTransform(1, 0, 0, 1, 0, 0);
  t.clearRect(0, 0, t.canvas.width, t.canvas.height);
  if (tr?.kind === "map") {
    drawTravelMap(rc, tr);
    return;
  }

  ctx.fillStyle = CORE.black;
  ctx.fillRect(0, 0, NATIVE_W, NATIVE_H);
  const scene = engine.scene;
  drawImageAt(rc, scene.background, 0, 0);

  const items: Drawable[] = [];
  const add = (
    y: number | undefined,
    draw: Drawable["draw"],
    actor = false,
    text?: Drawable["text"],
  ) => items.push({ y: y ?? null, actor, draw, text });

  for (const thing of [...scene.objects, ...scene.exits]) {
    const state = engine.stateOf(thing.id);
    const url = (state && thing.states?.[state]) || thing.sprite;
    if (!url || thing.x === undefined || thing.y === undefined) continue;
    const { x, y } = thing;
    add(thing.baselineY, (r) => drawImageAt(r, url, x, y));
  }
  for (const anim of scene.animations ?? []) {
    add(anim.baselineY, (r) => drawAnimation(r, anim));
  }
  for (const effect of scene.effects ?? []) {
    add(effect.baselineY, (r) =>
      withClip(r.ctx, effect.clip, () =>
        drawShapes(r.ctx, effectShapes(effect, engine.now), GRID),
      ),
    );
  }
  for (const prop of scene.props ?? []) {
    add(prop.baselineY, (r) => drawProp(r, prop, GRID));
  }
  for (const row of scene.slots ?? []) {
    const rowItems = engine.slots.filter((i) => i.rowId === row.id);
    add(
      row.baselineY,
      (r) => drawSlotRow(r, rowItems),
      false,
      row.caption ? (layer) => drawCaptions(layer, row, rowItems) : undefined,
    );
  }
  for (const label of scene.labels ?? []) {
    add(label.baselineY, undefined, false, (layer) =>
      drawLabel(layer, label, engine.now),
    );
  }
  const actor = engine.position;
  add(actor.y, (r) => drawCharacter(r), true);

  // Once any text is down, art painted after it also masks it.
  let textBelow = false;
  for (const item of paintOrder(items)) {
    if (item.draw) {
      item.draw(rc);
      if (textBelow) maskText(rc, item.draw);
    }
    if (item.text) {
      item.text(rc.text);
      textBelow = true;
    }
  }

  const fg = scene.foreground;
  if (fg) {
    drawImageAt(rc, fg, 0, 0);
    if (textBelow) maskText(rc, (r) => drawImageAt(r, fg, 0, 0));
  }

  drawSpeech(rc);
  if (tr?.kind === "iris") {
    drawIris(ctx, tr);
    onText(rc, (t) => drawIris(t, tr));
  }
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

/** Canvas px per logical px: 2 on the 640x320 canvas. */
const GRID = CANVAS_W / NATIVE_W;

function withClip(ctx: Ctx, clip: Rect | Rect[] | undefined, draw: () => void) {
  if (!clip) return draw();
  ctx.save();
  ctx.beginPath();
  for (const r of Array.isArray(clip) ? clip : [clip]) {
    ctx.rect(r.x, r.y, r.w, r.h);
  }
  ctx.clip();
  draw();
  ctx.restore();
}

/** Logical px to whole grid pixels, and back: `g(v)` is on the grid. */
const onGrid = (v: number, grid: number) => Math.round(v * grid) / grid;

/**
 * Draws effect shapes (effects.ts) with hard pixels: every edge on a whole
 * pixel of the art's grid, at least one pixel big.
 */
function drawShapes(ctx: Ctx, shapes: Shape[], grid: number) {
  const px = 1 / grid;
  const fill = (x: number, y: number, w: number, h: number) =>
    ctx.fillRect(
      onGrid(x, grid),
      onGrid(y, grid),
      Math.max(px, onGrid(w, grid)),
      Math.max(px, onGrid(h, grid)),
    );
  for (const s of shapes) {
    ctx.globalAlpha = s.alpha ?? 1;
    ctx.fillStyle = s.color;
    switch (s.kind) {
      case "px":
        fill(s.x, s.y, px, px);
        break;
      case "rect":
        fill(s.x, s.y, s.w, s.h);
        break;
      case "line": {
        // One grid pixel per step along the longer axis.
        const steps = Math.max(
          1,
          Math.round(
            Math.max(Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1)) * grid,
          ),
        );
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          fill(s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t, px, px);
        }
        break;
      }
      case "disc": {
        // A pixel disc: one span per grid row.
        const cx = onGrid(s.x, grid);
        const cy = onGrid(s.y, grid);
        const rows = Math.round(s.r * grid);
        for (let j = -rows; j < rows; j++) {
          const dy = (j + 0.5) / grid;
          const half = Math.sqrt(Math.max(0, s.r * s.r - dy * dy));
          const w = Math.round(half * grid) / grid;
          if (w > 0) fill(cx - w, cy + j / grid, w * 2, px);
        }
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * A moving prop on its path: drawn pixel for pixel at its own size, or,
 * scaled or mirrored, stamped on the grid with hard edges (raster.ts).
 */
function drawProp(rc: RenderContext, prop: MovingProp, grid: number) {
  const img = rc.images.get(prop.sprite);
  const f = propFrame(prop, rc.engine.now);
  if (!img || !f) return;
  const { ctx } = rc;
  const d = rc.images.density(prop.sprite);
  const frames = prop.frames ?? 1;
  const w = Math.floor(img.naturalWidth / frames);
  const h = img.naturalHeight;
  const sx = f.frame * w;
  withClip(ctx, prop.clip, () => {
    if (f.scale === 1 && !f.flip) {
      ctx.drawImage(img, sx, 0, w, h, snap(f.x, d), snap(f.y, d), w / d, h / d);
      return;
    }
    // Grid px per image px, and the box it lands in.
    const k = (f.scale * grid) / d;
    const left = Math.round(f.x * grid);
    const top = Math.round(f.y * grid);
    const bw = Math.ceil(w * k);
    const bh = Math.ceil(h * k);
    stampOnGrid(ctx, grid, { left, top, w: bw, h: bh }, (sctx) => {
      if (f.flip) {
        sctx.translate(bw, 0);
        sctx.scale(-1, 1);
      }
      sctx.drawImage(img, sx, 0, w, h, 0, 0, w * k, h * k);
    });
  });
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

function drawSlotRow(rc: RenderContext, items: SlotItem[]) {
  for (const item of items) {
    const url = slotSpriteUrl(item.sprite);
    if (url) drawImageAt(rc, url, item.x, item.y);
  }
}

function drawCaptions(layer: TextLayer, row: SlotRow, items: SlotItem[]) {
  if (!row.caption) return;
  for (const item of items) {
    drawText(
      layer,
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

/**
 * A scene label. With `maxWidth`, lines wrap at word breaks, and a single
 * word still too wide shrinks to fit.
 */
function drawLabel(layer: TextLayer, label: SceneLabel, now: number) {
  if (label.chalk) {
    drawChalk(layer, label);
    return;
  }
  const font = label.font ?? "regular";
  const lines = resolveLabel(label.source).flatMap((l) =>
    label.maxWidth ? wrapText(l, label.maxWidth, font) : [l],
  );
  const style = {
    font,
    color: label.color ?? CORE.paper,
    outline: label.outline ?? false,
  };
  if (label.marquee) {
    const { clip } = label.marquee;
    const text = lines.join(" ");
    const x = marqueeX(label.marquee, measureText(text, font), now);
    const { ctx, scale } = layer;
    ctx.save();
    ctx.beginPath();
    ctx.rect(clip.x * scale, clip.y * scale, clip.w * scale, clip.h * scale);
    ctx.clip();
    drawText(layer, text, x, label.y, style);
    ctx.restore();
    return;
  }
  // Every line of a sign is set alike, at the setting its widest line needs.
  const widest = lines.reduce(
    (a, l) => (measureText(l, font) > measureText(a, font) ? l : a),
    "",
  );
  const fit = label.maxWidth
    ? fitText(widest, label.maxWidth, font)
    : { font, tracking: undefined };
  lines.forEach((line, i) => {
    const w = measureText(line, fit.font, fit.tracking);
    const x =
      label.align === "center"
        ? label.x - w / 2
        : label.align === "right"
          ? label.x - w
          : label.x;
    drawText(layer, line, x, label.y + i * lineHeight(fit.font), {
      ...style,
      ...fit,
    });
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
  const figure = engine.figure();
  const { x, y } = engine.position;
  if (figure.kind === "rig") {
    // Rasterized on the art's pixel grid: 2 px per logical px for the
    // 640x320 art (and density-1 art, drawn 2x on the same canvas).
    const atlas = rc.images.get(figure.rig.image);
    if (atlas) {
      drawRig(ctx, atlas, figure.rig, figure.state, x, y, figure.scale, GRID);
    }
    return;
  }
  const img = rc.images.get(sheet.image);
  if (!img) return;
  const { pose, scale: s } = figure;
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

/**
 * Daniele's speech, as Guybrush's in MI3: white letters, a hard black rim,
 * and a black drop shadow.
 */
const SPEECH = {
  color: "#ffffff",
  outline: CORE.black,
  shadow: CORE.black,
} as const;

/** Daniele's lines: centred over his head, kept on screen, SCUMM style. */
function drawSpeech(rc: RenderContext) {
  const speech = rc.engine.speech;
  if (!speech) return;
  const { engine, sheet } = rc;
  const { x, y } = engine.position;
  const lh = lineHeight("regular");
  // The top of the sheet's cell, just above the hair, or the top of the
  // rig's drawing, in logical px above the feet.
  const figure = engine.figure();
  const head =
    figure.kind === "rig"
      ? figure.rig.figureHeight + 1
      : sheet.origin.y / sheet.density - 1;
  const headTop = y - head * figure.scale;
  const top = Math.max(2, Math.round(headTop - 3 - speech.lines.length * lh));
  const widest = Math.max(...speech.lines.map((l) => measureText(l)));
  // Kept clear of the edges by the margin, which covers the rim and shadow.
  const margin = 3;
  const center = Math.max(
    margin + widest / 2,
    Math.min(NATIVE_W - margin - widest / 2, x),
  );
  speech.lines.forEach((line, i) => {
    const w = measureText(line);
    drawText(rc.text, line, center - w / 2, top + i * lh, SPEECH);
  });
}

/**
 * The iris wipe: stepped a logical px at a time, as in the SCUMM games.
 */
function drawIris(ctx: Ctx, tr: Extract<Transition, { kind: "iris" }>) {
  const reach = Math.hypot(NATIVE_W, NATIVE_H);
  const p =
    tr.phase === "close"
      ? 1 - Math.min(1, tr.t / IRIS_MS)
      : Math.min(1, tr.t / IRIS_MS);
  const closed = tr.phase === "close" && tr.t >= IRIS_MS;
  const [cx, cy] = tr.center;
  ctx.fillStyle = CORE.black;
  const r = closed ? 0 : Math.round(reach * p);
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
  const steps = 240;
  ctx.fillStyle = routeColor;
  // Dashes: 3 px on, 2 px off, sampled every native px along the curve.
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

  // Destination label: the city only. The status line names its sections.
  const label = COUNTRIES[tr.to].name;
  const [bx, by] = tr.route.b;
  const lw = measureText(label, "small");
  const lx = Math.max(3, Math.min(NATIVE_W - lw - 3, bx - lw / 2));
  const ly = by - 12 < 2 ? by + 6 : by - 12;
  drawText(rc.text, label, lx, ly, {
    font: "small",
    color: map.labelColor ?? CORE.black,
    outline: CORE.paper,
  });

  drawPlane(rc, tr, progress);
  maskText(rc, (r) => drawPlane(r, tr, progress));
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
