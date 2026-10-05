/** Reproduce the approved airport sprites and the retired luggage-desk patch. */
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { writePng, type Rgb } from "./lib";
import { hardAlpha, remapToPalette } from "./painted";

const raw = "assets-src/approved/lost-and-found";
const legacy = "src/assets/scenes/hall";
const remaster = "src/assets/remaster/hall";

async function hard(input: string | Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const image = hardAlpha(
    {
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height,
    },
    { minNeighbours: 0 },
  ).image;
  return sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

export async function prepareLostAndFound() {
  const palette = JSON.parse(
    await readFile(`${raw}/palettes.json`, "utf8"),
  ) as { legacy: Rgb[]; remaster: Rgb[] };
  await Promise.all([
    mkdir(legacy, { recursive: true }),
    mkdir(remaster, { recursive: true }),
  ]);

  async function save(name: string, source: Buffer) {
    for (const [dir, divisor, colors] of [
      [remaster, 1, palette.remaster],
      [legacy, 2, palette.legacy],
    ] as const) {
      const metadata = await sharp(source).metadata();
      const { data, info } = await sharp(source)
        .resize(metadata.width! / divisor, metadata.height! / divisor)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const image = hardAlpha(
        {
          data: new Uint8ClampedArray(data),
          width: info.width,
          height: info.height,
        },
        { minNeighbours: 0 },
      ).image;
      await writePng(`${dir}/${name}.png`, remapToPalette(image, colors));
    }
  }

  const booth = await sharp(await hard(`${raw}/booth.png`))
    .trim({ background: "#00000000", threshold: 1 })
    .resize(320, 284, { fit: "fill" })
    .png()
    .toBuffer();
  // The clerk's form is part of the counter; signage remains live text.
  const paper = Buffer.from(
    '<svg width="320" height="284"><path d="M127 149 L165 149 L169 157 L125 157Z" fill="#e7d6ae"/><path d="M130 152H159M129 155H146" stroke="#847255" stroke-width="1"/></svg>',
  );
  await save(
    "obj-lost-and-found",
    await sharp(booth)
      .composite([{ input: paper, left: 0, top: 0 }])
      .png()
      .toBuffer(),
  );

  // One common crop and scale for all poses keeps the head and torso registered.
  const clerk = await hard(`${raw}/clerk.png`);
  const poses: Buffer[] = [];
  for (let frame = 0; frame < 4; frame++) {
    const cell = await sharp(clerk)
      .extract({ left: frame * 543 + 6, top: 117, width: 536, height: 527 })
      .png()
      .toBuffer();
    const resized = await sharp(cell).resize(78, 77).png().toBuffer();
    poses.push(
      await sharp({
        create: { width: 80, height: 84, channels: 4, background: "#00000000" },
      })
        .composite([{ input: resized, left: 1, top: 6 }])
        .png()
        .toBuffer(),
    );
  }
  // Rest, inspect, lift, stamp, return. Timing is declared in hall.ts.
  await save(
    "anim-lost-and-found-clerk",
    await sharp(
      [0, 2, 1, 2, 3].map((frame) => poses[frame]),
      { join: { across: 5 } },
    )
      .png()
      .toBuffer(),
  );

  const traveller = await hard(`${raw}/traveller.png`);
  const boundaries = [0, 575, 980, 1576, 2048];
  const cells = [];
  for (let frame = 0; frame < 4; frame++) {
    const cell = await sharp(traveller)
      .extract({
        left: boundaries[frame],
        top: 0,
        width: boundaries[frame + 1] - boundaries[frame],
        height: 768,
      })
      .png()
      .toBuffer();
    cells.push(
      await sharp(cell)
        .trim({ background: "#00000000", threshold: 1 })
        .png()
        .toBuffer({ resolveWithObject: true }),
    );
  }
  const scale = 208 / Math.max(...cells.map((cell) => cell.info.height));
  const frames = await Promise.all(
    cells.map(async (cell, frame) => {
      const width = Math.round(cell.info.width * scale);
      const height = Math.round(cell.info.height * scale);
      return {
        input: await sharp(cell.data).resize(width, height).png().toBuffer(),
        left: frame * 192 + Math.floor((192 - width) / 2),
        top: 212 - height,
      };
    }),
  );
  await save(
    "anim-passenger-traveller",
    await sharp({
      create: { width: 768, height: 216, channels: 4, background: "#00000000" },
    })
      .composite(frames)
      .png()
      .toBuffer(),
  );

  // Apply only the desk-sized patch; all other background pixels stay exact.
  const patch = await sharp(`${raw}/hall-without-desk.png`)
    .resize(1280, 640, { fit: "fill" })
    .png()
    .toBuffer();
  const region = { left: 516, top: 268, width: 96, height: 84 };
  const cutout = await sharp(patch).extract(region).png().toBuffer();
  const original = await readFile(`${remaster}/bg.png`);
  await sharp(original)
    .composite([{ input: cutout, left: region.left, top: region.top }])
    .png()
    .toFile(`${remaster}/bg.png`);
  const smallPatch = await sharp(cutout).resize(48, 42).png().toBuffer();
  const old = await readFile(`${legacy}/bg.png`);
  const result = await sharp(old)
    .composite([{ input: smallPatch, left: 258, top: 134 }])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  await writePng(
    `${legacy}/bg.png`,
    remapToPalette(
      {
        data: new Uint8ClampedArray(result.data),
        width: result.info.width,
        height: result.info.height,
      },
      palette.legacy,
    ),
  );

  for (const [name, input] of [
    ["obj-lost-and-found", "booth"],
    ["anim-lost-and-found-clerk", "clerk"],
    ["anim-passenger-traveller", "traveller"],
  ]) {
    const id = `hall-${name}`;
    await writeFile(
      `assets-src/provenance/${id}.json`,
      JSON.stringify(
        {
          id,
          output: `${legacy}/${name}.png`,
          task: "airport-lost-and-found",
          source: "codex",
          prompt: "assets-src/prompts/hd/lost-and-found.json",
          candidate: "01",
          references: [
            "src/assets/remaster/hall/obj-boarding-desk.png",
            "src/assets/remaster/hall/anim-passenger-reader.png",
          ],
          approvedRaw: `${raw}/${input}.png`,
          density: 2,
          style: "painted",
          cleanup:
            "scripts/assets/lost-and-found.ts prepares registered density-2 and density-4 exports with hard alpha and palettes sampled from the corresponding existing airport art.",
          approvedBy: "user",
          date: "2026-10-05",
        },
        null,
        2,
      ) + "\n",
    );
  }
  // Record both the remaster recipe and the additive patch, without reviving
  // the old shop if the Hall export is regenerated later.
  const file = "assets-src/remaster/hall-manifest.json";
  const manifest = JSON.parse(await readFile(file, "utf8")) as {
    assets: { output: string; source: string; note: string }[];
  };
  manifest.assets = manifest.assets.filter(
    (asset) =>
      !/obj-duty-free|obj-souvenir|obj-lost-and-found|anim-lost-and-found-clerk|anim-passenger-traveller/.test(
        asset.output,
      ),
  );
  for (const [name, input] of [
    ["obj-lost-and-found", "booth"],
    ["anim-lost-and-found-clerk", "clerk"],
    ["anim-passenger-traveller", "traveller"],
  ]) {
    manifest.assets.push({
      output: `${remaster}/${name}.png`,
      source: `${raw}/${input}.png`,
      note: "Approved sprite study; scripts/assets/lost-and-found.ts. Registered density 4, existing remaster colors, hard alpha.",
    });
  }
  const background = manifest.assets.find(
    (asset) => asset.output === `${remaster}/bg.png`,
  );
  if (background)
    background.note =
      "Original remaster geometry with the old luggage desk removed by scripts/assets/lost-and-found.ts using a 96x84 patch from assets-src/approved/lost-and-found/hall-without-desk.png.";
  await writeFile(file, JSON.stringify(manifest, null, 2) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await prepareLostAndFound();
