/**
 * Walkbox geometry: containment, clamping, and shortest paths inside one
 * polygon (concave shapes included). All in native px.
 */
import type { DepthScale, Vec } from "./types";

const EPS = 1e-6;

function onSegment(p: Vec, a: Vec, b: Vec, tolerance = 0.01): boolean {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
  const len = Math.hypot(bx - ax, by - ay);
  if (len < EPS) return Math.hypot(px - ax, py - ay) <= tolerance;
  if (Math.abs(cross) / len > tolerance) return false;
  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay);
  return dot >= -tolerance * len && dot <= len * len + tolerance * len;
}

/** Inside or on the boundary. */
export function pointInPolygon(p: Vec, poly: readonly Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (onSegment(p, poly[j], poly[i])) return true;
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1]) {
      const x = ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
      if (p[0] < x) inside = !inside;
    }
  }
  return inside;
}

function closestOnSegment(p: Vec, a: Vec, b: Vec): Vec {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 < EPS) return a;
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2),
  );
  return [a[0] + dx * t, a[1] + dy * t];
}

/** The point itself if it's walkable, otherwise the nearest boundary point. */
export function clampToPolygon(p: Vec, poly: readonly Vec[]): Vec {
  if (poly.length < 3 || pointInPolygon(p, poly)) return p;
  let best: Vec = poly[0];
  let bestD = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const c = closestOnSegment(p, poly[j], poly[i]);
    const d = Math.hypot(c[0] - p[0], c[1] - p[1]);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** True if the whole segment stays inside the polygon (boundary included). */
export function segmentInPolygon(a: Vec, b: Vec, poly: readonly Vec[]) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.max(1, Math.ceil(len));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p: Vec = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    if (!pointInPolygon(p, poly)) return false;
  }
  return true;
}

const dist = (a: Vec, b: Vec) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/**
 * Shortest walkable path from `from` to `to` (clamped into the polygon),
 * as waypoints excluding `from`. Straight when the segment fits; otherwise
 * Dijkstra over the polygon's vertices, which is exact for one polygon.
 */
export function findPath(from: Vec, to: Vec, poly: readonly Vec[]): Vec[] {
  if (poly.length < 3) return [to];
  const start = clampToPolygon(from, poly);
  const goal = clampToPolygon(to, poly);
  if (segmentInPolygon(start, goal, poly)) return [goal];

  const nodes: Vec[] = [start, goal, ...poly];
  const n = nodes.length;
  const best = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  best[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) {
      if (!done[i] && best[i] < Infinity && (u === -1 || best[i] < best[u]))
        u = i;
    }
    if (u === -1 || u === 1) break;
    done[u] = true;
    for (let v = 0; v < n; v++) {
      if (done[v] || v === u) continue;
      const d = best[u] + dist(nodes[u], nodes[v]);
      if (d < best[v] && segmentInPolygon(nodes[u], nodes[v], poly)) {
        best[v] = d;
        prev[v] = u;
      }
    }
  }
  if (prev[1] === -1) return [goal];
  const path: Vec[] = [];
  for (let v = 1; v !== 0; v = prev[v]) path.unshift(nodes[v]);
  return path;
}

/** Character scale for feet at `y`, clamped to the depth range. */
export function scaleAt(depth: DepthScale, y: number): number {
  const { farY, nearY, farScale, nearScale } = depth;
  if (nearY === farY) return nearScale;
  const t = Math.max(0, Math.min(1, (y - farY) / (nearY - farY)));
  return farScale + (nearScale - farScale) * t;
}
