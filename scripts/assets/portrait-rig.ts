/**
 * Slice the portrait-faithful generated sheets into the existing puppet rig.
 * This keeps the generated silhouettes, face, hands, fabric and colours.
 * Coordinates below are measured against
 * assets-src/approved/portrait-rig; prompts are in prompts/character/portrait-rig.md.
 *
 * npm run assets:rigcut -- --preview assets-src/review/portrait-rig
 * npm run assets:rig -- --parts assets-src/character-rig --density 4
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import type { RigFacing, RigPartId, RigPoint } from "../../src/engine/rigTypes";
import { REPO_ROOT, cliPath, fail } from "./lib";
import type { RigSource, RigSourceFacing, RigSourcePart } from "./rigpack";

type Box = readonly [x: number, y: number, w: number, h: number];
type Size = readonly [w: number, h: number];
type Point = readonly [x: number, y: number];

interface SheetParts {
  heads: Box[];
  torso: Box;
  arms: [Box, Box, Box, Box];
  thigh: Box;
  shin: Box;
}

// Heads stop above the generated collars; the torso supplies the only collar.
// Upper sleeves stop above their generated cuff: the cuff belongs at the wrist.
const SHEETS: Record<RigFacing, SheetParts> = {
  front: {
    heads: [
      [41, 101, 201, 326],
      [266, 101, 201, 326],
      [489, 101, 201, 326],
      [714, 101, 201, 326],
      [939, 101, 201, 326],
    ],
    torso: [70, 258, 456, 542],
    arms: [
      [40, 548, 173, 300],
      [302, 545, 149, 407],
      [529, 548, 174, 300],
      [769, 548, 155, 403],
    ],
    thigh: [1018, 548, 194, 399],
    shin: [1316, 543, 169, 425],
  },
  side: {
    heads: [
      [24, 79, 228, 299],
      [262, 79, 228, 299],
      [504, 79, 228, 299],
      [749, 79, 228, 299],
      [993, 79, 228, 299],
    ],
    torso: [654, 254, 293, 546],
    arms: [
      [48, 524, 164, 290],
      [300, 529, 161, 421],
      [541, 524, 179, 299],
      [792, 532, 138, 415],
    ],
    thigh: [1028, 519, 172, 422],
    shin: [1304, 528, 210, 433],
  },
  back: {
    heads: [[96, 79, 228, 298]],
    torso: [1019, 257, 451, 546],
    arms: [
      [908, 113, 184, 290],
      [129, 536, 165, 445],
      [1283, 105, 185, 300],
      [543, 536, 165, 445],
    ],
    thigh: [888, 545, 204, 424],
    shin: [1239, 540, 150, 437],
  },
};

const point = ([x, y]: Point): RigPoint => ({ x: x * 2, y: y * 2 });
const RAW = join(REPO_ROOT, "assets-src/approved/portrait-rig");

/** Mechanical crop/scale only; the approved painting supplies every pixel. */
async function slice(file: string, box: Box, size: Size, flip = false) {
  const [left, top, width, height] = box;
  let image = sharp(join(RAW, file))
    .extract({ left, top, width, height })
    .resize(size[0] * 2, size[1] * 2, { fit: "fill", kernel: "lanczos3" });
  if (flip) image = image.flop();
  return image.png().toBuffer();
}

async function build(facing: RigFacing, out: string, preview?: string) {
  const spec = SHEETS[facing];
  const side = facing === "side";
  const parts = {} as RigSourceFacing["parts"];
  const pictures = new Map<RigPartId, { input: Buffer; offset: RigPoint }>();

  async function part(
    id: RigPartId,
    box: Box,
    size: Size,
    offset: Point,
    pivot: Point,
    z: number,
    parent?: RigPartId,
    flip = false,
    file = `${facing}.png`,
  ) {
    const input = await slice(file, box, size, flip);
    const entry: RigSourcePart = {
      file: `${facing}/${id}.png`,
      offset: point(offset),
      pivot: point(pivot),
      z,
      ...(parent ? { parent } : {}),
    };
    writeFileSync(join(out, entry.file), input);
    parts[id] = entry;
    pictures.set(id, { input, offset: point(offset) });
  }

  mkdirSync(join(out, facing), { recursive: true });
  // Common body model, 144 art px tall: broad shoulders, substantial sleeves,
  // dark straight jeans. The world scale and walking stride are measured by
  // parseRig, so changing the artwork needs no movement-speed constants.
  await part(
    "torso",
    spec.torso,
    [side ? 25 : 38, 51],
    [side ? -13 : -19, -116],
    [0, -69],
    5,
    undefined,
    false,
    "torsos.png",
  );
  const headSize: Size = [22, 31];
  const headOffset: Point = [-11, -144];
  const headPivot: Point = [0, -114];
  await part(
    "head",
    spec.heads[0],
    headSize,
    headOffset,
    headPivot,
    6,
    "torso",
  );
  const names = ["talk-1", "talk-2", "talk-3", "blink"];
  for (let i = 1; i < spec.heads.length; i++) {
    const file = `${facing}/head-${names[i - 1]}.png`;
    writeFileSync(
      join(out, file),
      await slice(`${facing}.png`, spec.heads[i], headSize),
    );
    parts.head.variants ??= {};
    parts.head.variants[names[i - 1]] = { file, offset: point(headOffset) };
  }

  for (const [index, suffix] of (["r", "l"] as const).entries()) {
    // Daniele's right is screen-left in front and screen-right from behind.
    const sign = (index === 0 ? -1 : 1) * (facing === "back" ? -1 : 1);
    const armX = side ? (index === 0 ? 0 : -3) : sign * 17;
    const elbowX = side ? armX : sign * 20;
    const legX = side ? (index === 0 ? 2 : -2) : sign * 8;
    const armZ = side ? (index === 0 ? 8 : 0) : 8;
    await part(
      `upper-arm-${suffix}`,
      spec.arms[index * 2],
      [14, 30],
      [armX - 7, -114],
      [armX, -109],
      armZ,
      "torso",
      facing === "back",
    );
    await part(
      `forearm-${suffix}`,
      spec.arms[index * 2 + 1],
      [12, 29],
      [elbowX - 6, -90],
      [elbowX, -86],
      armZ + 1,
      `upper-arm-${suffix}`,
      facing === "back",
    );
    const flip = !side && sign < 0;
    await part(
      `thigh-${suffix}`,
      spec.thigh,
      [16, 40],
      [legX - 8, -73],
      [legX, -69],
      index === 0 ? 4 : 2,
      "torso",
      flip,
    );
    await part(
      `shin-${suffix}`,
      spec.shin,
      [side ? 20 : facing === "back" ? 12 : 16, 38],
      [legX - (facing === "back" ? 6 : 8), -38],
      [legX, -35],
      index === 0 ? 3 : 1,
      `thigh-${suffix}`,
      flip,
    );
  }

  if (preview) {
    mkdirSync(preview, { recursive: true });
    const layers = Object.entries(parts)
      .sort(([, a], [, b]) => a.z - b.z)
      .map(([id]) => {
        const p = pictures.get(id as RigPartId)!;
        return { input: p.input, left: p.offset.x + 80, top: p.offset.y + 300 };
      });
    const png = await sharp({
      create: { width: 160, height: 312, channels: 4, background: "#89968b" },
    })
      .composite(layers)
      .png()
      .toBuffer();
    await sharp(png)
      .resize(400, 780, { kernel: "nearest" })
      .toFile(join(preview, `rest-${facing}.png`));
  }
  return { feet: { x: 0, y: 0 }, parts };
}

/**
 * Front/back are cut from one anatomically coherent turnaround, so their
 * shoulders, elbows and knees already match. Masks are cutting guides only;
 * overlapping strips keep the original painting continuous when joints bend.
 * Coordinates below use the full source image, before the per-facing crop.
 */
async function buildTurnaround(
  facing: "front" | "back",
  out: string,
  preview?: string,
): Promise<RigSourceFacing> {
  const back = facing === "back";
  const cropX = back ? 784 : 384;
  const dx = back ? 411 : 0;
  const width = 112;
  const height = 288;
  const source = await sharp(join(RAW, "turnaround.png"))
    .extract({ left: cropX, top: 15, width: 384, height: 990 })
    .png()
    .toBuffer();
  const project = ([x, y]: Point): RigPoint => ({
    x: ((x + dx - cropX) * width) / 384,
    y: ((y - 15) * height) / 990,
  });
  const parts = {} as RigSourceFacing["parts"];
  const layers: { input: Buffer; left: number; top: number; z: number }[] = [];
  mkdirSync(join(out, facing), { recursive: true });

  async function cut(
    id: RigPartId,
    polygon: Point[],
    pivot: Point,
    z: number,
    parent?: RigPartId,
  ) {
    const points = polygon
      .map(([x, y]) => `${x + dx - cropX},${y - 15}`)
      .join(" ");
    const mask = Buffer.from(
      `<svg width="384" height="990"><polygon points="${points}" fill="white"/></svg>`,
    );
    const cutout = await sharp(source)
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toBuffer();
    const input = await sharp(cutout)
      .resize(width, height, { kernel: "lanczos3" })
      .png()
      .toBuffer();
    const file = `${facing}/${id}.png`;
    writeFileSync(join(out, file), input);
    parts[id] = {
      file,
      pivot: project(pivot),
      z,
      ...(parent ? { parent } : {}),
    };
    layers.push({ input, left: 0, top: 0, z });
  }

  await cut(
    "torso",
    [
      [492, 190],
      [626, 190],
      [681, 225],
      [666, 305],
      [657, 400],
      [673, 530],
      [453, 530],
      [470, 400],
      [467, 305],
      [438, 225],
    ],
    [565, 551],
    5,
  );
  const sides = [
    {
      suffix: back ? "l" : "r",
      shoulder: [447, 258],
      elbow: [430, 412],
      hip: [512, 551],
      knee: [496, 741],
      upper: [
        [388, 212],
        [466, 212],
        [480, 305],
        [466, 428],
        [388, 428],
      ],
      fore: [
        [388, 397],
        [469, 397],
        [467, 520],
        [464, 535],
        [464, 626],
        [388, 626],
      ],
      thigh: [
        [467, 507],
        [573, 507],
        [555, 590],
        [540, 765],
        [442, 765],
        [457, 660],
        [465, 625],
      ],
      shin: [
        [430, 721],
        [543, 721],
        [543, 1007],
        [420, 1007],
      ],
    },
    {
      suffix: back ? "r" : "l",
      shoulder: [681, 258],
      elbow: [699, 412],
      hip: [617, 551],
      knee: [633, 741],
      upper: [
        [660, 212],
        [741, 212],
        [741, 428],
        [664, 428],
        [651, 305],
      ],
      fore: [
        [661, 397],
        [741, 397],
        [741, 626],
        [669, 626],
        [669, 535],
        [666, 520],
      ],
      thigh: [
        [557, 507],
        [662, 507],
        [665, 625],
        [676, 660],
        [690, 765],
        [587, 765],
        [573, 590],
      ],
      shin: [
        [583, 721],
        [710, 721],
        [719, 1007],
        [583, 1007],
      ],
    },
  ] as const;
  for (const s of sides) {
    await cut(`upper-arm-${s.suffix}`, [...s.upper], s.shoulder, 8, "torso");
    const forearm: Point[] =
      back && s.suffix === "l"
        ? [
            [388, 397],
            [460, 397],
            [457, 535],
            [457, 626],
            [388, 626],
          ]
        : [...s.fore];
    await cut(
      `forearm-${s.suffix}`,
      forearm,
      s.elbow,
      7,
      `upper-arm-${s.suffix}`,
    );
    await cut(`thigh-${s.suffix}`, [...s.thigh], s.hip, 4, "torso");
    await cut(`shin-${s.suffix}`, [...s.shin], s.knee, 3, `thigh-${s.suffix}`);
  }
  if (back) {
    await cut(
      "head",
      [
        [485, 15],
        [636, 15],
        [636, 192],
        [485, 192],
      ],
      [565, 195],
      6,
      "torso",
    );
  } else {
    const offset = { x: 33, y: 0 };
    const names = [
      "head",
      "head-talk-1",
      "head-talk-2",
      "head-talk-3",
      "head-blink",
    ];
    for (let i = 0; i < names.length; i++) {
      const input = await slice("front.png", SHEETS.front.heads[i], [18, 29]);
      const file = `${facing}/${names[i]}.png`;
      writeFileSync(join(out, file), input);
      if (i === 0) {
        parts.head = {
          file,
          offset,
          pivot: project([565, 212]),
          parent: "torso",
          z: 6,
          variants: {},
        };
        layers.push({ input, left: offset.x, top: offset.y, z: 6 });
      } else {
        parts.head.variants![names[i].slice(5)] = { file, offset };
      }
    }
  }
  if (preview) {
    mkdirSync(preview, { recursive: true });
    const input = await sharp({
      create: { width, height, channels: 4, background: "#89968b" },
    })
      .composite(layers.sort((a, b) => a.z - b.z))
      .png()
      .toBuffer();
    await sharp(input)
      .resize(width * 3, height * 3, { kernel: "nearest" })
      .toFile(join(preview, `rest-${facing}.png`));
  }
  return { feet: project([565, 1005]), parts };
}

async function main() {
  const { values } = parseArgs({
    options: { out: { type: "string" }, preview: { type: "string" } },
  });
  const out = values.out
    ? cliPath(values.out)
    : join(REPO_ROOT, "assets-src/character-rig");
  const preview = values.preview ? cliPath(values.preview) : undefined;
  const source: RigSource = {
    facings: {
      front: await buildTurnaround("front", out, preview),
      side: await build("side", out, preview),
      back: await buildTurnaround("back", out, preview),
    },
  };
  writeFileSync(join(out, "rig.json"), `${JSON.stringify(source, null, 2)}\n`);
  console.log(`Portrait-faithful rig parts: ${out}`);
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
