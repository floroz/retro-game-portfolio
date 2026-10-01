/**
 * Draws one frame in logical px (320x160), scaled by the canvas transform.
 * The remaster draws at 1280x640 with smooth sampling. The original hard
 * pixel treatment remains available for the side-by-side comparison.
 *
 * Text (labels, captions, speech, the map label) draws on a separate
 * separate layer using the supplied lettering painter (font.ts). To keep
 * the depth order, anything drawn in front of a label also
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
import { drawGroundShadow, placeShadow } from "./shadows";
import type { Rig } from "./rig/rig";
import { animationFrame, idleRise, objectPulseScale } from "./animation";
import { drawChalk } from "./chalk";
import { paintOrder, type Paintable } from "./depth";
import { CANVAS_W, CORE, IRIS_MS, NATIVE_H, NATIVE_W } from "./constants";
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
  /** Text layer over `ctx`, with an independent raster density. */
  text: TextLayer;
  engine: SceneEngine;
  images: ImageStore;
  sheet: CharacterSheet;
  /** The cut-out rig, if there is one (assets.ts, `CHARACTER_RIG`). */
  rig?: Rig | null;
  map: TravelMapData;
  /** Keep seated passengers still and omit decorative foot traffic. */
  reducedMotion?: boolean;
  /** Smooth remaster rendering; false retains the original comparison. */
  smooth?: boolean;
}

/**
 * Retains the rig's native detail (1280x640 for density 4), while scene art
 * still scales nearest-neighbour on its original grid. Resizing
 * clears the canvas, so it only happens when the size is wrong, right before
 * a full redraw.
 */
function prepareCanvas(rc: RenderContext) {
  const { ctx } = rc;
  const canvas = ctx.canvas;
  const scale = Math.max(
    CANVAS_W / NATIVE_W,
    rc.rig?.density ?? 1,
    rc.smooth ? 4 : 1,
  );
  const width = NATIVE_W * scale;
  const height = NATIVE_H * scale;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = rc.smooth ?? false;
  ctx.imageSmoothingQuality = "high";
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
  t.imageSmoothingEnabled = rc.smooth ?? false;
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
  drawFloorShadows(rc);

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
    const pulse = "pulse" in thing ? thing.pulse : undefined;
    add(thing.baselineY, (r) => {
      const scale = pulse
        ? objectPulseScale(pulse, engine.now, r.reducedMotion)
        : 1;
      if (!pulse || scale === 1) return drawImageAt(r, url, x, y);
      r.ctx.save();
      r.ctx.translate(0, y + pulse.anchorY);
      r.ctx.scale(1, scale);
      drawImageAt(r, url, x, -pulse.anchorY);
      r.ctx.restore();
    });
  }
  for (const anim of scene.animations ?? []) {
    add(anim.baselineY, (r) => drawAnimation(r, anim));
  }
  for (const effect of scene.effects ?? []) {
    add(effect.baselineY, (r) =>
      withClip(r.ctx, effect.clip, () =>
        drawShapes(
          r.ctx,
          effectShapes(effect, engine.now, r.reducedMotion),
          GRID,
        ),
      ),
    );
  }
  for (const prop of scene.props ?? []) {
    add(prop.baselineY, (r) => drawProp(r, prop, r.smooth ? 4 : GRID));
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

const imageRasters = new WeakMap<HTMLImageElement, HTMLCanvasElement>();

/**
 * Repeated nearest-neighbour draws of the same decoded image can reuse an
 * incorrectly scaled source in Linux WebKit after several frames. A native-
 * size canvas copy keeps the source pixels stable across transforms and
 * contexts. Cache once per image; all scene coordinates stay logical.
 */
function imageRaster(image: HTMLImageElement): CanvasImageSource {
  const cached = imageRasters.get(image);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return image;
  ctx.drawImage(image, 0, 0);
  imageRasters.set(image, canvas);
  return canvas;
}

/** Draws a whole image with its top-left at logical `x`,`y`. */
function drawImageAt(rc: RenderContext, url: string, x: number, y: number) {
  const img = rc.images.get(url);
  if (!img) return;
  const d = rc.images.density(url);
  rc.ctx.drawImage(
    imageRaster(img),
    snap(x, d),
    snap(y, d),
    img.naturalWidth / d,
    img.naturalHeight / d,
  );
}

/** Canvas px per logical px: 2 on the 640x320 canvas. */
const GRID = CANVAS_W / NATIVE_W;

/** A separate floor pass keeps shadows underneath every person and object. */
function drawFloorShadows(rc: RenderContext) {
  const { ctx, engine, images } = rc;
  const scene = engine.scene;
  for (const object of scene.objects) {
    if (object.x === undefined || object.y === undefined) continue;
    for (const shadow of object.groundShadows ?? []) {
      drawGroundShadow(ctx, placeShadow(shadow, object.x, object.y), GRID);
    }
  }
  for (const anim of scene.animations ?? []) {
    const frame = animationFrame(anim, engine.now, rc.reducedMotion);
    if (!frame) continue;
    withClip(ctx, anim.clip, () => {
      for (const shadow of anim.groundShadows ?? []) {
        drawGroundShadow(ctx, placeShadow(shadow, frame.x, frame.y), GRID);
      }
    });
  }
  for (const prop of scene.props ?? []) {
    if (rc.reducedMotion && prop.hideForReducedMotion) continue;
    const frame = propFrame(prop, engine.now);
    const image = images.get(prop.sprite);
    if (!frame || !image) continue;
    const width =
      image.naturalWidth / (prop.frames ?? 1) / images.density(prop.sprite);
    withClip(ctx, prop.clip, () => {
      for (const shadow of prop.groundShadows ?? []) {
        drawGroundShadow(
          ctx,
          placeShadow(
            shadow,
            frame.x,
            frame.y,
            frame.scale,
            frame.flip ? width : undefined,
          ),
          GRID,
        );
      }
    });
  }
  if (scene.characterShadow) {
    const figure = engine.figure();
    const height =
      (figure.kind === "rig"
        ? figure.rig.figureHeight
        : rc.sheet.origin.y / rc.sheet.density) * figure.scale;
    drawGroundShadow(
      ctx,
      {
        ...engine.position,
        width: height * scene.characterShadow.width,
        depth: height * scene.characterShadow.depth,
      },
      GRID,
    );
  }
}

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
  if (rc.reducedMotion && prop.hideForReducedMotion) return;
  const img = rc.images.get(prop.sprite);
  const f = propFrame(prop, rc.engine.now);
  if (!img || !f) return;
  const { ctx } = rc;
  const d = rc.images.density(prop.sprite);
  const frames = prop.frames ?? 1;
  const w = Math.floor(img.naturalWidth / frames);
  const h = img.naturalHeight;
  const sx = f.frame * w;
  const source = imageRaster(img);
  withClip(ctx, prop.clip, () => {
    if (f.scale === 1 && !f.flip) {
      ctx.drawImage(
        source,
        sx,
        0,
        w,
        h,
        snap(f.x, d),
        snap(f.y, d),
        w / d,
        h / d,
      );
      return;
    }
    // Grid px per image px, and the box it lands in.
    const k = (f.scale * grid) / d;
    const left = Math.round(f.x * grid);
    const top = Math.round(f.y * grid);
    const bw = Math.ceil(w * k);
    const bh = Math.ceil(h * k);
    stampOnGrid(
      ctx,
      prop,
      grid,
      { left, top, w: bw, h: bh },
      (sctx) => {
        if (f.flip) {
          sctx.translate(bw, 0);
          sctx.scale(-1, 1);
        }
        sctx.drawImage(source, sx, 0, w, h, 0, 0, w * k, h * k);
      },
      undefined,
      undefined,
      rc.smooth,
    );
  });
}

function drawAnimation(rc: RenderContext, anim: SceneAnimation) {
  const img = rc.images.get(anim.strip);
  const f = animationFrame(anim, rc.engine.now, rc.reducedMotion);
  if (!img || !f) return;
  const { ctx } = rc;
  const d = rc.images.density(anim.strip);
  // Frame size in image pixels.
  const w = Math.floor(img.naturalWidth / anim.frames);
  const h = img.naturalHeight;
  const source = imageRaster(img);
  withClip(ctx, anim.clip, () => {
    if (anim.idle) {
      const split = Math.round(anim.idle.splitY * d);
      const rise = rc.reducedMotion
        ? 0
        : snap(idleRise(anim, rc.engine.now), d);
      // Separate at the lap: breathing never slides the shoes or the chair.
      ctx.drawImage(
        source,
        f.frame * w,
        0,
        w,
        split,
        snap(f.x, d),
        snap(f.y - rise, d),
        w / d,
        split / d + rise,
      );
      ctx.drawImage(
        source,
        f.frame * w,
        split,
        w,
        h - split,
        snap(f.x, d),
        snap(f.y, d) + split / d,
        w / d,
        (h - split) / d,
      );
      return;
    }
    ctx.drawImage(
      source,
      f.frame * w,
      0,
      w,
      h,
      snap(f.x, d),
      snap(f.y, d),
      w / d,
      h / d,
    );
  });
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
  if (label.background) {
    const { area, color } = label.background;
    const { ctx, scale } = layer;
    ctx.fillStyle = color;
    ctx.fillRect(
      area.x * scale,
      area.y * scale,
      area.w * scale,
      area.h * scale,
    );
  }
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
    // Use the rig's own grid so detailed faces survive the final composite.
    const atlas = rc.images.get(figure.rig.image);
    if (atlas) {
      drawRig(
        ctx,
        imageRaster(atlas),
        figure.rig,
        figure.state,
        x,
        y,
        figure.scale,
        Math.max(GRID, figure.rig.density),
        rc.smooth,
      );
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
  const source = imageRaster(img);
  cctx.drawImage(source, b.x, b.y, b.w, b.h, 0, 0, w, h);
  if (pose.head) {
    const hd = pose.head;
    const ox = Math.round(sheet.talkHeadOffset.x * s);
    const oy = Math.round(sheet.talkHeadOffset.y * s);
    cctx.drawImage(
      source,
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

/** Warm white reading text on a quiet, opaque SCUMM-style caption panel. */
const SPEECH = { color: "#fff8e5" } as const;

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
  const top = Math.max(5, Math.round(headTop - 5 - speech.lines.length * lh));
  const widest = Math.max(...speech.lines.map((l) => measureText(l)));
  // Kept clear of the edges by the margin, which covers the rim and shadow.
  const margin = 6;
  const center = Math.max(
    margin + widest / 2,
    Math.min(NATIVE_W - margin - widest / 2, x),
  );
  // Busy paintings must never show through a letter's counters. Keep the
  // square caption close to the speaker, with enough quiet space to read.
  onText(rc, (ctx) => {
    const left = Math.floor(center - widest / 2 - 3);
    const height = speech.lines.length * lh + 4;
    ctx.fillStyle = "#867653";
    ctx.fillRect(left - 0.5, top - 3.5, Math.ceil(widest) + 7, height + 1);
    ctx.fillStyle = "#141720";
    ctx.fillRect(left, top - 3, Math.ceil(widest) + 6, height);
  });
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

  if (tr.route.from === "hall") drawHallOrigin(rc, tr.route.a);

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

/**
 * The Hall's spot on the map, an airfield symbol (a ring round a cross of
 * runways) with its name beneath, unlike a city's red pin: the first
 * flight takes off from somewhere, not from a bare patch of France.
 */
const AIRFIELD = [
  "..###..",
  ".#...#.",
  "#..#..#",
  "#.###.#",
  "#..#..#",
  ".#...#.",
  "..###..",
];

function drawHallOrigin(rc: RenderContext, [hx, hy]: Vec) {
  const { ctx, map } = rc;
  const ink = map.labelColor ?? CORE.black;
  const half = Math.floor(AIRFIELD.length / 2);
  const x0 = Math.round(hx) - half;
  const y0 = Math.round(hy) - half;
  // A paper disc behind the ink keeps the symbol legible on any terrain.
  ctx.fillStyle = CORE.paper;
  AIRFIELD.forEach((row, j) => {
    const first = row.indexOf("#");
    const last = row.lastIndexOf("#");
    ctx.fillRect(x0 + first, y0 + j, last - first + 1, 1);
  });
  ctx.fillStyle = ink;
  AIRFIELD.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === "#") ctx.fillRect(x0 + i, y0 + j, 1, 1);
    }
  });
  const label = map.hallLabel;
  const lw = measureText(label, "small");
  drawText(rc.text, label, Math.round(hx - lw / 2), y0 + AIRFIELD.length + 2, {
    font: "small",
    color: ink,
    outline: CORE.paper,
  });
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
      imageRaster(sprite),
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
      img instanceof HTMLImageElement ? imageRaster(img) : img,
      -Math.floor(w / 2) / d,
      -Math.floor(h / 2) / d,
      w / d,
      h / d,
    );
  }
  ctx.restore();
}
