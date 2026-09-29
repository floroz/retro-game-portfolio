/**
 * Plays the pose clips (poses.ts) on the cut-out rig: the rig's counterpart
 * of `CharacterAnimator` (character.ts), with the same inputs and rules:
 *
 * - walk: the cycle advances by distance, one `walk-side` cycle per the
 *   rig's measured stride (scaled with depth), so the feet never slide; a
 *   foot lands at each of the clip's `footfalls`;
 * - idle: a breathing loop, and a 120 ms blink by head swap every 2-4 s;
 * - use: reaches out over the clip's 150 ms, holds while the action runs,
 *   then returns;
 * - talk: mouth-shape heads timed to the line being spoken, over a talking
 *   body loop while he stands still;
 * - west is the side view mirrored. Changing clip on the same facing blends
 *   over 160 ms; a new facing swaps the drawing at once, as LucasArts did.
 */
import type { AnimInput } from "../character";
import type { Facing } from "../types";
import type { RigFacing } from "../rigTypes";
import {
  REST_VALUES,
  blendPoses,
  ease,
  sampleClip,
  type PoseClip,
  type PoseValues,
} from "./clip";
import type { ClipName } from "./poses";
import { poseFor, type Rig } from "./rig";
import type { RigPose } from "./transform";

/** What to draw: which drawing, mirrored or not, in which pose. */
export interface RigState {
  facing: RigFacing;
  mirror: boolean;
  pose: RigPose;
  /** The clip playing, for the dev preview. */
  clip: ClipName;
}

const BLEND_MS = 160;
const BLINK_MS = 120;
const BLINK_HOLD: [number, number] = [2000, 4000];
/** How long each mouth shape shows: two characters of speech (speechMs). */
const MOUTH_MS = 110;
const MS_PER_CHAR = 55;

type Mode =
  | { kind: "idle" }
  | { kind: "walk"; phase: number }
  | { kind: "use"; phase: "reach" | "hold" | "return"; progress: number };

const RIG_FACING: Record<Facing, RigFacing> = {
  e: "side",
  w: "side",
  s: "front",
  n: "back",
};

/**
 * The mouth shape for the line `text`, `elapsedMs` after it started, from
 * the head's `talk-N` variants (null for the rest head, mouth closed):
 * - vowels a, e, i open wide (talk-1);
 * - o, u, w round (talk-2);
 * - other consonants half open (talk-3);
 * - m, b, p, spaces, and punctuation close it, and so does the end of
 *   the line.
 * A shape holds for `MOUTH_MS`, taken from the letter being spoken then,
 * at 55 ms a character (`speechMs`). A rig with fewer shapes uses the
 * nearest one it has.
 */
export function mouthFor(
  text: string,
  elapsedMs: number,
  mouths: readonly string[],
): string | null {
  if (mouths.length === 0) return null;
  const at =
    Math.floor(Math.max(0, elapsedMs) / MOUTH_MS) *
    Math.round(MOUTH_MS / MS_PER_CHAR);
  const ch = text[at]?.toLowerCase();
  if (!ch) return null;
  let shape: number;
  if ("aei".includes(ch)) shape = 1;
  else if ("ouwy".includes(ch)) shape = 2;
  else if (/[a-z0-9]/.test(ch) && !"mbp".includes(ch)) shape = 3;
  else return null;
  return mouths[Math.min(shape, mouths.length) - 1] ?? null;
}

export class RigAnimator {
  private readonly rig: Rig;
  private readonly rng: () => number;
  private facing: Facing = "s";
  private mode: Mode = { kind: "idle" };
  /** Free-running clock for the timed loops, in ms. */
  private clock = 0;
  private clip: ClipName = "idle-front";
  private values: PoseValues = REST_VALUES;
  private blend: { from: PoseValues; t: number } | null = null;
  private blinkIn: number;
  private blinkLeft = 0;
  private mouth: string | null = null;

  constructor(rig: Rig, rng: () => number = Math.random) {
    this.rig = rig;
    this.rng = rng;
    this.blinkIn = this.between(BLINK_HOLD);
  }

  private between([lo, hi]: [number, number]) {
    return lo + (hi - lo) * this.rng();
  }

  private reachMs() {
    const t = this.rig.clips["use-e"].timing;
    return "ms" in t ? t.ms : 150;
  }

  /** Starts reaching towards an object. Holds until `releaseUse()`. */
  startUse() {
    this.mode = { kind: "use", phase: "reach", progress: 0 };
  }

  releaseUse() {
    const m = this.mode;
    if (m.kind === "use" && m.phase !== "return") {
      this.mode = { kind: "use", phase: "return", progress: m.progress };
    }
  }

  get using() {
    return this.mode.kind === "use";
  }

  /** The clip for the current mode and facing. */
  private clipFor(talking: boolean): ClipName {
    const f = RIG_FACING[this.facing];
    switch (this.mode.kind) {
      case "walk":
        return `walk-${f}`;
      case "use":
        return this.facing === "n" ? "use-n" : "use-e";
      case "idle":
        if (talking && f !== "back") return `talk-${f}`;
        return `idle-${f}`;
    }
  }

  /** Advances the animation. Returns true when a foot touches the floor. */
  update(dtMs: number, input: AnimInput): boolean {
    const turned = RIG_FACING[input.facing] !== RIG_FACING[this.facing];
    this.facing = input.facing;
    this.clock += dtMs;
    let footstep = false;

    // Mode.
    const mode = this.mode;
    if (input.moving) {
      const walk =
        mode.kind === "walk" ? mode : { kind: "walk" as const, phase: 0 };
      const clip = this.rig.clips[`walk-${RIG_FACING[this.facing]}`];
      const per = "stride" in clip.timing ? clip.timing.stride : 1;
      const cycle = Math.max(0.5, this.rig.stride * per * input.scale);
      const before = walk.phase;
      walk.phase += input.distance / cycle;
      footstep = (clip.footfalls ?? []).some(
        (f) => Math.floor(before - f) < Math.floor(walk.phase - f),
      );
      this.mode = walk;
    } else if (mode.kind === "walk") {
      this.mode = { kind: "idle" };
    } else if (mode.kind === "use" && mode.phase !== "hold") {
      const step = dtMs / this.reachMs();
      if (mode.phase === "reach") {
        mode.progress = Math.min(1, mode.progress + step);
        if (mode.progress >= 1) this.mode = { ...mode, phase: "hold" };
      } else {
        mode.progress = Math.max(0, mode.progress - step);
        if (mode.progress <= 0) this.mode = { kind: "idle" };
      }
    }

    // Clip and blend.
    const name = this.clipFor(input.talking);
    const clip = this.rig.clips[name];
    if (name !== this.clip) {
      this.blend = turned ? null : { from: this.values, t: 0 };
      this.clip = name;
    }
    let values = sampleClip(clip, this.phaseOf(clip));
    if (this.blend) {
      this.blend.t += dtMs;
      const w = ease(this.blend.t / BLEND_MS);
      values = blendPoses(this.blend.from, values, w);
      if (w >= 1) this.blend = null;
    }
    this.values = values;

    // Head: the mouth while speaking, otherwise the blink.
    this.mouth = input.speech
      ? mouthFor(input.speech.text, input.speech.elapsedMs, this.rig.mouths)
      : null;
    if (this.blinkLeft > 0) {
      this.blinkLeft -= dtMs;
    } else {
      this.blinkIn -= dtMs;
      if (this.blinkIn <= 0) {
        this.blinkLeft = BLINK_MS;
        this.blinkIn = this.between(BLINK_HOLD);
      }
    }
    return footstep;
  }

  private phaseOf(clip: PoseClip): number {
    const m = this.mode;
    if (m.kind === "walk") return m.phase;
    if (m.kind === "use") return m.progress;
    return "ms" in clip.timing ? this.clock / clip.timing.ms : 0;
  }

  state(): RigState {
    const clip = this.rig.clips[this.clip];
    const head =
      this.mouth ??
      (this.blinkLeft > 0 && this.rig.blinks && !this.speaking()
        ? "blink"
        : null);
    return {
      facing: clip.facing,
      mirror: this.facing === "w" && clip.facing === "side",
      pose: poseFor(
        this.rig,
        clip,
        this.values,
        head ? { head } : {},
        this.blend ? undefined : this.phaseOf(clip),
      ),
      clip: this.clip,
    };
  }

  private speaking() {
    return this.mouth !== null;
  }
}
