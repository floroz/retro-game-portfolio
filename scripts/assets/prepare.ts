/**
 * Raw candidate to HD asset (docs/art-spec.md, Phase H; see hd.ts).
 *
 *   npm run assets:prepare -- <input.png> --out <asset.png> [options]
 *
 * What:
 *   [--kind scene|sprite]       scene: 1280x640 (bg, fg, plate); sprite: an object,
 *                               prop, part, or shared sprite. Default scene, or sprite
 *                               when --size, --scale, or --align is given
 *   [--crop auto|x,y,w,h]       raw px. auto: the centred 2:1 frame (scene) or the
 *                               alpha bounds after keying, plus --pad (sprite)
 *   [--size WxH|Wx|xH]          scene default 1280x640. A sprite keeps its aspect:
 *                               "400x" or "x300" sets one side; "400x300" fits inside
 *                               and pads, bottom-centred
 *   [--scale 0.5]               sprite without --size: a factor on the cropped size
 *   [--pad 2]                   sprite: raw px kept around the auto crop
 * Key (soft, at raw resolution, before the resize):
 *   [--key none|auto|alpha|ff00ff]
 *                               auto: the existing alpha (transparent_background) if the
 *                               image has any, else the border colour. Default: auto for
 *                               sprites, none for scenes (pass it for fg.png)
 *   [--key-tolerance 0.08]      OKLab distance from the key that is background
 *   [--softness 0.25]           OKLab distance above which an edge pixel is opaque
 *   [--band 3]                  raw px from the background that get a soft edge,
 *                               unmixing (defringe), and despill
 *   [--choke 1]                 raw px the edge is eroded inwards (0 disables)
 *   [--min-hole 64]             enclosed background pockets of this many raw px are keyed
 *   [--despill on|off] [--spill ff00ff]
 *                               remove the key's hue from the edge band (on with a
 *                               colour key); --spill names it for an existing alpha
 *   [--alpha-floor 8]           alpha below this becomes 0
 * Colour (after the resize):
 *   [--levels black,white[,gamma]]   e.g. 6,250,1.05
 *   [--saturation 1.1]          OKLab chroma multiplier
 * Align (sprites): register the result onto its place in a composite
 *   [--align <composite.png>]   the chosen composite, already prepared at 1280x640
 *   [--near x,y]                a guess at the sprite's top-left, composite px
 *   [--radius 64]               search this far from --near (default: everywhere)
 *   [--scales 0.9:1.1:0.02]     also try these scales of the sprite ("a,b,c" or from:to:step)
 *   [--overlay <review.png>]    the composite with the aligned sprite drawn over it
 *
 * Prints a JSON summary: the output size, the crop, the key, and, with
 * --align, the sprite's position in display px and in logical px (display
 * px / 4), ready for the scene data. There is no palette remap.
 */
import { parseArgs } from "node:util";
import {
  HD_DENSITY,
  HD_SCENE_SIZE,
  KEY_FLAG_OPTIONS,
  alignSprite,
  alignmentOverlay,
  keyOptions,
  parseLevels,
  parseScales,
  parseTargetSize,
  prepare,
  type PrepareKind,
} from "./hd";
import {
  alphaBounds,
  cliPath,
  fail,
  parsePoint,
  parseRect,
  readImage,
  toHex,
  writePng,
  type Rect,
} from "./lib";

const num = (v: string | undefined) =>
  v === undefined ? undefined : Number(v);

const logical = (r: Rect): Rect => ({
  x: r.x / HD_DENSITY,
  y: r.y / HD_DENSITY,
  w: r.w / HD_DENSITY,
  h: r.h / HD_DENSITY,
});

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string" },
      kind: { type: "string" },
      crop: { type: "string", default: "auto" },
      size: { type: "string" },
      scale: { type: "string" },
      pad: { type: "string" },
      ...KEY_FLAG_OPTIONS,
      levels: { type: "string" },
      saturation: { type: "string" },
      align: { type: "string" },
      near: { type: "string" },
      radius: { type: "string" },
      scales: { type: "string" },
      overlay: { type: "string" },
    },
  });
  const [input] = positionals;
  if (!input || !values.out)
    fail("usage: assets:prepare -- <input> --out <asset.png> [options]");
  const kind: PrepareKind =
    values.kind === "scene" || values.kind === "sprite"
      ? values.kind
      : values.kind !== undefined
        ? fail(`--kind is scene or sprite, not "${values.kind}"`)
        : values.size || values.scale || values.align
          ? "sprite"
          : "scene";
  if (kind === "scene" && values.align)
    fail("--align registers sprites; use --kind sprite");

  const raw = await readImage(cliPath(input));
  const result = await prepare(raw, {
    kind,
    crop: values.crop === "auto" ? "auto" : parseRect(values.crop),
    size: values.size ? parseTargetSize(values.size) : undefined,
    scale: num(values.scale),
    pad: num(values.pad),
    key: keyOptions(values, kind === "sprite" ? "auto" : "none"),
    levels: values.levels ? parseLevels(values.levels) : undefined,
    saturation: num(values.saturation),
  });
  for (const w of result.warnings) console.warn(`warning: ${w}`);

  let image = result.image;
  const summary: Record<string, unknown> = {
    out: values.out,
    kind,
    from: `${raw.width}x${raw.height}`,
    crop: result.crop,
    ...(result.key
      ? {
          key: result.key.key ? toHex(result.key.key) : "alpha",
          transparent: result.key.transparent,
          partial: result.key.partial,
        }
      : {}),
  };

  if (values.align) {
    const composite = await readImage(cliPath(values.align));
    if (
      composite.width !== HD_SCENE_SIZE.w ||
      composite.height !== HD_SCENE_SIZE.h
    ) {
      console.warn(
        `warning: the composite is ${composite.width}x${composite.height}, not ${HD_SCENE_SIZE.w}x${HD_SCENE_SIZE.h}; prepare it first`,
      );
    }
    const aligned = await alignSprite(image, composite, {
      near: values.near ? parsePoint(values.near) : undefined,
      radius: num(values.radius),
      scales: values.scales ? parseScales(values.scales) : undefined,
    });
    image = aligned.sprite;
    const position = {
      x: aligned.x,
      y: aligned.y,
      w: image.width,
      h: image.height,
    };
    const b = alphaBounds(image, 128);
    const bounds = b && { ...b, x: b.x + aligned.x, y: b.y + aligned.y };
    Object.assign(summary, {
      align: values.align,
      scale: aligned.scale,
      score: Math.round(aligned.score * 10) / 10,
      ...position,
      bounds,
      logical: { ...logical(position), bounds: bounds && logical(bounds) },
    });
    if (values.overlay) {
      await writePng(
        cliPath(values.overlay),
        alignmentOverlay(composite, image, aligned.x, aligned.y),
      );
      summary.overlay = values.overlay;
    }
  }

  await writePng(cliPath(values.out), image);
  summary.size = `${image.width}x${image.height}`;
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
