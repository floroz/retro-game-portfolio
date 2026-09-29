/**
 * Daniele's pose clips (docs/art-spec.md, "Phase H", "Character"), as data
 * in the format of clip.ts. The engine plays them on the cut-out rig
 * (rigTypes.ts); HB7 fine-tunes the numbers on the real parts.
 *
 * Conventions (transform.ts): angles in degrees, counter-clockwise on
 * screen. In the side view, which faces east, positive swings a hanging
 * limb forward and bends the elbow; a positive shin bends the knee the
 * wrong way, so knees bend with negative shins; a negative torso leans
 * forward. `l` and `r` are Daniele's own left and right: in the side view
 * the `r` limbs are nearest the viewer, and in the back view `r` is on
 * screen right. Root offsets are logical px.
 *
 * The walk is a cartoon-adventure walk, after Richard Williams' contact,
 * down, passing, up: a bouncy step (the hips drop on the bent knee of the
 * down key and rise on the up key, from the legs, with `groundLock`),
 * arms counter-swinging to the legs, and a slight forward lean. The second
 * half of each cycle is the first with left and right swapped.
 */
import type { RigPartId } from "../rigTypes";
import type { PoseClip, PoseKey } from "./clip";

/** The clips the animator plays, by name. */
export type ClipName =
  | "walk-side"
  | "walk-front"
  | "walk-back"
  | "idle-side"
  | "idle-front"
  | "idle-back"
  | "use-e"
  | "use-n"
  | "talk-side"
  | "talk-front";

const SWAP: Record<RigPartId, RigPartId> = {
  torso: "torso",
  head: "head",
  "upper-arm-l": "upper-arm-r",
  "upper-arm-r": "upper-arm-l",
  "forearm-l": "forearm-r",
  "forearm-r": "forearm-l",
  "thigh-l": "thigh-r",
  "thigh-r": "thigh-l",
  "shin-l": "shin-r",
  "shin-r": "shin-l",
};

function swapped<T>(
  values: Partial<Record<RigPartId, T>> | undefined,
  flip: (id: RigPartId, v: T) => T = (_, v) => v,
): Partial<Record<RigPartId, T>> | undefined {
  if (!values) return undefined;
  const out: Partial<Record<RigPartId, T>> = {};
  for (const [id, v] of Object.entries(values) as [RigPartId, T][]) {
    out[SWAP[id]] = flip(id, v);
  }
  return out;
}

/**
 * A walk's first half, `at` 0 to below 0.5, followed by the same keys half
 * a cycle later with left and right swapped. `mirrorX` also flips the sign
 * of torso and head angles and the hips' x: the front and back walks sway
 * towards each stepping side in turn.
 */
function stepCycle(half: PoseKey[], mirrorX = false): PoseKey[] {
  const flip = (id: RigPartId, v: number) =>
    mirrorX && (id === "torso" || id === "head") ? -v : v;
  const second = half.map((k) => ({
    at: k.at + 0.5,
    angles: swapped(k.angles, flip),
    stretch: swapped(k.stretch),
    root: k.root && {
      x: mirrorX && k.root.x !== undefined ? -k.root.x : k.root.x,
      y: k.root.y,
    },
  }));
  return [...half, ...second];
}

/**
 * A torso lean with the legs held upright: the legs hang from the torso, so
 * leaning it would swing the feet. The idle sways the weight, not the feet.
 */
const planted = (torso: number): Partial<Record<RigPartId, number>> => ({
  torso,
  "thigh-l": -torso,
  "thigh-r": -torso,
});

/**
 * The chest rising by `s` (a torso stretch). A stretch is inherited by
 * everything hanging from the part, so the legs and head are counter-scaled
 * to stay exactly as they were: only the shoulders and arms ride up.
 */
const breathe = (s: number): Partial<Record<RigPartId, number>> => ({
  torso: s,
  head: 1 / s,
  "thigh-l": 1 / s,
  "thigh-r": 1 / s,
});

export const POSE_CLIPS: Record<ClipName, PoseClip> = {
  // --- Walks: distance-driven, the feet planted -----------------------------
  "walk-side": {
    facing: "side",
    loop: true,
    timing: { stride: 1 },
    groundLock: true,
    footLock: true,
    footfalls: [0, 0.5],
    keys: stepCycle([
      {
        // Contact: the near (right) heel strikes, arms at full swing.
        at: 0,
        angles: {
          torso: -4,
          head: 2,
          "thigh-r": 26,
          "shin-r": -4,
          "thigh-l": -18,
          "shin-l": -22,
          "upper-arm-r": -24,
          "forearm-r": 14,
          "upper-arm-l": 26,
          "forearm-l": 32,
        },
      },
      {
        // Down: the weight lands on the bent front knee; the hips sink.
        at: 0.125,
        angles: {
          torso: -6,
          head: 4,
          "thigh-r": 18,
          "shin-r": -20,
          "thigh-l": -10,
          "shin-l": -50,
          "upper-arm-r": -16,
          "forearm-r": 12,
          "upper-arm-l": 18,
          "forearm-l": 28,
        },
      },
      {
        // Passing: the back leg swings through, knee high, cartoon style.
        at: 0.25,
        angles: {
          torso: -4,
          head: 1,
          "thigh-r": 0,
          "shin-r": -3,
          "thigh-l": 14,
          "shin-l": -64,
          "upper-arm-r": 0,
          "forearm-r": 10,
          "upper-arm-l": 2,
          "forearm-l": 18,
        },
      },
      {
        // Up: pushing off the toes; the hips reach their highest.
        at: 0.375,
        angles: {
          torso: -3,
          head: -1,
          "thigh-r": -14,
          "shin-r": -2,
          "thigh-l": 30,
          "shin-l": -30,
          "upper-arm-r": 16,
          "forearm-r": 22,
          "upper-arm-l": -14,
          "forearm-l": 12,
        },
        root: { y: -0.8 },
      },
    ]),
  },
  "walk-front": {
    facing: "front",
    loop: true,
    // Walking towards the viewer covers less screen per step.
    timing: { stride: 0.6 },
    groundLock: true,
    footfalls: [0, 0.5],
    keys: stepCycle(
      [
        {
          // Both feet down, the right about to lift.
          at: 0,
          angles: {
            torso: 1.5,
            head: -1,
            "upper-arm-r": -4,
            "upper-arm-l": 4,
          },
          stretch: { "upper-arm-r": 0.94, "upper-arm-l": 1 },
          root: { x: 0.4 },
        },
        {
          // The right knee comes up towards the viewer: a shorter thigh.
          at: 0.25,
          angles: {
            torso: 2.5,
            head: -1.5,
            "thigh-r": 4,
            "shin-r": -3,
            "thigh-l": -1,
            "upper-arm-r": -6,
            "forearm-r": -8,
            "upper-arm-l": 6,
            "forearm-l": 4,
          },
          stretch: {
            "thigh-r": 0.8,
            "shin-r": 0.94,
            "upper-arm-l": 0.9,
            "forearm-l": 0.86,
          },
          root: { x: 0.8, y: -0.6 },
        },
      ],
      true,
    ),
  },
  "walk-back": {
    facing: "back",
    loop: true,
    timing: { stride: 0.6 },
    groundLock: true,
    footfalls: [0, 0.5],
    keys: stepCycle(
      [
        {
          at: 0,
          angles: {
            torso: -1.5,
            head: 1,
            "upper-arm-r": -4,
            "upper-arm-l": 4,
          },
          root: { x: -0.4 },
        },
        {
          // Walking away: the lifted foot shows its sole, the thigh shortens.
          at: 0.25,
          angles: {
            torso: -2.5,
            head: 1.5,
            "thigh-r": -3,
            "shin-r": 4,
            "upper-arm-r": -6,
            "forearm-r": -4,
            "upper-arm-l": 6,
            "forearm-l": 6,
          },
          stretch: {
            "thigh-r": 0.86,
            "shin-r": 0.84,
            "upper-arm-r": 0.9,
            "forearm-r": 0.88,
          },
          root: { x: -0.8, y: -0.6 },
        },
      ],
      true,
    ),
  },

  // --- Idle: breathing, with a blink by head swap (animator.ts) -------------
  // Alive, not a statue: the chest rises a pixel over about 2 s with the feet
  // planted (a torso stretch: the shoulders, head and arms ride up with it),
  // the weight drifts a degree from side to side, and the elbows hang a few
  // degrees bent, a little differently on each side.
  "idle-side": {
    facing: "side",
    loop: true,
    timing: { ms: 3600 },
    keys: [
      {
        at: 0,
        angles: {
          ...planted(-0.6),
          head: 0.6,
          "upper-arm-r": 2,
          "forearm-r": 7,
          "upper-arm-l": 1,
          "forearm-l": 5,
        },
      },
      {
        // Breathe in: the chest lifts a pixel, the shoulders rise a touch.
        at: 0.45,
        angles: {
          ...planted(0.4),
          head: -1.2,
          "upper-arm-r": 3,
          "forearm-r": 9,
          "upper-arm-l": 2,
          "forearm-l": 6,
        },
        stretch: breathe(1.024),
      },
      {
        at: 0.8,
        angles: {
          ...planted(0.6),
          head: -0.4,
          "upper-arm-r": 2.4,
          "forearm-r": 8,
          "upper-arm-l": 1.4,
          "forearm-l": 5.5,
        },
        stretch: breathe(1.008),
      },
    ],
  },
  "idle-front": {
    facing: "front",
    loop: true,
    timing: { ms: 3600 },
    // Facing the viewer, his right arm is on screen left: outwards is
    // clockwise, a negative angle, and bending the elbow in is positive.
    keys: [
      {
        at: 0,
        angles: {
          ...planted(-0.7),
          head: 0.8,
          "upper-arm-r": -1.5,
          "forearm-r": 6,
          "upper-arm-l": 2,
          "forearm-l": -3,
        },
      },
      {
        at: 0.45,
        angles: {
          ...planted(0.3),
          head: 1.6,
          "upper-arm-r": -2.5,
          "forearm-r": 7,
          "upper-arm-l": 3,
          "forearm-l": -4,
        },
        stretch: breathe(1.024),
      },
      {
        at: 0.8,
        angles: {
          ...planted(0.7),
          head: 0.2,
          "upper-arm-r": -2,
          "forearm-r": 6.5,
          "upper-arm-l": 2.4,
          "forearm-l": -3.4,
        },
        stretch: breathe(1.008),
      },
    ],
  },
  "idle-back": {
    facing: "back",
    loop: true,
    timing: { ms: 3600 },
    keys: [
      {
        at: 0,
        angles: {
          ...planted(0.7),
          head: -0.8,
          "upper-arm-r": 2,
          "forearm-r": -4,
          "upper-arm-l": -1.5,
          "forearm-l": 5,
        },
      },
      {
        at: 0.45,
        angles: {
          ...planted(-0.3),
          head: -1.4,
          "upper-arm-r": 3,
          "forearm-r": -5,
          "upper-arm-l": -2.5,
          "forearm-l": 6,
        },
        stretch: breathe(1.024),
      },
      {
        at: 0.8,
        angles: {
          ...planted(-0.7),
          head: -0.2,
          "upper-arm-r": 2.4,
          "forearm-r": -4.4,
          "upper-arm-l": -2,
          "forearm-l": 5.5,
        },
        stretch: breathe(1.008),
      },
    ],
  },

  // --- Use: reach out, hold while the action runs, return -------------------
  "use-e": {
    facing: "side",
    loop: false,
    timing: { ms: 150 },
    keys: [
      { at: 0 },
      {
        // Overshoot a little, then settle: the reach has some snap.
        at: 0.65,
        angles: {
          torso: -7,
          head: -5,
          "upper-arm-r": 84,
          "forearm-r": 18,
          "upper-arm-l": -6,
          "thigh-r": 4,
        },
      },
      {
        at: 1,
        angles: {
          torso: -6,
          head: -4,
          "upper-arm-r": 78,
          "forearm-r": 10,
          "upper-arm-l": -4,
          "thigh-r": 3,
        },
      },
    ],
  },
  "use-n": {
    facing: "back",
    loop: false,
    timing: { ms: 150 },
    keys: [
      { at: 0 },
      {
        at: 0.65,
        angles: { head: -3, "upper-arm-r": 158, "forearm-r": 14 },
        stretch: { "upper-arm-r": 0.72, "forearm-r": 0.8 },
      },
      {
        // The right arm reaches up and into the scene.
        at: 1,
        angles: { head: -2, "upper-arm-r": 150, "forearm-r": 8 },
        stretch: { "upper-arm-r": 0.75, "forearm-r": 0.82 },
      },
    ],
  },

  // --- Talk: body language under the mouth shapes (animator.ts) -------------
  "talk-side": {
    facing: "side",
    loop: true,
    timing: { ms: 1600 },
    keys: [
      { at: 0, angles: { head: 0, "upper-arm-r": 8, "forearm-r": 30 } },
      { at: 0.25, angles: { head: 3, "upper-arm-r": 16, "forearm-r": 52 } },
      { at: 0.5, angles: { head: -2, "upper-arm-r": 12, "forearm-r": 38 } },
      {
        at: 0.75,
        angles: { head: 2, ...planted(1), "upper-arm-r": 18, "forearm-r": 58 },
      },
    ],
  },
  "talk-front": {
    facing: "front",
    loop: true,
    timing: { ms: 1600 },
    keys: [
      // His right hand gestures out to screen left: negative angles.
      { at: 0, angles: { head: 0, "upper-arm-r": -8, "forearm-r": -24 } },
      { at: 0.25, angles: { head: 3, "upper-arm-r": -14, "forearm-r": -44 } },
      { at: 0.5, angles: { head: -2, "upper-arm-r": -10, "forearm-r": -32 } },
      { at: 0.75, angles: { head: 2, "upper-arm-r": -16, "forearm-r": -52 } },
    ],
  },
};
