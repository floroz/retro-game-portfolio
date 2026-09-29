/**
 * Dev-only HD preview (docs/art-spec.md, "Phase H: HD hand-painted"). Under
 * `npm run dev`, `?hd=<scene>` swaps that scene's art for the density-4
 * stand-ins made by `npm run dev:hd-placeholder -- <scene>` in `dev-hd/`,
 * so the HD engine can be checked on a real scene before the HD art exists.
 * The scene data is otherwise unchanged. Production builds never read it.
 */
import type { SceneData, SceneId } from "../types";

/** The scene to preview in HD, from `?hd=<scene>`, under `npm run dev` only. */
export const HD_PREVIEW: string | null =
  import.meta.env.DEV && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("hd")
    : null;

/** `/src/assets/scenes/zurich/bg.png?v=1` to `/dev-hd/zurich/bg.png`. */
function standIn(scene: SceneId, url: string): string {
  const file = url.split("?")[0].split("/").pop() ?? url;
  return `/dev-hd/${scene}/${file}`;
}

/** `scene` with every image of its own replaced by its HD stand-in. */
export function hdPreviewScene(scene: SceneData): SceneData {
  const hd = (url: string) => standIn(scene.id, url);
  const states = (s?: Record<string, string>) =>
    s && Object.fromEntries(Object.entries(s).map(([k, url]) => [k, hd(url)]));
  return {
    ...scene,
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
