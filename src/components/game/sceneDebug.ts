/** True under `npm run dev` with `?debug=scene` in the URL. */
export const SCENE_DEBUG =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debug") === "scene";
