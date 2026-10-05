import "../styles/adventure-font.scss";
import {
  capHeight,
  drawText,
  measureText,
  type FontId,
  type TextLayer,
  type TextStyle,
} from "./font";

let loading: Promise<void> | undefined;

/** A local face shared by HTML and canvas. Failure never gates the content. */
export function loadAdventureFont(): Promise<void> {
  return (loading ??= document.fonts.load('16px "Pixel Operator"').then(
    () => undefined,
    () => undefined,
  ));
}

/** Match the preview's visible capital heights without stretching letters. */
export function letteringFont(ctx: CanvasRenderingContext2D, cap: number) {
  ctx.font = '400 10px "Pixel Operator", sans-serif';
  const height = ctx.measureText("H").actualBoundingBoxAscent || 7;
  ctx.font = `400 ${(10 * cap) / height}px "Pixel Operator", sans-serif`;
}

const tokens = (text: string) => [
  ...text.matchAll(/\{(?:experience|skills|about|contact|resume)\}/gi),
];
const caseFor = (text: string, font: FontId) =>
  font === "small" || font === "tiny" ? text.toUpperCase() : text;

let metrics: CanvasRenderingContext2D | null | undefined;

/** Same native advances as painting, including the original inline icons. */
export function measureLettering(
  text: string,
  font: FontId = "regular",
): number {
  metrics ??= document.createElement("canvas").getContext("2d");
  if (!metrics) return measureText(text, font);
  letteringFont(metrics, capHeight(font));
  let width = 0;
  let end = 0;
  for (const token of tokens(text)) {
    width += metrics.measureText(
      caseFor(text.slice(end, token.index), font),
    ).width;
    width += measureText(token[0], font);
    end = token.index + token[0].length;
  }
  return width + metrics.measureText(caseFor(text.slice(end), font)).width;
}

/** Pixel Operator at its natural proportions; bitmap section icons stay intact. */
export function paintLettering(
  layer: TextLayer,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
) {
  const font = style.font ?? "regular";
  const icons = tokens(text);
  if (icons.length) {
    let end = 0;
    let pen = x;
    for (const token of icons) {
      const words = text.slice(end, token.index);
      if (words) paintLettering(layer, words, pen, y, style);
      pen += measureLettering(words, font);
      drawText({ ...layer, paintLine: undefined }, token[0], pen, y, style);
      pen += measureText(token[0], font);
      end = token.index + token[0].length;
    }
    if (end < text.length)
      paintLettering(layer, text.slice(end), pen, y, style);
    return;
  }
  const { ctx, scale } = layer;
  const cap = capHeight(font);
  text = caseFor(text, font);
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  letteringFont(ctx, cap);
  ctx.translate(x, y + cap);
  ctx.textAlign = "left";
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

paintLettering.measureText = measureLettering;
