/**
 * Previews for judging pixel art (docs/art-spec.md, Tooling). Everything goes
 * to the gitignored assets-src/review/ unless --out says otherwise.
 *
 *   npm run assets:preview -- <image.png>... [--scale 8] [--region x,y,w,h]
 *       8x nearest-neighbour upscale of each image (or a crop of it).
 *   npm run assets:preview -- --sheet <image.png>... [--cols N] [--scale 4] --out <sheet.png>
 *       numbered contact sheet.
 *   npm run assets:preview -- --onion <a.png> <b.png> [--scale 8]
 *       b drawn at half opacity over a, to compare animation frames.
 *   npm run assets:preview -- --html <spec.json>
 *       a self-contained HTML page that composites a scene's layers and slot
 *       sprites and plays its animation strips, or plays every character tag.
 *   npm run assets:preview -- --palette [--scene <id>]
 *       swatches for the master palette, labelled with their indices.
 *
 * HTML spec (paths relative to the spec file):
 *   { "title": "zurich", "scale": 4,
 *     "layers": [{ "src": "bg.png", "x": 0, "y": 0 }],
 *     "animations": [{ "src": "anim-stars.png", "x": 114, "y": 18, "frames": 4, "frameMs": 300 }],
 *     "slots": [{ "src": "slot-photo-frame.png", "positions": [[20, 24], [46, 24]] }],
 *     "character": { "sheet": "daniele.png", "json": "daniele.json" } }
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  REVIEW_DIR,
  allowedColours,
  cliPath,
  contactSheet,
  createImage,
  crop,
  drawText,
  fail,
  fillRect,
  getPixel,
  loadPalette,
  parseRect,
  parseSceneOption,
  readImage,
  setPixel,
  upscale,
  writePng,
  type Image,
} from "./lib";

const PREVIEW_DIR = join(REVIEW_DIR, "preview");

function onion(a: Image, b: Image): Image {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error("Onion skin needs two images of the same size");
  }
  const out = createImage(a.width, a.height, [24, 24, 32]);
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      const pa = getPixel(a, x, y);
      const pb = getPixel(b, x, y);
      let rgb: [number, number, number] = [24, 24, 32];
      if (pa[3] > 0) rgb = [pa[0], pa[1], pa[2]];
      if (pb[3] > 0) {
        rgb = [
          Math.round((rgb[0] + pb[0]) / 2),
          Math.round((rgb[1] + pb[1]) / 2),
          Math.round((rgb[2] + pb[2]) / 2),
        ];
      }
      setPixel(out, x, y, rgb);
    }
  }
  return out;
}

function paletteSwatches(scene: string | undefined): Image {
  const palette = loadPalette();
  const colours = scene
    ? allowedColours(palette, parseSceneOption(scene))
    : palette.colours;
  const groups = [...new Set(colours.map((c) => c.group))];
  const sw = 16;
  const rowH = sw + 10;
  const cols = Math.max(
    ...groups.map((g) => colours.filter((c) => c.group === g).length),
  );
  const labelW = 44;
  const img = createImage(
    labelW + cols * (sw + 2) + 2,
    groups.length * rowH + 4,
    [40, 40, 48],
  );
  groups.forEach((group, gi) => {
    const y = 4 + gi * rowH;
    drawText(img, group.toUpperCase(), 2, y + 5, [240, 240, 240]);
    colours
      .filter((c) => c.group === group)
      .forEach((c, i) => {
        const x = labelW + i * (sw + 2);
        fillRect(img, x, y, sw, sw, c.rgb);
        drawText(img, c.index, x + 6, y + sw + 2, [240, 240, 240]);
      });
  });
  return img;
}

interface HtmlSpec {
  title?: string;
  scale?: number;
  layers?: { src: string; x?: number; y?: number }[];
  animations?: {
    src: string;
    x: number;
    y: number;
    frames: number;
    frameMs: number;
  }[];
  slots?: { src: string; positions: [number, number][] }[];
  character?: { sheet: string; json: string };
}

function dataUri(path: string): string {
  return `data:image/png;base64,${readFileSync(path).toString("base64")}`;
}

function buildHtml(specPath: string): string {
  const spec = JSON.parse(readFileSync(specPath, "utf8")) as HtmlSpec;
  const base = dirname(specPath);
  const at = (p: string) => resolve(base, p);
  const scale = spec.scale ?? 4;
  const payload = {
    scale,
    layers: (spec.layers ?? []).map((l) => ({ ...l, src: dataUri(at(l.src)) })),
    animations: (spec.animations ?? []).map((a) => ({
      ...a,
      src: dataUri(at(a.src)),
    })),
    slots: (spec.slots ?? []).map((s) => ({ ...s, src: dataUri(at(s.src)) })),
    character: spec.character
      ? {
          sheet: dataUri(at(spec.character.sheet)),
          json: JSON.parse(
            readFileSync(at(spec.character.json), "utf8"),
          ) as unknown,
        }
      : null,
  };
  return `<!doctype html>
<meta charset="utf-8">
<title>${spec.title ?? "preview"}</title>
<style>
  body { background: #202028; color: #eee; font: 13px system-ui, sans-serif; margin: 16px; }
  canvas { image-rendering: pixelated; display: block; margin: 8px 0 16px; background: #000; }
</style>
<h1>${spec.title ?? "preview"}</h1>
<div id="root"></div>
<script>
const P = ${JSON.stringify(payload)};
const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
const root = document.getElementById("root");
function canvas(w, h, label) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.style.width = w * P.scale + "px"; c.style.height = h * P.scale + "px";
  const t = document.createElement("div"); t.textContent = label;
  root.append(t, c);
  const ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = false;
  return ctx;
}
(async () => {
  const layers = await Promise.all(P.layers.map(async (l) => ({ ...l, img: await load(l.src) })));
  const anims = await Promise.all(P.animations.map(async (a) => ({ ...a, img: await load(a.src) })));
  const slots = await Promise.all(P.slots.map(async (s) => ({ ...s, img: await load(s.src) })));
  if (layers.length) {
    const w = layers[0].img.width, h = layers[0].img.height;
    const ctx = canvas(w, h, "scene");
    const tick = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const l of layers) ctx.drawImage(l.img, l.x ?? 0, l.y ?? 0);
      for (const s of slots) for (const [x, y] of s.positions) ctx.drawImage(s.img, x, y);
      for (const a of anims) {
        const fw = a.img.width / a.frames, f = Math.floor(t / a.frameMs) % a.frames;
        ctx.drawImage(a.img, f * fw, 0, fw, a.img.height, a.x, a.y, fw, a.img.height);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  if (P.character) {
    const sheet = await load(P.character.sheet);
    const json = P.character.json;
    for (const [tag, info] of Object.entries(json.tags)) {
      const frames = json.frames.slice(info.from, info.to + 1);
      const fw = frames[0].w, fh = frames[0].h;
      const ctx = canvas(fw * 3, fh, tag + " (" + frames.length + " frames)");
      const ms = info.previewMs ?? 120;
      const tick = (t) => {
        const f = frames[Math.floor(t / ms) % frames.length];
        ctx.clearRect(0, 0, fw * 3, fh);
        ctx.drawImage(sheet, f.x, f.y, f.w, f.h, fw, 0, f.w, f.h);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }
})();
</script>
`;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      scale: { type: "string" },
      region: { type: "string" },
      sheet: { type: "boolean" },
      cols: { type: "string" },
      onion: { type: "boolean" },
      html: { type: "string" },
      palette: { type: "boolean" },
      scene: { type: "string" },
      out: { type: "string" },
    },
  });

  if (values.html) {
    const spec = cliPath(values.html);
    const out = values.out
      ? cliPath(values.out)
      : join(PREVIEW_DIR, `${basename(spec, ".json")}.html`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, buildHtml(spec));
    console.log(out);
    return;
  }

  if (values.palette) {
    const out = values.out
      ? cliPath(values.out)
      : join(
          REVIEW_DIR,
          "palette",
          `swatches${values.scene ? `-${values.scene}` : ""}@4x.png`,
        );
    await writePng(
      out,
      upscale(paletteSwatches(values.scene), Number(values.scale ?? 4)),
    );
    console.log(out);
    return;
  }

  if (positionals.length === 0)
    fail("usage: assets:preview -- <image.png>... [options]");
  const images = await Promise.all(
    positionals.map((p) => readImage(cliPath(p))),
  );

  if (values.onion) {
    if (images.length !== 2) fail("--onion takes exactly two images");
    const scale = Number(values.scale ?? 8);
    const out = values.out
      ? cliPath(values.out)
      : join(
          PREVIEW_DIR,
          `onion-${basename(positionals[0], ".png")}-${basename(positionals[1], ".png")}@${scale}x.png`,
        );
    await writePng(out, upscale(onion(images[0], images[1]), scale));
    console.log(out);
    return;
  }

  if (values.sheet) {
    const scale = Number(values.scale ?? 4);
    const out = values.out
      ? cliPath(values.out)
      : join(PREVIEW_DIR, `sheet@${scale}x.png`);
    const sheet = contactSheet(images, {
      cols: values.cols ? Number(values.cols) : undefined,
    });
    await writePng(out, upscale(sheet, scale));
    console.log(out);
    return;
  }

  const scale = Number(values.scale ?? 8);
  for (const [i, img] of images.entries()) {
    const region = values.region ? parseRect(values.region) : undefined;
    const name = basename(positionals[i], ".png");
    const suffix = region
      ? `-${region.x}_${region.y}_${region.w}_${region.h}`
      : "";
    const out =
      values.out && images.length === 1
        ? cliPath(values.out)
        : join(PREVIEW_DIR, `${name}${suffix}@${scale}x.png`);
    await writePng(out, upscale(region ? crop(img, region) : img, scale));
    console.log(out);
  }
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
