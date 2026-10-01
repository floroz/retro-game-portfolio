/**
 * Rebuild the mother's legs after preparing the generated family walk sheet.
 * Applied by `npx tsx scripts/assets/passengers.ts` to the 124x112 cells, and
 * by `npx tsx scripts/assets/remaster-hall.ts` at `scale` 2 to the remaster's
 * 248x224 cells, which keep the same foot-aligned layout.
 *
 * The generated frames all show her in the same wide stride, so she slides
 * while the boy (whose frames do alternate) walks. This keeps frames 0 and 2
 * as the two contact poses and turns frames 1 and 3 into passing poses: the
 * planted leg straightens under her and the other leg swings through, lifted.
 * Frame 1 swings the leg that was trailing, frame 3 the one that was leading,
 * so the feet trade places over a full cycle.
 */
import { type Image as PixelImage } from "./lib";

const HIP_Y = 74; // where the two thighs part
const ANKLE_Y = 97; // shoes move rigidly, only the trouser is sheared
const LEG_MIN_X = 30;
const BOY_X = 46; // left of this the boy's legs can overlap her back leg
const TROLLEY_X = 76; // the trolley's pole starts here
const HAND_X = 36; // the boy's swinging hand, beside her back leg
const SHOE_Y = 98;
const TOE_X = 78; // her front toe overlaps the wheel; past this, rust is wheel

type Rgba = [number, number, number, number];

interface Pixel {
  x: number;
  y: number;
  rgba: Rgba;
}

interface Legs {
  trailing: Pixel[];
  leading: Pixel[];
}

interface Pass {
  /** Horizontal px of shear per row below the hip for the trailing leg. */
  trailing: number;
  /** ...and for the leading leg. */
  leading: number;
  /** Fraction of leg length kept: < 1 lifts the foot off the floor. */
  trailingLength: number;
  leadingLength: number;
}

const PASSES: Record<number, Pass> = {
  1: { trailing: 0.44, leading: -0.25, trailingLength: 0.9, leadingLength: 1 },
  3: { trailing: 0.32, leading: -0.32, trailingLength: 1, leadingLength: 0.9 },
};

/** The frame whose trailing loafer stands in where the boy hides her own. */
const SHOE_DONOR: Record<number, number> = { 1: 3 };

/** The boy's jeans, sweater, hand and trainers. */
const isBoy = (x: number, y: number, r: number, g: number, b: number) => {
  const grey = Math.max(r, g, b) - Math.min(r, g, b) < 25;
  return (
    b > r + 8 || // jeans
    (g - b < 9 && r > 110) || // sweater, redder than her russet trousers
    (y >= SHOE_Y && (r + g + b > 330 || (grey && r + g + b > 180))) ||
    (r > 165 && x < HAND_X)
  );
};

/**
 * Whether a pixel belongs to her legs rather than the boy, the trolley or the
 * floor. Dithered trouser shading is often grey or blue, so inside her own
 * columns any opaque pixel counts; colour only tells her from the boy where
 * they overlap, and her loafer from the wheel where they overlap.
 */
function isLeg(x: number, y: number, r: number, g: number, b: number): boolean {
  if (x < BOY_X) return !isBoy(x, y, r, g, b);
  if (x <= TROLLEY_X) return true;
  return y >= SHOE_Y && x <= TOE_X && r - b >= 25;
}

/** Lift both legs out of a frame (leaving it transparent there). */
function liftLegs(data: Uint8ClampedArray, stride: number, ox: number): Legs {
  const trailing: Pixel[] = [];
  const leading: Pixel[] = [];
  const height = data.length / 4 / stride;
  for (let y = HIP_Y; y < height; y++) {
    const at = (x: number) => (y * stride + ox + x) * 4;
    const xs: number[] = [];
    for (let x = LEG_MIN_X; x <= TOE_X; x++) {
      const i = at(x);
      if (data[i + 3] && isLeg(x, y, data[i], data[i + 1], data[i + 2])) {
        xs.push(x);
      }
    }
    // Runs of three or more px are leg; stray pixels follow whichever side of
    // the widest gap between the legs they fall on.
    const runs: { from: number; to: number }[] = [];
    for (const x of xs) {
      const run = runs[runs.length - 1];
      if (run && x === run.to + 1) run.to = x;
      else runs.push({ from: x, to: x });
    }
    const legs = runs.filter((run) => run.to - run.from >= 2);
    let split = Infinity;
    let gap = 0;
    for (let k = 1; k < legs.length; k++) {
      if (legs[k].from - legs[k - 1].to > gap) {
        gap = legs[k].from - legs[k - 1].to;
        split = legs[k].from;
      }
    }
    const merged = gap < 4; // crotch rows: one solid run
    for (const x of xs) {
      const i = at(x);
      const rgba: Rgba = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      const isTrailing = merged ? x < 52 : x < split;
      (isTrailing ? trailing : leading).push({ x, y, rgba });
      data[i + 3] = 0;
    }
  }
  return { trailing, leading };
}

/**
 * One pixel per `scale` x `scale` block, used only to tell the legs apart:
 * opaque where any of the block shows, so the faint edges a smooth resample
 * leaves around the trousers are not mistaken for gaps or stray runs.
 */
function toGrid(image: PixelImage, scale: number): PixelImage {
  const width = image.width / scale;
  const height = image.height / scale;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sum = [0, 0, 0];
      let weight = 0;
      for (let j = 0; j < scale; j++) {
        for (let i = 0; i < scale; i++) {
          const k = ((y * scale + j) * image.width + x * scale + i) * 4;
          const a = image.data[k + 3];
          for (let c = 0; c < 3; c++) sum[c] += image.data[k + c] * a;
          weight += a;
        }
      }
      if (weight < 32) continue;
      const o = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) data[o + c] = Math.round(sum[c] / weight);
      data[o + 3] = 255;
    }
  }
  return { data, width, height };
}

/** Lift the sheet's own pixels under each grid pixel of a leg. */
function liftBlocks(
  legs: Legs,
  image: PixelImage,
  data: Uint8ClampedArray,
  scale: number,
  ox: number,
): Legs {
  const lift = (leg: Pixel[]) =>
    leg.flatMap(({ x, y }) => {
      const block: Pixel[] = [];
      for (let j = 0; j < scale; j++) {
        for (let i = 0; i < scale; i++) {
          const px = x * scale + i;
          const py = y * scale + j;
          const k = (py * image.width + ox + px) * 4;
          const [r, g, b, alpha] = image.data.subarray(k, k + 4);
          // A block can straddle her and the boy; leave his pixels in place.
          // Above her shoes, the soft edges of his hand and trainers reach
          // past the landmarks at this size, and nothing of her trousers is as
          // bright or as orange. At the shoes, the grid's call stands: her
          // loafers catch orange and white highlights of their own.
          const his =
            Math.floor(px / scale) < BOY_X &&
            Math.floor(py / scale) < SHOE_Y &&
            (r + g + b > 330 || (r > 140 && r - b > 70));
          if (!alpha || his) continue;
          const rgba: Rgba = [
            image.data[k],
            image.data[k + 1],
            image.data[k + 2],
            image.data[k + 3],
          ];
          block.push({ x: px, y: py, rgba });
          data[k + 3] = 0;
        }
      }
      return block;
    });
  return { trailing: lift(legs.trailing), leading: lift(legs.leading) };
}

/** Mean x of a leg's pixels on one row. */
function centre(leg: Pixel[], y: number): number {
  const row = leg.filter((p) => p.y === y);
  return row.reduce((sum, p) => sum + p.x, 0) / Math.max(row.length, 1);
}

/**
 * `scale` is the sheet's size relative to the 124x112 cells the landmarks
 * above were measured on. The legs are told apart on a grid of that size, and
 * then sheared on the sheet's own pixels so a smooth export keeps smooth edges.
 */
export function animateMotherStride(
  image: PixelImage,
  cellWidth: number,
  scale = 1,
): PixelImage {
  const { width, height } = image;
  const grid = scale === 1 ? image : toGrid(image, scale);
  const gridData = new Uint8ClampedArray(grid.data);
  const data = scale === 1 ? gridData : new Uint8ClampedArray(image.data);
  const at = (n: number) => Math.round(n * scale);
  const hipY = at(HIP_Y);
  const ankleY = at(ANKLE_Y);

  const lifted = new Map<number, Legs>();
  for (const frame of Object.keys(PASSES)) {
    const legs = liftLegs(
      gridData,
      grid.width,
      (Number(frame) * cellWidth) / scale,
    );
    lifted.set(
      Number(frame),
      scale === 1
        ? legs
        : liftBlocks(legs, image, data, scale, Number(frame) * cellWidth),
    );
  }
  // Swap in a clean loafer wherever the boy's trainer covered hers.
  for (const [frame, donor] of Object.entries(SHOE_DONOR)) {
    const mine = lifted.get(Number(frame))!;
    const theirs = lifted.get(donor)!;
    const dx = Math.round(
      centre(mine.trailing, ankleY) - centre(theirs.trailing, ankleY),
    );
    mine.trailing = [
      ...mine.trailing.filter((p) => p.y <= ankleY),
      ...theirs.trailing
        .filter((p) => p.y > ankleY)
        .map((p) => ({ ...p, x: p.x + dx })),
    ];
  }

  for (const [frame, pass] of Object.entries(PASSES)) {
    const ox = Number(frame) * cellWidth;
    // Preserve the boy in front of her back leg, but not the near-transparent
    // resampling fringe left at the trousers' old position. Treating any alpha
    // as occupied punches that old outline through the moved leg.
    const occupied = new Uint8Array(data.length / 4);
    for (let i = 0; i < occupied.length; i++) {
      occupied[i] = data[i * 4 + 3] > 128 ? 1 : 0;
    }
    const paint = (leg: Pixel[], shear: number, length: number) => {
      const rows = new Map<number, Pixel[]>();
      for (const p of leg) rows.set(p.y, [...(rows.get(p.y) ?? []), p]);
      // The child's trainer hides a few pixels inside the trouser cuff. Once
      // that leg moves, the hidden fabric is exposed. Reconstruct small gaps
      // near the ankle on the leg layer; leave the child in the foreground.
      for (const [y, row] of rows) {
        if (y < at(90) || y > ankleY) continue;
        row.sort((a, b) => a.x - b.x);
        const solid: Pixel[] = [];
        for (const p of row) {
          const previous = solid[solid.length - 1];
          if (previous && p.x - previous.x <= at(4)) {
            for (let x = previous.x + 1; x < p.x; x++) {
              const nearest = x - previous.x <= p.x - x ? previous : p;
              solid.push({ x, y, rgba: nearest.rgba });
            }
          }
          solid.push(p);
        }
        rows.set(y, solid);
      }
      const last = Math.max(...rows.keys()) - hipY;
      // Walk the destination rows and pick one source row for each, so a
      // shortened leg drops whole rows rather than overlapping them.
      for (let d = 0; d <= Math.round(last * length); d++) {
        const r = Math.min(last, Math.round(d / length));
        const x0 = Math.round(shear * Math.min(r, ankleY - hipY));
        for (const p of rows.get(hipY + r) ?? []) {
          const x = p.x + x0;
          const y = hipY + d;
          if (x < 0 || x >= cellWidth || y >= height) continue;
          const px = y * width + ox + x;
          // The boy stands in front of her back leg.
          if (x < at(BOY_X) && occupied[px]) continue;
          data.set(p.rgba, px * 4);
        }
      }
    };
    const legs = lifted.get(Number(frame))!;
    paint(legs.trailing, pass.trailing, pass.trailingLength);
    paint(legs.leading, pass.leading, pass.leadingLength);
  }
  // Her front foot no longer covers the wheel, so redraw the two columns it
  // hid by repeating the wheel's edge beside them.
  for (const frame of Object.keys(PASSES)) {
    const ox = Number(frame) * cellWidth;
    const toeX = at(TOE_X);
    for (let y = at(SHOE_Y); y < height; y++) {
      for (let x = at(TROLLEY_X); x <= toeX + at(6); x++) {
        const src = (y * width + x) * 4;
        const toe = x <= toeX && image.data[src] - image.data[src + 2] >= 25;
        const from = toe ? src + (toeX + 1 - x) * 4 : src;
        data.set(image.data.subarray(from, from + 4), (y * width + ox + x) * 4);
      }
    }
  }
  return { data, width, height };
}
