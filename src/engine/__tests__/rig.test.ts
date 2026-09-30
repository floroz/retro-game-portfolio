import { describe, expect, test, vi } from "vitest";
import { CHARACTER_SHEET } from "../assets";
import { HD_WORLD_SCALE } from "../constants";
import { SceneEngine } from "../SceneEngine";
import { SCENES, TRAVEL_MAP_DATA } from "../scenes";
import type { RigFacingData } from "../rigTypes";
import { RigAnimator, mouthFor } from "../rig/animator";
import { blendPoses, catmullRom, sampleClip, type PoseClip } from "../rig/clip";
import { placeholderRig } from "../rig/placeholder";
import { POSE_CLIPS, type ClipName } from "../rig/poses";
import { hardenAlpha } from "../raster";
import { heelOf, parseRig, placeRig, poseFor } from "../rig/rig";
import {
  REST_POSE,
  apply,
  multiply,
  rotate,
  solveRig,
  translate,
} from "../rig/transform";
import type { AnimInput } from "../character";
import type { SceneData } from "../types";

const close = (a: number, b: number, eps = 1e-9) =>
  expect(Math.abs(a - b)).toBeLessThan(eps);

const rig = parseRig(placeholderRig().json, "atlas.png");

/** A two-bone arm: torso at the hips, upper arm hanging from the shoulder. */
const ARM: RigFacingData = {
  bounds: { x: 0, y: 0, w: 0, h: 0 },
  parts: [
    {
      id: "torso",
      parent: null,
      z: 0,
      attach: { x: 0, y: -100 },
      frame: { x: 0, y: 0, w: 20, h: 50, pivot: { x: 10, y: 45 } },
      variants: {},
    },
    {
      id: "upper-arm-r",
      parent: "torso",
      z: 1,
      attach: { x: 0, y: -40 },
      frame: { x: 30, y: 0, w: 10, h: 40, pivot: { x: 5, y: 5 } },
      variants: {},
    },
    {
      id: "forearm-r",
      parent: "upper-arm-r",
      z: 2,
      attach: { x: 0, y: 30 },
      frame: { x: 50, y: 0, w: 10, h: 40, pivot: { x: 5, y: 5 } },
      variants: {
        pointing: { x: 70, y: 0, w: 12, h: 40, pivot: { x: 6, y: 5 } },
      },
    },
  ],
};

describe("rig transforms", () => {
  test("rotation is counter-clockwise on screen: a hanging limb swings east", () => {
    const p = apply(rotate(90), { x: 0, y: 10 });
    close(p.x, 10);
    close(p.y, 0);
    const q = apply(multiply(translate(5, 0), rotate(90)), { x: 0, y: 10 });
    close(q.x, 15);
  });

  test("the rest pose puts every joint at its attach chain", () => {
    const placed = solveRig(ARM, REST_POSE);
    const [torso, upper, fore] = placed;
    expect(torso.joint).toEqual({ x: 0, y: -100 });
    expect(upper.joint).toEqual({ x: 0, y: -140 });
    expect(fore.joint).toEqual({ x: 0, y: -110 });
    // A frame is drawn with its pivot on the joint: its top-left lands at
    // joint - pivot, reproducing the drawing.
    const topLeft = apply(fore.matrix, { x: -5, y: -5 });
    expect(topLeft).toEqual({ x: -5, y: -115 });
  });

  test("a parent's angle carries its children round its joint", () => {
    const placed = solveRig(ARM, {
      ...REST_POSE,
      angles: { "upper-arm-r": 90 },
    });
    // The elbow swings from straight below the shoulder to straight east.
    close(placed[2].joint.x, 30);
    close(placed[2].joint.y, -140);
    // Angles accumulate down the chain.
    const bent = solveRig(ARM, {
      ...REST_POSE,
      angles: { "upper-arm-r": 90, "forearm-r": -90 },
    });
    const hand = apply(bent[2].matrix, { x: 0, y: 30 });
    close(hand.x, 30);
    close(hand.y, -110);
  });

  test("the hips offset moves everything; stretch shortens along the part", () => {
    const moved = solveRig(ARM, { ...REST_POSE, root: { x: 3, y: -2 } });
    expect(moved[2].joint).toEqual({ x: 3, y: -112 });
    const short = solveRig(ARM, {
      ...REST_POSE,
      stretch: { "upper-arm-r": 0.5 },
    });
    // The elbow is half as far down the upper arm.
    close(short[2].joint.y, -125);
  });

  test("a part's ink twin follows the image it is shown with", () => {
    const frame = (x: number) => ({
      x,
      y: 0,
      w: 4,
      h: 4,
      pivot: { x: 2, y: 2 },
    });
    const face: RigFacingData = {
      bounds: { x: 0, y: 0, w: 0, h: 0 },
      parts: [
        {
          id: "torso",
          parent: null,
          z: 0,
          attach: { x: 0, y: 0 },
          frame: frame(0),
          variants: {
            ink: frame(10),
            wide: frame(20),
            "wide-ink": frame(30),
            blink: frame(40),
          },
        },
      ],
    };
    const at = (v?: string) =>
      solveRig(face, { ...REST_POSE, variants: v ? { torso: v } : {} })[0];
    expect(at().ink?.x).toBe(10);
    expect(at("wide").frame.x).toBe(20);
    expect(at("wide").ink?.x).toBe(30);
    // The blink has no detail of its own, and must not borrow the rest one.
    expect(at("blink").ink).toBeUndefined();
  });

  test("variants swap the image on the same joint", () => {
    const placed = solveRig(ARM, {
      ...REST_POSE,
      variants: { "forearm-r": "pointing" },
    });
    expect(placed[2].frame.x).toBe(70);
    const missing = solveRig(ARM, {
      ...REST_POSE,
      variants: { "forearm-r": "nope" },
    });
    expect(missing[2].frame.x).toBe(50);
  });

  test("the placeholder's rest pose stands on the feet, 72 px tall", () => {
    expect(rig.figureHeight).toBe(72);
    for (const facing of ["side", "front", "back"] as const) {
      const shins = placeRig(rig, facing, REST_POSE).filter((p) =>
        p.id.startsWith("shin"),
      );
      for (const s of shins) close(heelOf(s).y, 0);
    }
  });
});

describe("pose interpolation", () => {
  test("Catmull-Rom passes through its keys", () => {
    const pts = [
      [0, 0],
      [1, 10],
      [2, 20],
      [3, 30],
    ] as const;
    close(catmullRom(1, ...pts), 10);
    close(catmullRom(2, ...pts), 20);
    close(catmullRom(1.5, ...pts), 15);
  });

  const loop: PoseClip = {
    facing: "side",
    loop: true,
    timing: { ms: 1000 },
    keys: [
      { at: 0, angles: { head: 0 } },
      { at: 0.5, angles: { head: 10 }, root: { y: -2 } },
    ],
  };

  test("a loop hits its keys and wraps smoothly", () => {
    close(sampleClip(loop, 0).angles.head ?? NaN, 0);
    close(sampleClip(loop, 0.5).angles.head ?? NaN, 10);
    close(sampleClip(loop, 1).angles.head ?? NaN, 0);
    close(sampleClip(loop, 1.5).angles.head ?? NaN, 10);
    close(sampleClip(loop, 0.5).root.y, -2);
    // Symmetric keys: a smooth wave through the midpoints.
    close(sampleClip(loop, 0.25).angles.head ?? NaN, 5, 1e-6);
    // Continuous across the wrap.
    const a = sampleClip(loop, 0.999).angles.head ?? NaN;
    const b = sampleClip(loop, 0.001).angles.head ?? NaN;
    expect(Math.abs(a - b)).toBeLessThan(0.05);
  });

  test("a one-shot eases out and in, and holds its ends", () => {
    const reach: PoseClip = {
      facing: "side",
      loop: false,
      timing: { ms: 150 },
      keys: [{ at: 0 }, { at: 1, angles: { "upper-arm-r": 80 } }],
    };
    const v = (p: number) => sampleClip(reach, p).angles["upper-arm-r"] ?? NaN;
    close(v(0), 0);
    close(v(1), 80);
    close(v(2), 80);
    close(v(-1), 0);
    close(v(0.5), 40);
    // Eased: slow at the ends, fast in the middle.
    expect(v(0.1)).toBeLessThan(8);
    expect(v(0.9)).toBeGreaterThan(72);
  });

  test("blending mixes two poses", () => {
    const a = sampleClip(loop, 0);
    const b = sampleClip(loop, 0.5);
    const mid = blendPoses(a, b, 0.5);
    close(mid.angles.head ?? NaN, 5);
    close(mid.root.y, -1);
  });

  test("every clip is well formed", () => {
    for (const [name, clip] of Object.entries(POSE_CLIPS) as [
      ClipName,
      PoseClip,
    ][]) {
      const ats = clip.keys.map((k) => k.at);
      expect(ats, name).toEqual([...ats].sort((x, y) => x - y));
      expect(ats[0], name).toBe(0);
      expect(Math.max(...ats), name).toBeLessThanOrEqual(1);
      if (clip.loop) expect(Math.max(...ats), name).toBeLessThan(1);
    }
    expect(POSE_CLIPS["walk-side"].facing).toBe("side");
    expect(POSE_CLIPS["use-n"].facing).toBe("back");
  });
});

describe("walking without sliding", () => {
  const clip = POSE_CLIPS["walk-side"];
  const heelOnFloor = (phase: number, shin: "shin-l" | "shin-r") => {
    const pose = poseFor(rig, clip, sampleClip(clip, phase), {}, phase);
    const part = placeRig(rig, "side", pose).find((p) => p.id === shin);
    if (!part) throw new Error("no shin");
    // The body moves on by one stride per cycle.
    return phase * rig.stride + heelOf(part).x / rig.density;
  };

  test("the stride is measured from the rig", () => {
    expect(rig.stride).toBeGreaterThan(40);
    expect(rig.stride).toBeLessThan(80);
  });

  test("the planted heel stays put through its stance", () => {
    for (const [shin, from] of [
      ["shin-r", 0],
      ["shin-l", 0.5],
    ] as const) {
      const start = heelOnFloor(from, shin);
      for (let i = 1; i < 20; i++) {
        const p = from + (i / 20) * 0.5;
        close(heelOnFloor(p, shin), start, 1e-6);
      }
    }
  });

  test("the lowest sole is always on the ground", () => {
    for (let i = 0; i < 32; i++) {
      const p = i / 32;
      const pose = poseFor(rig, clip, sampleClip(clip, p), {}, p);
      const soles = placeRig(rig, "side", pose)
        .filter((x) => x.id.startsWith("shin"))
        .flatMap((s) => [heelOf(s).y]);
      expect(Math.max(...soles)).toBeLessThanOrEqual(1e-6);
    }
  });
});

const input = (over: Partial<AnimInput> = {}): AnimInput => ({
  moving: false,
  distance: 0,
  scale: 1,
  facing: "e",
  talking: false,
  ...over,
});

describe("rig animator", () => {
  test("picks each facing's walk, and mirrors west", () => {
    const a = new RigAnimator(rig, () => 0.5);
    a.update(16, input({ moving: true, distance: 1 }));
    expect(a.state()).toMatchObject({
      clip: "walk-side",
      facing: "side",
      mirror: false,
    });
    a.update(16, input({ moving: true, distance: 1, facing: "w" }));
    expect(a.state()).toMatchObject({ facing: "side", mirror: true });
    a.update(16, input({ moving: true, distance: 1, facing: "s" }));
    expect(a.state()).toMatchObject({ clip: "walk-front", facing: "front" });
    a.update(16, input({ moving: true, distance: 1, facing: "n" }));
    expect(a.state()).toMatchObject({ clip: "walk-back", facing: "back" });
    a.update(16, input({ facing: "n" }));
    expect(a.state().clip).toBe("idle-back");
  });

  test("a foot lands twice a stride, by distance, at any frame rate", () => {
    const count = (steps: number) => {
      const a = new RigAnimator(rig, () => 0.5);
      let feet = 0;
      const d = (rig.stride * 3) / steps;
      for (let i = 0; i < steps; i++) {
        if (a.update(16, input({ moving: true, distance: d }))) feet++;
      }
      return feet;
    };
    // Three strides: six footfalls less the one at the very start.
    expect(count(60)).toBe(5);
    expect(count(600)).toBe(5);
  });

  test("the cycle scales with depth, so small feet take small steps", () => {
    const a = new RigAnimator(rig, () => 0.5);
    let feet = 0;
    for (let i = 0; i < 300; i++) {
      const d = (rig.stride * 3 * 0.8) / 300;
      if (a.update(16, input({ moving: true, distance: d, scale: 0.8 })))
        feet++;
    }
    expect(feet).toBe(5);
  });

  test("use reaches, holds, and returns", () => {
    const a = new RigAnimator(rig, () => 0.5);
    a.startUse();
    a.update(75, input());
    expect(a.state().clip).toBe("use-e");
    const half = a.state().pose.angles["upper-arm-r"] ?? 0;
    a.update(100, input());
    a.update(1000, input());
    const held = a.state().pose.angles["upper-arm-r"] ?? 0;
    expect(held).toBeGreaterThan(half);
    expect(a.using).toBe(true);
    a.releaseUse();
    a.update(200, input());
    expect(a.using).toBe(false);
    const b = new RigAnimator(rig, () => 0.5);
    b.startUse();
    b.update(16, input({ facing: "n" }));
    expect(b.state()).toMatchObject({ clip: "use-n", facing: "back" });
  });

  test("blinks for 120 ms every 2-4 s", () => {
    const a = new RigAnimator(rig, () => 0.5);
    const heads: (string | undefined)[] = [];
    for (let t = 0; t < 3500; t += 20) {
      a.update(20, input());
      heads.push(a.state().pose.variants.head);
    }
    const blinks = heads.filter((h) => h === "blink").length;
    expect(blinks).toBeGreaterThanOrEqual(5);
    expect(blinks).toBeLessThanOrEqual(7);
    expect(heads.slice(0, 140).includes("blink")).toBe(false);
  });

  test("talks with mouth shapes timed to the line, over a talking body", () => {
    const a = new RigAnimator(rig, () => 0.5);
    a.update(
      16,
      input({ talking: true, speech: { text: "Hello", elapsedMs: 0 } }),
    );
    expect(a.state().clip).toBe("talk-side");
    // "H" is a consonant: half open.
    expect(a.state().pose.variants.head).toBe("talk-3");
    a.update(
      16,
      input({ talking: true, speech: { text: "Hello", elapsedMs: 220 } }),
    );
    // Two shapes later: "o".
    expect(a.state().pose.variants.head).toBe("talk-2");
  });
});

describe("drawing on the pixel grid", () => {
  test("edges are hard: alpha is 0 or 255", () => {
    const px = new Uint8ClampedArray([
      10, 20, 30, 0, 10, 20, 30, 90, 10, 20, 30, 128, 10, 20, 30, 250,
    ]);
    hardenAlpha(px);
    expect([px[3], px[7], px[11], px[15]]).toEqual([0, 0, 255, 255]);
    // Colour is kept.
    expect([px[12], px[13], px[14]]).toEqual([10, 20, 30]);
  });
});

describe("mouth shapes", () => {
  const mouths = ["talk-1", "talk-2", "talk-3"];
  test("follow the letters at the speaking rate", () => {
    expect(mouthFor("Map", 0, mouths)).toBeNull(); // m: closed
    expect(mouthFor("Map", 110, mouths)).toBeNull(); // p (two letters on)
    expect(mouthFor("Aha", 0, mouths)).toBe("talk-1");
    expect(mouthFor("Oh", 0, mouths)).toBe("talk-2");
    expect(mouthFor("Hi there", 110, mouths)).toBeNull(); // the space
    expect(mouthFor("Hi", 5000, mouths)).toBeNull(); // the line is over
  });

  test("use the nearest shape a rig has, or none", () => {
    expect(mouthFor("Oh", 0, ["talk-1"])).toBe("talk-1");
    expect(mouthFor("Hello", 0, ["talk-1", "talk-2"])).toBe("talk-2");
    expect(mouthFor("Aha", 0, [])).toBeNull();
  });
});

describe("the engine with a rig", () => {
  const hd: SceneData = {
    ...SCENES.zurich,
    depth: { farY: 101, nearY: 158, ...HD_WORLD_SCALE },
  };
  const make = (rigFor: (s: SceneData) => boolean) =>
    new SceneEngine({
      scenes: { ...SCENES, zurich: hd },
      travelMap: TRAVEL_MAP_DATA,
      sheet: CHARACTER_SHEET,
      rig,
      rigFor,
      host: { openSection: vi.fn(), sceneChanged: vi.fn() },
      start: "zurich",
    });

  test("draws the rig in HD scenes, at the world scale", () => {
    const engine = make((s) => s.id === "zurich");
    const f = engine.figure();
    expect(f.kind).toBe("rig");
    // fromHall, y 112: 58 + 14 * 11/57 = 60.7 px tall.
    expect(f.scale * rig.figureHeight).toBeCloseTo(60.7, 1);
  });

  test("by default, draws the rig only in scenes at the world scale", () => {
    // London stands in for a scene still on the pixel-art scales, whichever
    // scenes the HB tasks have rebuilt so far.
    const pixel: SceneData = {
      ...SCENES.london,
      depth: { farY: 106, nearY: 158, farScale: 0.7, nearScale: 1 },
    };
    const engine = new SceneEngine({
      scenes: { ...SCENES, zurich: hd, london: pixel },
      travelMap: TRAVEL_MAP_DATA,
      sheet: CHARACTER_SHEET,
      rig,
      host: { openSection: vi.fn(), sceneChanged: vi.fn() },
      start: "zurich",
    });
    expect(engine.figure().kind).toBe("rig");
    engine.jumpTo("london");
    expect(engine.figure().kind).toBe("sheet");
  });

  test("keeps the sprite sheet elsewhere, and without a rig", () => {
    expect(make(() => false).figure().kind).toBe("sheet");
    const plain = new SceneEngine({
      scenes: SCENES,
      travelMap: TRAVEL_MAP_DATA,
      sheet: CHARACTER_SHEET,
      host: { openSection: vi.fn(), sceneChanged: vi.fn() },
    });
    expect(plain.figure().kind).toBe("sheet");
  });

  test("feeds the spoken line to the rig's mouth", () => {
    const engine = make(() => true);
    engine.look({
      kind: "object",
      object: SCENES.zurich.objects.find((object) => object.id === "window")!,
    });
    engine.update(16);
    const f = engine.figure();
    if (f.kind !== "rig") throw new Error("expected the rig");
    expect(f.state.pose.variants.head).toMatch(/^talk-\d$/);
  });
});

describe("the shipped rig (HB7)", () => {
  const json = Object.values(
    import.meta.glob<unknown>("../../assets/character/daniele-rig.json", {
      eager: true,
      import: "default",
    }),
  )[0];
  const shipped = parseRig(json, "daniele-rig.png");

  test("retains portrait detail at density 4, 72 logical px tall in every facing", () => {
    expect(shipped.density).toBe(4);
    expect(shipped.figureHeight).toBe(72);
    for (const facing of ["side", "front", "back"] as const)
      expect(shipped.facings[facing].bounds.h).toBe(288);
  });

  test("has the mouth shapes and the blink the animator uses", () => {
    expect(shipped.mouths).toEqual(["talk-1", "talk-2", "talk-3"]);
    expect(shipped.blinks).toBe(true);
    // Both visible faces carry the painted expressions themselves; stale
    // ink-only overlays from the previous design must not cover the new face.
    for (const facing of ["front", "side"] as const) {
      const head = shipped.facings[facing].parts.find((p) => p.id === "head");
      expect(Object.keys(head?.variants ?? {}).sort()).toEqual([
        "blink",
        "talk-1",
        "talk-2",
        "talk-3",
      ]);
    }
  });

  test("the walk keeps the planted heel still and the soles on the ground", () => {
    const clip = POSE_CLIPS["walk-side"];
    const heel = (phase: number) => {
      const pose = poseFor(shipped, clip, sampleClip(clip, phase), {}, phase);
      const part = placeRig(shipped, "side", pose).find(
        (p) => p.id === "shin-r",
      );
      if (!part) throw new Error("no shin");
      return phase * shipped.stride + heelOf(part).x / shipped.density;
    };
    const start = heel(0);
    for (let i = 1; i < 20; i++) close(heel((i / 20) * 0.5), start, 1e-6);
    for (let i = 0; i < 32; i++) {
      const pose = poseFor(shipped, clip, sampleClip(clip, i / 32), {}, i / 32);
      const lowest = Math.max(
        ...placeRig(shipped, "side", pose)
          .filter((x) => x.id.startsWith("shin"))
          .map((s) => heelOf(s).y),
      );
      expect(lowest).toBeLessThanOrEqual(1e-6);
    }
  });
});
