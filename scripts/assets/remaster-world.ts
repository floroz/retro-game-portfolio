/** Restore the approved world art at density 4 without changing registration.
 * Run: node --import tsx scripts/assets/remaster-world.ts
 */
import sharp from "sharp";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { alphaBounds, readImage } from "./lib";

const root = "src/assets/remaster";
const raw = "assets-src/approved";
const clear = "#00000000";
const manifest: {
  output: string;
  original: string;
  source: string;
  note: string;
}[] = [];

async function png(input: string | Buffer, width: number, height: number) {
  return sharp(input).resize(width, height, { fit: "fill" }).png().toBuffer();
}

/** Retain the approved scene's broad colour treatment/contact shadows while
 * recovering fine detail from its original. The correction is deliberately
 * blurred at density 2: palette steps and hard alpha are not transferred.
 */
async function preserveGrade(input: Buffer, original: string | Buffer) {
  const meta = await sharp(original).metadata();
  const size = await sharp(input).metadata();
  const low = await png(input, meta.width!, meta.height!);
  const blur = async (source: string | Buffer) => {
    const softened = await sharp(source).blur(1.2).png().toBuffer();
    return sharp(softened)
      .resize(size.width!, size.height!, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer();
  };
  const [old, baseline, data] = await Promise.all([
    blur(original),
    blur(low),
    sharp(input).ensureAlpha().raw().toBuffer(),
  ]);
  for (let i = 0; i < data.length; i += 4) {
    // Do not transplant an enlarged matte or its black transparent RGB.
    if (old[i + 3] < 220 || baseline[i + 3] < 220 || data[i + 3] === 0)
      continue;
    for (let c = 0; c < 3; c++)
      data[i + c] = Math.max(
        0,
        Math.min(255, data[i + c] + old[i + c] - baseline[i + c]),
      );
  }
  return sharp(data, {
    raw: { width: size.width!, height: size.height!, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function save(
  relative: string,
  input: Buffer,
  original: string,
  source: string,
  note: string,
) {
  const output = `${root}/${relative}`;
  const [old, next] = await Promise.all([
    sharp(original).metadata(),
    sharp(input).metadata(),
  ]);
  if (next.width !== old.width! * 2 || next.height !== old.height! * 2)
    throw new Error(`Registration mismatch: ${relative}`);
  await mkdir(dirname(output), { recursive: true });
  await sharp(input).png().toFile(output);
  manifest.push({ output, original, source, note });
}

/** Use the shipped alpha rectangle as the registration contract. This retains
 * deliberate transparent padding, cabinet drawer offsets and even-size pads.
 */
async function registered(source: string | Buffer, original: string | Buffer) {
  const old =
    typeof original === "string"
      ? await readImage(original)
      : await bufferImage(original);
  const box = alphaBounds(old, 128);
  if (!box) throw new Error("Empty approved sprite");
  const trimmed = await sharp(source)
    .trim({ background: clear, threshold: 100 })
    .png()
    .toBuffer();
  const content = await png(trimmed, box.w * 2, box.h * 2);
  return sharp({
    create: {
      width: old.width * 2,
      height: old.height * 2,
      channels: 4,
      background: clear,
    },
  })
    .composite([{ input: content, left: box.x * 2, top: box.y * 2 }])
    .png()
    .toBuffer();
}
async function bufferImage(input: Buffer) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(data),
    width: info.width,
    height: info.height,
  };
}

// London is still the original approved empty pub, now with its raw paint detail.
for (const scene of ["london", "sorrento"] as const) {
  for (const name of (await readdir(`src/assets/scenes/${scene}`))
    .filter((file) => file.endsWith(".png"))
    .sort()) {
    if (name === "bg.png" || name.startsWith("anim-patron-")) continue;
    const original = `src/assets/scenes/${scene}/${name}`;
    const provenance: { approvedRaw: string } = JSON.parse(
      await readFile(
        `assets-src/provenance/${scene}-${name.replace(/\.png$/, "")}.json`,
        "utf8",
      ),
    );
    let source: string | Buffer = provenance.approvedRaw;
    if (name === "obj-chair-right.png")
      source = await sharp(source).flop().png().toBuffer();
    const input = await registered(source, original);
    await save(
      `${scene}/${name}`,
      await preserveGrade(input, original),
      original,
      provenance.approvedRaw,
      "Density 4 from approved original, soft alpha. Shipped alpha bounds retain canvas size, offsets and state registration; smooth colour correction retains the approved contrast/colour treatment. Right Sorrento chair mirrors the left source as before.",
    );
  }
}

const london = "src/assets/scenes/london/bg.png";
await save(
  "london/bg.png",
  await png(`${raw}/london-plate@hd.webp`, 1280, 640),
  london,
  `${raw}/london-plate@hd.webp`,
  "Original approved plate, full colour at density 4; unchanged composition.",
);

// Preserve the two later story-object patches, never the stale empty fridge.
const sorrento = "src/assets/scenes/sorrento/bg.png";
const story = await png(`${raw}/sorrento-story-objects.png`, 1280, 640);
const storyLayers = await Promise.all(
  [
    { left: 206, top: 204, width: 112, height: 52 },
    { left: 864, top: 164, width: 136, height: 46 },
  ].map(async (rect) => ({
    input: await sharp(story).extract(rect).png().toBuffer(),
    left: rect.left,
    top: rect.top,
  })),
);
const kitchen = await sharp(
  await png(`${raw}/sorrento-plate@hd.webp`, 1280, 640),
)
  .composite(storyLayers)
  .png()
  .toBuffer();
await save(
  "sorrento/bg.png",
  await preserveGrade(kitchen, sorrento),
  sorrento,
  `${raw}/sorrento-plate@hd.webp + ${raw}/sorrento-story-objects.png + ${sorrento}`,
  "Latest postcard and address-book crops at identical coordinates. Original painted detail restored. Legacy hand-painted furniture shadows/floor contrast survive as a smooth low-frequency correction; those authored corrections have no separate HD source.",
);

// The four patrons keep their existing cells, foot anchors and stationary
// lower bodies. No additional poses or changed animation timing.
for (const spec of [
  { name: "table-woman", width: 104, height: 192, split: 124 },
  { name: "table-man", width: 104, height: 192, split: 124 },
  { name: "bar-man", width: 96, height: 224, split: 108 },
  { name: "bar-woman", width: 96, height: 224, split: 112 },
]) {
  const source = `${raw}/pub-patrons/${spec.name}.webp`;
  const original = `src/assets/scenes/london/anim-patron-${spec.name}.png`;
  const meta = await sharp(source).metadata();
  const frames = [];
  for (let i = 0; i < 4; i++) {
    const cell = await sharp(source)
      .extract({
        left: Math.round((i * meta.width!) / 4),
        top: 0,
        width:
          Math.round(((i + 1) * meta.width!) / 4) -
          Math.round((i * meta.width!) / 4),
        height: meta.height!,
      })
      .png()
      .toBuffer();
    const crop = await sharp(cell)
      .trim({ background: clear, threshold: 100 })
      .resize({ width: spec.width - 8, height: spec.height - 8, fit: "inside" })
      .png()
      .toBuffer({ resolveWithObject: true });
    frames.push({
      input: crop.data,
      left: i * spec.width + Math.floor((spec.width - crop.info.width) / 2),
      top: spec.height - crop.info.height - 4,
    });
  }
  const strip = await sharp({
    create: {
      width: spec.width * 4,
      height: spec.height,
      channels: 4,
      background: clear,
    },
  })
    .composite(frames)
    .png()
    .toBuffer();
  const lower = await sharp(strip)
    .extract({
      left: 0,
      top: spec.split,
      width: spec.width,
      height: spec.height - spec.split,
    })
    .png()
    .toBuffer();
  // Replace, rather than alpha-over, to erase moving feet from later frames.
  const { data, info } = await sharp(strip)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const lowerData = await sharp(lower).ensureAlpha().raw().toBuffer();
  for (let frame = 1; frame < 4; frame++)
    for (let y = spec.split; y < spec.height; y++) {
      lowerData.copy(
        data,
        (y * info.width + frame * spec.width) * 4,
        (y - spec.split) * spec.width * 4,
        (y - spec.split + 1) * spec.width * 4,
      );
    }
  await save(
    `london/anim-patron-${spec.name}.png`,
    await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer(),
    original,
    source,
    "Four foot-aligned cells at twice the shipped resolution; lower body copied from frame zero at the same split line as pub-patrons.ts. Full colour and soft alpha.",
  );
}

await save(
  "travel-map/bg.png",
  await png(`${raw}/travel-map-bg@hd.webp`, 1280, 640),
  "src/assets/scenes/travel-map/bg.png",
  `${raw}/travel-map-bg@hd.webp`,
  "Approved map restored at density 4; marker/route coordinates unchanged.",
);
for (const name of [
  "map-marker",
  "slot-tap",
  "slot-tap-more",
  "slot-photo-frame",
  "slot-photo-frame-more",
  "slot-magnet",
  "slot-magnet-more",
]) {
  const relative = name.startsWith("slot-")
    ? `shared/slots/${name}.png`
    : `shared/${name}.png`;
  const original = `src/assets/${relative}`;
  const source = `${raw}/${name}@hd.webp`;
  await save(
    relative,
    await preserveGrade(await registered(source, original), original),
    original,
    source,
    "Approved shared original at density 4; existing logical size and transparent padding preserved. Smooth correction retains the approved saturation/levels; no palette reduction.",
  );
}

// The approved source faces east. Rotate it at raw resolution, preserving
// each shipped heading's bounds and the original top-left wing lighting.
const planeOriginal = "src/assets/shared/map-plane.png";
const planeSource = `${raw}/map-plane@hd.webp`;
const planeFrames = [];
for (let i = 0; i < 8; i++) {
  let source = sharp(planeSource);
  if ([2, 3, 4, 5].includes(i)) source = source.flip();
  const rotated = await source
    .rotate(i * 45, { background: clear })
    .png()
    .toBuffer();
  const original = await sharp(planeOriginal)
    .extract({ left: i * 34, top: 0, width: 34, height: 34 })
    .png()
    .toBuffer();
  planeFrames.push({
    input: await preserveGrade(await registered(rotated, original), original),
    left: i * 68,
    top: 0,
  });
}
await save(
  "shared/map-plane.png",
  await sharp({
    create: { width: 544, height: 68, channels: 4, background: clear },
  })
    .composite(planeFrames)
    .png()
    .toBuffer(),
  planeOriginal,
  planeSource,
  "Eight 68x68 heading cells from the raw source; same E, SE, S, SW, W, NW, N, NE order, centred registration and top-left lighting convention.",
);

await mkdir("assets-src/remaster", { recursive: true });
await writeFile(
  "assets-src/remaster/world-manifest.json",
  JSON.stringify(
    {
      density: 4,
      generatedArtwork: false,
      recipe: "scripts/assets/remaster-world.ts",
      assets: manifest,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Prepared ${manifest.length} world assets; every output verified at exactly twice the shipped width and height.`,
);

// Zürich owns its joint palette, registrations and inspection exports.
await import("./swiss-room");
