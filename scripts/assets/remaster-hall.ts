/** Re-export the Hall study from preserved originals. Never overwrites shipped art.
 * Run: npx tsx scripts/assets/remaster-hall.ts
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { readImage, rgbToOklab } from "./lib";
import { oklabToRgb } from "./hd";

const raw = "assets-src/approved";
const out = "src/assets/remaster/hall";
const clear = "#00000000";
const manifest: { output: string; source: string; note: string }[] = [];
await mkdir(out, { recursive: true });

async function save(name: string, input: Buffer, source: string, note: string) {
  await sharp(input).png().toFile(`${out}/${name}.png`);
  manifest.push({ output: `${out}/${name}.png`, source, note });
}

// Restore the original architecture at the same registered coordinates as
// airport-floor.ts. The stone floor remains the approved newer painting.
const architecture = await sharp(`${raw}/hall-plate@hd.webp`)
  .resize(1280, 640, { fit: "fill" })
  .png()
  .toBuffer();
const overlays = await Promise.all(
  [
    { left: 0, top: 0, width: 1280, height: 108 },
    { left: 320, top: 0, width: 960, height: 348 },
  ].map(async (rect) => ({
    input: await sharp(architecture).extract(rect).png().toBuffer(),
    left: rect.left,
    top: rect.top,
  })),
);
// Existing sign interiors were painted dark for live text in V2. Reapply
// those simple masks at native display resolution, without enlarged pixels.
const signs = `<svg width="1280" height="640"><g fill="#070e16"><path d="M91 23H239V102H91Z"/><path d="M690 60H823V136H690Z"/><path d="M850 58H1027V132H850Z"/><path d="M1053 57H1230V134H1053Z"/></g></svg>`;
await save(
  "bg",
  await sharp(`${raw}/hall-stone-floor.png`)
    .resize(1280, 640)
    .composite([...overlays, { input: Buffer.from(signs), left: 0, top: 0 }])
    .png()
    .toBuffer(),
  `${raw}/hall-stone-floor.png + ${raw}/hall-plate@hd.webp`,
  "Density 4, full colour; same floor/architecture masks as airport-floor.ts; sign interiors retained for live text.",
);

async function sprite(
  name: string,
  file: string,
  w: number,
  h: number,
  pad = 0,
  bottom = false,
) {
  await save(
    name,
    await sharp(file)
      .trim({ background: clear, threshold: 100 })
      .resize(w - pad * 2, h - pad * 2, {
        fit: "contain",
        position: bottom ? "bottom" : "centre",
        background: clear,
      })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: clear,
      })
      .png()
      .toBuffer(),
    file,
    "Original logical footprint, full colour and soft alpha; Lanczos from approved source.",
  );
}

await sprite("obj-duty-free", `${raw}/hall-duty-free-empty.png`, 320, 284);
await sprite("obj-boarding-desk", `${raw}/hall-boarding-desk.png`, 112, 160, 4);
await sprite("anim-plane", `${raw}/hall-plane@hd.webp`, 104, 32);

// Keep the approved red upholstery, including its deliberate separation
// from the character's blue jeans. Neutral metal is left alone.
const seats = await readImage(`${raw}/hall-seats@hd.webp`);
for (let i = 0; i < seats.data.length; i += 4) {
  const [r, g, b] = seats.data.subarray(i, i + 3);
  if (b <= r * 1.15 || b <= g * 1.05) continue;
  const [L, a, bb] = rgbToOklab([r, g, b]);
  const c = Math.hypot(a, bb) * 1.12;
  const angle = (20 * Math.PI) / 180;
  seats.data.set(
    oklabToRgb([L * 0.91, c * Math.cos(angle), c * Math.sin(angle)]),
    i,
  );
}
await save(
  "obj-seats",
  await sharp(seats.data, {
    raw: { width: seats.width, height: seats.height, channels: 4 },
  })
    .trim({ background: clear, threshold: 100 })
    .resize(364, 108, { fit: "fill" })
    .png()
    .toBuffer(),
  `${raw}/hall-seats@hd.webp`,
  "Original approved blue source with the documented red upholstery correction reapplied; same 91x27 logical footprint.",
);

for (const [name, w, h] of [
  ["knife", 56, 64],
  ["cheese", 64, 48],
  ["telephone", 32, 64],
  ["limoncello", 28, 56],
] as const) {
  await sprite(
    `obj-souvenir-${name}`,
    `${raw}/hall-souvenir-${name}-sprite.png`,
    w,
    h,
    0,
    true,
  );
}
manifest[manifest.length - 1].note =
  "Only a 14x28 source survives. Resampled for this proof; no recovered detail. Candidate for targeted refinement.";

for (const spec of [
  { name: "businessman", frames: 4, w: 144, h: 216 },
  { name: "family", frames: 4, w: 248, h: 224 },
  { name: "reader", frames: 1, w: 60, h: 152 },
  { name: "window-man", frames: 1, w: 76, h: 120 },
  { name: "window-woman", frames: 1, w: 72, h: 120 },
]) {
  const source = `${raw}/passengers/${spec.name}.webp`;
  const meta = await sharp(source).metadata();
  const width = meta.width! / spec.frames;
  const frames = await Promise.all(
    Array.from({ length: spec.frames }, async (_, i) => {
      const cell = await sharp(source)
        .extract({ left: i * width, top: 0, width, height: meta.height! })
        .png()
        .toBuffer();
      const crop = await sharp(cell)
        .trim({ background: clear, threshold: 100 })
        .resize({ width: spec.w - 8, height: spec.h - 8, fit: "inside" })
        .png()
        .toBuffer({ resolveWithObject: true });
      return {
        input: crop.data,
        left: i * spec.w + Math.floor((spec.w - crop.info.width) / 2),
        top: spec.h - crop.info.height - 4,
      };
    }),
  );
  await save(
    `anim-passenger-${spec.name}`,
    await sharp({
      create: {
        width: spec.w * spec.frames,
        height: spec.h,
        channels: 4,
        background: clear,
      },
    })
      .composite(frames)
      .png()
      .toBuffer(),
    source,
    "Same frame count, timing, padded cells and foot alignment as passengers.ts, at twice the export resolution. Soft alpha and full colour.",
  );
}

await mkdir("assets-src/remaster", { recursive: true });
await writeFile(
  "assets-src/remaster/hall-manifest.json",
  JSON.stringify(
    {
      base: "v2@3cc5738",
      density: 4,
      generatedArtwork: false,
      recipe: "scripts/assets/remaster-hall.ts",
      assets: manifest,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Prepared ${manifest.length} Hall proof assets; shipped assets untouched.`,
);
