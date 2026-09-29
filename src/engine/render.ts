/**
 * Draws one frame at native resolution (320x160). CSS scales the canvas 4x
 * with `image-rendering: pixelated`, so every pixel stays on the grid.
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
import type { CharacterSheet } from "./character";
import { animationFrame } from "./animation";
import { paintOrder, type Paintable } from "./depth";
import { CORE, IRIS_MS, NATIVE_H, NATIVE_W } from "./constants";
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
  ctx.imageSmoothingEnabled = false;
  const tr = engine.transition;
  if (tr?.kind === "map") {
    drawTravelMap(rc, tr);
    return;
  }

  ctx.fillStyle = CORE.black;
  ctx.fillRect(0, 0, NATIVE_W, NATIVE_H);
  const scene = engine.scene;
  const bg = rc.images.get(scene.background);
  if (bg) ctx.drawImage(bg, 0, 0);

  const items: Drawable[] = [];
  const add = (y: number | undefined, draw: () => void, actor = false) =>
    items.push({ y: y ?? null, actor, draw });

  for (const thing of [...scene.objects, ...scene.exits]) {
    const state = engine.stateOf(thing.id);
    const url = (state && thing.states?.[state]) || thing.sprite;
    if (!url || thing.x === undefined || thing.y === undefined) continue;
    const { x, y } = thing;
    add(thing.baselineY, () => {
      const img = rc.images.get(url);
      if (img) ctx.drawImage(img, x, y);
    });
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

  if (scene.foreground) {
    const fg = rc.images.get(scene.foreground);
    if (fg) ctx.drawImage(fg, 0, 0);
  }

  drawSpeech(rc);
  if (tr?.kind === "iris") drawIris(ctx, tr);
}

function drawAnimation(rc: RenderContext, anim: SceneAnimation) {
  const img = rc.images.get(anim.strip);
  const f = animationFrame(anim, rc.engine.now);
  if (!img || !f) return;
  const { ctx } = rc;
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
    Math.round(f.x),
    Math.round(f.y),
    w,
    h,
  );
  if (anim.clip) ctx.restore();
}

function drawSlotRow(rc: RenderContext, row: SlotRow, items: SlotItem[]) {
  for (const item of items) {
    const url = slotSpriteUrl(item.sprite);
    const img = url ? rc.images.get(url) : undefined;
    if (img) rc.ctx.drawImage(img, item.x, item.y);
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

function drawCharacter(rc: RenderContext) {
  const { ctx, engine, sheet } = rc;
  const img = rc.images.get(sheet.image);
  if (!img) return;
  const pose = engine.pose();
  const { x, y } = engine.position;
  const s = engine.scale;
  const cellW = pose.body.w;
  const w = Math.round(cellW * s);
  const h = Math.round(pose.body.h * s);
  const left = Math.round(x - sheet.origin.x * s);
  const top = Math.round(y - sheet.origin.y * s);

  ctx.save();
  if (pose.mirror) {
    ctx.translate(left + w, top);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(left, top);
  }
  const b = pose.body;
  ctx.drawImage(img, b.x, b.y, b.w, b.h, 0, 0, w, h);
  if (pose.head) {
    const hd = pose.head;
    const ox = Math.round(sheet.talkHeadOffset.x * s);
    const oy = Math.round(sheet.talkHeadOffset.y * s);
    ctx.drawImage(
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
  ctx.restore();
}

/** Daniele's lines: centred over his head, kept on screen, SCUMM style. */
function drawSpeech(rc: RenderContext) {
  const speech = rc.engine.speech;
  if (!speech) return;
  const { ctx, engine } = rc;
  const { x, y } = engine.position;
  const lh = lineHeight("regular");
  const headTop = y - 60 * engine.scale;
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
  const bg = images.get(map.background);
  if (bg) ctx.drawImage(bg, 0, 0);

  const markerImg = map.marker ? images.get(map.marker) : undefined;
  if (markerImg) {
    for (const [mx, my] of Object.values(map.markers)) {
      ctx.drawImage(
        markerImg,
        Math.round(mx - markerImg.naturalWidth / 2),
        Math.round(my - markerImg.naturalHeight / 2),
      );
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
  ctx.save();
  ctx.translate(Math.round(px), Math.round(py));
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
      -Math.floor(w / 2),
      -Math.floor(h / 2),
      w,
      h,
    );
  } else {
    const img = sprite ?? fallbackPlane();
    // One heading: rotate in 90 degree steps for a sprite, 45 for the fallback.
    const step = sprite ? Math.PI / 2 : Math.PI / 4;
    ctx.rotate(Math.round(angle / step) * step);
    const w = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
    const h = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
    ctx.drawImage(img, -Math.floor(w / 2), -Math.floor(h / 2));
  }
  ctx.restore();
}
