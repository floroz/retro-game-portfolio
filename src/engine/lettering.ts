import {
  capHeight,
  drawText,
  measureText,
  type TextLayer,
  type TextStyle,
} from "./font";

/** Smooth adventure lettering. Keep the existing line breaks, cap height,
 * colours and measured width, so the study changes no label or control layout.
 */
export function paintLettering(
  layer: TextLayer,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
) {
  // Keep the original icon glyph and its exact advance while the surrounding
  // words use native lettering. Measuring prefixes also preserves the tracking
  // before a token, which is different from the gap after one.
  const tokens = [
    ...text.matchAll(/\{(?:experience|skills|about|contact|resume)\}/gi),
  ];
  if (tokens.length) {
    const font = style.font ?? "regular";
    let end = 0;
    for (const token of tokens) {
      if (token.index > end) {
        paintLettering(
          layer,
          text.slice(end, token.index),
          x + measureText(text.slice(0, end), font, style.tracking),
          y,
          style,
        );
      }
      end = token.index + token[0].length;
      const iconX =
        x +
        measureText(text.slice(0, end), font, style.tracking) -
        measureText(token[0], font, style.tracking);
      drawText({ ...layer, paintLine: undefined }, token[0], iconX, y, style);
    }
    if (end < text.length) {
      paintLettering(
        layer,
        text.slice(end),
        x + measureText(text.slice(0, end), font, style.tracking),
        y,
        style,
      );
    }
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
