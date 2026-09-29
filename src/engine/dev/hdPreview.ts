/**
 * Dev-only Phase H preview (docs/art-spec.md, "Phase H"). Under `npm run
 * dev`, `?hd=<scene>` gives that scene the Phase H world scale
 * (`HD_WORLD_SCALE`), as the HB builds will, so Daniele is drawn as the
 * cut-out rig at 72 px on the scene's current 640x320 art (add
 * `&rig=placeholder` for the rectangle rig before HB7 packs the real one).
 *
 * `&smooth` also swaps the art for the density-4 stand-ins made by `npm run
 * dev:hd-placeholder -- <scene>` in `dev-hd/`, for the density-4 smooth
 * path, which Phase H no longer uses. Production builds never read it.
 */
import { HD_WORLD_SCALE } from "../constants";
import type { SceneData, SceneId } from "../types";

const params =
  import.meta.env.DEV && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;

/** The scene to preview, from `?hd=<scene>`, under `npm run dev` only. */
export const HD_PREVIEW: string | null = params?.get("hd") ?? null;

/** `&smooth`: also swap in the density-4 stand-in art. */
const SMOOTH = params?.has("smooth") ?? false;

/** `/src/assets/scenes/zurich/bg.png?v=1` to `/dev-hd/zurich/bg.png`. */
function standIn(scene: SceneId, url: string): string {
  const file = url.split("?")[0].split("/").pop() ?? url;
  return `/dev-hd/${scene}/${file}`;
}

/**
 * `scene` at the Phase H world scale, and with `smooth`, every image of its
 * own replaced by its density-4 stand-in.
 */
export function hdPreviewScene(scene: SceneData, smooth = SMOOTH): SceneData {
  const scaled = { ...scene, depth: { ...scene.depth, ...HD_WORLD_SCALE } };
  if (!smooth) return scaled;
  const hd = (url: string) => standIn(scene.id, url);
  const states = (s?: Record<string, string>) =>
    s && Object.fromEntries(Object.entries(s).map(([k, url]) => [k, hd(url)]));
  return {
    ...scaled,
    background: hd(scene.background),
    foreground: scene.foreground && hd(scene.foreground),
    objects: scene.objects.map((o) => ({
      ...o,
      sprite: o.sprite && hd(o.sprite),
      states: states(o.states),
    })),
    exits: scene.exits.map((e) => ({
      ...e,
      sprite: e.sprite && hd(e.sprite),
      states: states(e.states),
    })),
    animations: scene.animations?.map((a) => ({ ...a, strip: hd(a.strip) })),
  };
}
