/**
 * Flat-colour placeholders that pass the validator, so the engine lane isn't
 * blocked on art (docs/art-spec.md, F1 step 5).
 *
 *   npm run assets:placeholders
 *
 * Writes, with a provenance record each:
 * - every scene's bg.png and fg.png, plus obj-placeholder.png (a free-standing
 *   box to test depth sorting) and anim-placeholder.png (a 2-frame 8x8 blink)
 *   for the four walkable scenes. Build tasks replace or delete them.
 * - the slot sprites and their "and more" fold objects.
 * - a box-figure character sheet with every tag (31 body frames, 6 talk heads).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  CHARACTER_TAGS,
  PROVENANCE_DIR,
  REPO_ROOT,
  createImage,
  fail,
  fillRect,
  loadPalette,
  packCharacter,
  setPixel,
  writePng,
  type Image,
  type Palette,
  type Rgb,
  type SceneId,
} from "./lib";

const DATE = new Date().toISOString().slice(0, 10);

let palette: Palette;
const c = (index: string): Rgb => {
  const colour = palette.byIndex.get(index);
  if (!colour) throw new Error(`Palette has no index "${index}"`);
  return colour.rgb;
};

function checker(
  img: Image,
  x: number,
  y: number,
  w: number,
  h: number,
  a: string,
  b: string,
  size = 8,
) {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const odd = (Math.floor(xx / size) + Math.floor(yy / size)) % 2;
      setPixel(img, x + xx, y + yy, c(odd ? a : b));
    }
  }
}

interface SceneLook {
  wall: string;
  trim: string;
  floor: string;
  floorAlt: string;
  window: string;
  windowLight: string;
  door: string;
  fg: string;
}

const LOOKS: Record<Exclude<SceneId, "travel-map">, SceneLook> = {
  hall: {
    wall: "T",
    trim: "S",
    floor: "U",
    floorAlt: "V",
    window: "X",
    windowLight: "Y",
    door: "R",
    fg: "Q",
  },
  london: {
    wall: "8",
    trim: "6",
    floor: "7",
    floorAlt: "B",
    window: "Z",
    windowLight: "g",
    door: "e",
    fg: "6",
  },
  zurich: {
    wall: "j",
    trim: "i",
    floor: "7",
    floorAlt: "8",
    window: "l",
    windowLight: "p",
    door: "8",
    fg: "O",
  },
  sorrento: {
    wall: "t",
    trim: "s",
    floor: "w",
    floorAlt: "5",
    window: "x",
    windowLight: "y",
    door: "r",
    fg: "O",
  },
};

/** Back wall down to y=100, a 60 px floor (the spec asks for at least 40). */
function sceneBg(scene: Exclude<SceneId, "travel-map">): Image {
  const look = LOOKS[scene];
  const img = createImage(320, 160, c(look.wall));
  fillRect(img, 0, 96, 320, 4, c(look.trim));
  checker(img, 0, 100, 320, 60, look.floor, look.floorAlt);
  fillRect(img, 110, 14, 88, 58, c(look.trim));
  fillRect(img, 114, 18, 80, 50, c(look.window));
  fillRect(img, 170, 24, 6, 6, c(look.windowLight));
  const doors = scene === "hall" ? [20, 60, 280] : [286];
  for (const x of doors) {
    fillRect(img, x, 32, 30, 68, c(look.trim));
    fillRect(img, x + 2, 34, 26, 66, c(look.door));
  }
  return img;
}

function sceneFg(scene: Exclude<SceneId, "travel-map">): Image {
  const img = createImage(320, 160);
  fillRect(img, 4, 128, 24, 32, c(LOOKS[scene].fg));
  fillRect(img, 4, 128, 24, 1, c("0"));
  return img;
}

function travelMapBg(): Image {
  const img = createImage(320, 160, c("5"));
  fillRect(img, 0, 0, 320, 4, c("4"));
  fillRect(img, 0, 156, 320, 4, c("4"));
  fillRect(img, 60, 30, 40, 50, c("4")); // Britain
  fillRect(img, 110, 40, 150, 110, c("4")); // the continent
  const markers: [number, number][] = [
    [84, 64],
    [170, 82],
    [214, 130],
  ];
  for (const [x, y] of markers) fillRect(img, x - 1, y - 1, 3, 3, c("M"));
  return img;
}

function objPlaceholder(scene: Exclude<SceneId, "travel-map">): Image {
  const img = createImage(40, 28, c("0"));
  fillRect(img, 1, 1, 38, 26, c(LOOKS[scene].trim));
  fillRect(img, 1, 1, 38, 4, c(LOOKS[scene].door));
  return img;
}

function animPlaceholder(): Image {
  const img = createImage(16, 8);
  fillRect(img, 0, 0, 8, 8, c("K"));
  fillRect(img, 8, 0, 8, 8, c("J"));
  return img;
}

const SLOTS: Record<string, () => Image> = {
  "slot-tap": () => {
    const img = createImage(6, 16);
    fillRect(img, 1, 0, 4, 10, c("0"));
    fillRect(img, 2, 1, 2, 8, c("K"));
    fillRect(img, 0, 10, 6, 6, c("J"));
    return img;
  },
  "slot-tap-more": () => {
    const img = createImage(12, 10, c("0"));
    fillRect(img, 1, 1, 10, 8, c("8"));
    return img;
  },
  "slot-photo-frame": () => {
    const img = createImage(20, 20, c("J"));
    fillRect(img, 2, 2, 16, 16, c("3"));
    return img;
  },
  "slot-photo-frame-more": () => {
    const img = createImage(20, 12, c("0"));
    fillRect(img, 1, 1, 18, 10, c("9"));
    fillRect(img, 1, 1, 18, 3, c("A"));
    return img;
  },
  "slot-magnet": () => {
    const img = createImage(8, 8, c("L"));
    fillRect(img, 1, 1, 6, 6, c("N"));
    return img;
  },
  "slot-magnet-more": () => {
    const img = createImage(8, 8, c("L"));
    fillRect(img, 1, 1, 6, 3, c("N"));
    fillRect(img, 1, 5, 6, 2, c("M"));
    return img;
  },
};

/** One 32x64 box-figure frame: feet on row 61, 57 px tall, a frame marker on row 1. */
function bodyFrame(tag: string, frame: number): Image {
  const img = createImage(32, 64);
  const facing = tag.slice(-1);
  const step = tag.startsWith("walk")
    ? [0, 1, 2, 1, 0, -1, -2, -1][frame % 8]
    : 0;
  const reach = tag.startsWith("use") ? frame + 1 : 0;
  // Head, hair, beard (rows 5-15).
  fillRect(img, 11, 5, 10, 11, c(facing === "n" ? "B" : "E"));
  fillRect(img, 11, 5, 10, 3, c("B"));
  if (facing !== "n") fillRect(img, 11, 12, 10, 4, c("B"));
  if (facing === "s") {
    setPixel(img, 13, 9, c("0"));
    setPixel(img, 18, 9, c("0"));
  }
  if (facing === "e") setPixel(img, 19, 9, c("0"));
  if (tag.startsWith("idle") && frame === 2) fillRect(img, 13, 9, 6, 1, c("D"));
  // Sweater (rows 16-37), arm reaching for use-*.
  fillRect(img, 9, 16, 14, 22, c("H"));
  if (reach) fillRect(img, 23, facing === "n" ? 14 : 22, 3 * reach, 3, c("H"));
  // Jeans (rows 38-58) with a stride, then shoes (rows 59-61).
  fillRect(img, 10 + step, 38, 5, 21, c("I"));
  fillRect(img, 17 - step, 38, 5, 21, c("I"));
  fillRect(img, 9 + step, 59, 7, 3, c("7"));
  fillRect(img, 16 - step, 59, 7, 3, c("7"));
  // Frame marker: frame + 1 brass pixels on row 1, so frame changes are visible.
  for (let i = 0; i <= frame; i++) setPixel(img, 2 + i * 2, 1, c("K"));
  return img;
}

function headFrame(tag: string, frame: number): Image {
  const img = createImage(16, 16);
  fillRect(img, 3, 2, 10, 11, c("E"));
  fillRect(img, 3, 2, 10, 3, c("B"));
  fillRect(img, 3, 9, 10, 4, c("B"));
  fillRect(img, tag === "talk-e" ? 8 : 6, 10, 4, frame, c("L"));
  return img;
}

function strip(tag: string): Image {
  const spec = CHARACTER_TAGS[tag];
  const img = createImage(spec.frames * spec.cell.w, spec.cell.h);
  for (let f = 0; f < spec.frames; f++) {
    const frame = tag.startsWith("talk")
      ? headFrame(tag, f)
      : bodyFrame(tag, f);
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        const i = (y * frame.width + x) * 4;
        if (frame.data[i + 3])
          setPixel(img, f * spec.cell.w + x, y, [
            frame.data[i],
            frame.data[i + 1],
            frame.data[i + 2],
          ]);
      }
    }
  }
  return img;
}

function writeProvenance(id: string, output: string, note: string) {
  const path = join(PROVENANCE_DIR, `${id}.json`);
  const previous = existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as { date?: string })
    : {};
  const record = {
    id,
    output,
    task: "F1",
    source: "opus",
    palette: palette.version,
    cleanup: `Placeholder from scripts/assets/placeholders.ts. ${note}`,
    date: previous.date ?? DATE,
  };
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
}

async function emit(id: string, output: string, img: Image, note: string) {
  await writePng(resolve(REPO_ROOT, output), img);
  writeProvenance(id, output, note);
  console.log(output);
}

async function main() {
  palette = loadPalette();
  for (const scene of Object.keys(LOOKS) as (keyof typeof LOOKS)[]) {
    const dir = `src/assets/scenes/${scene}`;
    const replace = `Replaced in the ${scene} build task.`;
    await emit(`${scene}-bg`, `${dir}/bg.png`, sceneBg(scene), replace);
    await emit(`${scene}-fg`, `${dir}/fg.png`, sceneFg(scene), replace);
    await emit(
      `${scene}-obj-placeholder`,
      `${dir}/obj-placeholder.png`,
      objPlaceholder(scene),
      `Deleted in the ${scene} build task.`,
    );
    await emit(
      `${scene}-anim-placeholder`,
      `${dir}/anim-placeholder.png`,
      animPlaceholder(),
      `Deleted in the ${scene} build task.`,
    );
  }
  await emit(
    "travel-map-bg",
    "src/assets/scenes/travel-map/bg.png",
    travelMapBg(),
    "Replaced in B5.",
  );
  for (const [id, draw] of Object.entries(SLOTS)) {
    await emit(
      id,
      `src/assets/shared/slots/${id}.png`,
      draw(),
      "Replaced in B6.",
    );
  }

  const strips = Object.fromEntries(
    Object.keys(CHARACTER_TAGS).map((tag) => [tag, strip(tag)]),
  );
  const { sheet, json } = packCharacter(strips, {
    stride: 24,
    talkHeadOffset: { x: 8, y: 3 },
  });
  await emit(
    "char-sheet",
    "src/assets/character/daniele.png",
    sheet,
    "Box figure; replaced in B7.",
  );
  writeFileSync(
    resolve(REPO_ROOT, "src/assets/character/daniele.json"),
    `${JSON.stringify(json, null, 2)}\n`,
  );
  console.log("src/assets/character/daniele.json");
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
