import type { GroundShadow } from "./types";

/** Move a footprint with its sprite, including mirrored pedestrian strips. */
export function placeShadow(
  shadow: GroundShadow,
  x: number,
  y: number,
  scale = 1,
  mirroredWidth?: number,
): GroundShadow {
  return {
    x:
      x +
      (mirroredWidth === undefined ? shadow.x : mirroredWidth - shadow.x) *
        scale,
    y: y + shadow.y * scale,
    width: shadow.width * scale,
    depth: shadow.depth * scale,
  };
}

/** Stepped contact shadows on the scene's pixel grid; no canvas blur. */
export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  shadow: GroundShadow,
  grid: number,
) {
  const { x, y, width, depth } = shadow;
  ctx.save();
  ctx.fillStyle = "#242936";
  // A faint cast to the lower right, then the darker contact at the feet.
  for (const [size, opacity, dx, dy] of [
    [1.4, 0.12, width * 0.16, depth * 0.25],
    [1, 0.16, 0, 0],
    [0.6, 0.18, 0, 0],
  ]) {
    ctx.globalAlpha = opacity;
    const rx = (width * size) / 2;
    const ry = (depth * size) / 2;
    const top = Math.floor((y + dy - ry) * grid);
    const bottom = Math.ceil((y + dy + ry) * grid);
    for (let row = top; row < bottom; row++) {
      const t = ((row + 0.5) / grid - y - dy) / ry;
      if (Math.abs(t) >= 1) continue;
      const half = rx * Math.sqrt(1 - t * t);
      const left = Math.round((x + dx - half) * grid);
      const right = Math.round((x + dx + half) * grid);
      ctx.fillRect(left / grid, row / grid, (right - left) / grid, 1 / grid);
    }
  }
  ctx.restore();
}
