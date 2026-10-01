/**
 * Travel-map route geometry: a plane flies a red line from where the visitor is
 * to where they're going, in about 1.5 s.
 */
import type { CountrySceneId, TravelMapData, Vec } from "./types";

export const FLIGHT_MS = 1500;
/** Hold on the landed plane before cutting to the scene. */
export const LANDED_MS = 250;

export type RouteOrigin = CountrySceneId | "hall";

export interface Route {
  /** Where the plane takes off: the Hall's own spot, or a country's marker. */
  from: RouteOrigin;
  a: Vec;
  c: Vec;
  b: Vec;
}

export function routeFor(
  map: TravelMapData,
  from: RouteOrigin,
  to: CountrySceneId,
): Route {
  const origin: RouteOrigin = from === to ? "hall" : from;
  const a = origin === "hall" ? map.hall : map.markers[origin];
  const b = map.markers[to];
  const custom = map.routes?.[`${origin}-${to}`];
  if (custom) return { from: origin, a, c: custom, b };
  // Default: an arc bowing up (north) by a quarter of the distance.
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  let nx = dy / len;
  let ny = -dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const bow = len * 0.25;
  return { from: origin, a, c: [mx + nx * bow, my + ny * bow], b };
}

export function pointOnRoute({ a, c, b }: Route, t: number): Vec {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
  ];
}

/** Direction of travel in radians (screen space: 0 = east, PI/2 = south). */
export function headingAt({ a, c, b }: Route, t: number): number {
  const dx = 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
  const dy = 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
  return Math.atan2(dy, dx);
}

/** 0-7 for E, SE, S, SW, W, NW, N, NE. */
export function headingIndex(angle: number): number {
  const eighth = Math.PI / 4;
  return ((Math.round(angle / eighth) % 8) + 8) % 8;
}

/** Ease in and out, like a plane taking off and landing. */
export function flightProgress(elapsedMs: number): number {
  const t = Math.max(0, Math.min(1, elapsedMs / FLIGHT_MS));
  return t * t * (3 - 2 * t);
}
