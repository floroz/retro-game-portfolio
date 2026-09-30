import {
  capHeight,
  drawText,
  measureText,
  type TextLayer,
  type TextStyle,
} from "../../engine/font";

/** Native canvas lettering trial. Keep the existing line breaks, cap height,
 * colours and measured width, so the study changes no label or control layout.
 */
export function paintLettering(
  layer: TextLayer,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
) {
  if (text.includes("{")) {
    drawText({ ...layer, paintLine: undefined }, text, x, y, style);
    return;
  }
  const { ctx, scale } = layer;
  const font = style.font ?? "regular";
  if (font === "small" || font === "tiny") text = text.toUpperCase();
  const cap = capHeight(font);
  const width = measureText(text, font, style.tracking);
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.font = `${font === "tiny" ? 600 : 500} 10px Arial, sans-serif`;
  const reference = ctx.measureText("H");
  const height = reference.actualBoundingBoxAscent || 7;
  ctx.font = `${font === "tiny" ? 600 : 500} ${(10 * cap) / height}px Arial, sans-serif`;
  const measured = ctx.measureText(text).width;
  ctx.translate(x, y + cap);
  ctx.scale(measured ? width / measured : 1, 1);
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  if (style.shadow) {
    ctx.fillStyle = style.shadow;
    ctx.fillText(text, 0.35, 0.45);
  }
  if (style.outline) {
    ctx.strokeStyle = style.outline;
    ctx.lineWidth = 0.65;
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillStyle = style.color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
