/**
 * Dev-only rig preview (docs/art-spec.md, "Phase H", "Character"): plays
 * the pose clips (poses.ts) on the placeholder rig (placeholder.ts), or on
 * the packed `daniele-rig.json` once HB7 ships it, so the motion can be
 * tuned without walking round a scene. Under `npm run dev`, open
 * `/src/engine/rig/dev/preview.html`.
 *
 * The floor scrolls under a walking Daniele at the engine's walking speed:
 * a planted foot should stay still against its ticks. The readout gives
 * the planted heel's slide per step, which should be near zero.
 */
import { WALK_SPEED, speechMs } from "../../constants";
import type { Facing } from "../../types";
import { RigAnimator } from "../animator";
import { drawRig } from "../draw";
import { placeholderAtlas, placeholderRig } from "../placeholder";
import { heelOf, parseRig, placeRig, type Rig } from "../rig";

type Action = "walk" | "idle" | "talk" | "use";

const LINE =
  "Booting up the experience. Please do not turn off your recruiter.";

const SHIPPED = import.meta.glob<unknown>(
  "../../../assets/character/daniele-rig.json",
  {
    eager: true,
    import: "default",
  },
);
const SHIPPED_PNG = import.meta.glob<string>(
  "../../../assets/character/daniele-rig.png",
  {
    eager: true,
    import: "default",
  },
);

function loadRig(): Rig {
  const json = Object.values(SHIPPED)[0];
  const png = Object.values(SHIPPED_PNG)[0];
  const wantPlaceholder =
    new URLSearchParams(location.search).get("rig") === "placeholder";
  if (json && png && !wantPlaceholder) return parseRig(json, png);
  return parseRig(placeholderRig().json, placeholderAtlas());
}

const rig = loadRig();
const atlas = new Image();
atlas.src = rig.image;

const state = {
  facing: "e" as Facing,
  action: "walk" as Action,
  speed: 1,
  scale: 1.6,
  joints: false,
  paused: false,
};

let animator = new RigAnimator(rig);
let speechStart = 0;
let useUntil = 0;
let clock = 0;
let floor = 0;
/** Where each heel was planted on the floor, and the worst slide. */
const planted: Record<"shin-l" | "shin-r", number | null> = {
  "shin-l": null,
  "shin-r": null,
};
let slide = 0;

const ui = document.getElementById("ui") as HTMLDivElement;
const readout = document.getElementById("readout") as HTMLParagraphElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

function group<T extends string | number>(
  label: string,
  options: readonly T[],
  get: () => T,
  set: (v: T) => void,
) {
  const span = document.createElement("span");
  span.textContent = `${label}: `;
  const buttons = options.map((o) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(o);
    b.onclick = () => {
      set(o);
      buttons.forEach((x, i) =>
        x.setAttribute("aria-pressed", String(options[i] === get())),
      );
    };
    b.setAttribute("aria-pressed", String(o === get()));
    span.append(b);
    return b;
  });
  ui.append(span);
}

group(
  "facing",
  ["e", "w", "s", "n"] as const,
  () => state.facing,
  (v) => {
    state.facing = v;
    planted["shin-l"] = null;
    planted["shin-r"] = null;
  },
);
group(
  "action",
  ["walk", "idle", "talk", "use"] as const,
  () => state.action,
  (v) => {
    state.action = v;
    if (v === "talk") speechStart = clock;
    if (v === "use") {
      animator.startUse();
      useUntil = clock + 900;
    }
  },
);
group(
  "speed",
  [0.25, 0.5, 1, 2] as const,
  () => state.speed,
  (v) => {
    state.speed = v;
  },
);
group(
  "scale",
  [0.8, 1, 1.6] as const,
  () => state.scale,
  (v) => {
    state.scale = v;
  },
);
group(
  "joints",
  ["off", "on"] as const,
  () => (state.joints ? "on" : "off"),
  (v) => {
    state.joints = v === "on";
  },
);
group(
  "",
  ["pause", "reset"] as const,
  () => (state.paused ? "pause" : "reset"),
  (v) => {
    if (v === "pause") state.paused = !state.paused;
    else {
      animator = new RigAnimator(rig);
      slide = 0;
      planted["shin-l"] = null;
      planted["shin-r"] = null;
    }
  },
);

const GROUND = 150;

function frame(dtMs: number) {
  const dt = state.paused ? 0 : dtMs * state.speed;
  clock += dt;
  const walking = state.action === "walk";
  const side = state.facing === "e" || state.facing === "w";
  const distance = walking ? (WALK_SPEED * dt) / 1000 : 0;
  if (walking && side) floor += state.facing === "e" ? -distance : distance;
  if (state.action !== "use" || clock > useUntil) animator.releaseUse();
  if (state.action === "talk" && clock - speechStart > speechMs(LINE)) {
    speechStart = clock;
  }
  const talking = state.action === "talk";
  animator.update(dt, {
    moving: walking,
    distance,
    scale: state.scale,
    facing: state.facing,
    talking,
    speech: talking
      ? { text: LINE, elapsedMs: clock - speechStart }
      : undefined,
  });
  const look = animator.state();

  // Logical px on a 640x320 canvas, pixelated 2x by CSS, as the game draws.
  ctx.setTransform(canvas.width / 320, 0, 0, canvas.height / 160, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#3a3350";
  ctx.fillRect(0, 0, 320, 160);
  ctx.fillStyle = "#4a4046";
  ctx.fillRect(0, GROUND, 320, 10);
  ctx.fillStyle = "#b0a49a";
  for (let x = (((floor % 10) + 10) % 10) - 10; x < 330; x += 10) {
    ctx.fillRect(x, GROUND, 0.5, 3);
  }
  const cx = 160;
  if (atlas.complete) drawRig(ctx, atlas, rig, look, cx, GROUND, state.scale);

  // Foot slide: a heel on the floor should keep its place on it. Each heel
  // counts as down while it's within 2 atlas px of the lowest sole.
  const placed = placeRig(rig, look.facing, look.pose);
  const k = (state.scale / rig.density) * (look.mirror ? -1 : 1);
  for (const shin of ["shin-l", "shin-r"] as const) {
    const part = placed.find((p) => p.id === shin);
    if (!part) continue;
    const heel = heelOf(part);
    const onFloor = cx + heel.x * k - floor;
    if (walking && side && heel.y > -2 * rig.density && clock > 400) {
      const was = planted[shin];
      if (was === null) planted[shin] = onFloor;
      else slide = Math.max(slide, Math.abs(onFloor - was));
    } else {
      planted[shin] = null;
    }
  }

  if (state.joints) {
    ctx.fillStyle = "#ff5fd2";
    for (const p of placed) {
      ctx.beginPath();
      ctx.arc(cx + p.joint.x * k, GROUND + p.joint.y * Math.abs(k), 0.8, 0, 7);
      ctx.fill();
    }
  }
  readout.textContent =
    `${look.clip} · ${rig.figureHeight.toFixed(1)} px tall · stride ${rig.stride.toFixed(1)} px` +
    ` · worst planted-heel slide ${(slide / state.scale).toFixed(2)} logical px` +
    ` · head ${look.pose.variants.head ?? "rest"}`;
}

let last = performance.now();
const loop = (t: number) => {
  frame(Math.min(100, t - last));
  last = t;
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
