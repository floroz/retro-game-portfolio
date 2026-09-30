import type { SceneData, TravelMapData } from "./types";

const originals = import.meta.glob<string>(
  ["../assets/scenes/**/*.png", "../assets/shared/**/*.png"],
  { eager: true, query: "?url", import: "default" },
);
const remastered = import.meta.glob<string>("../assets/remaster/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const replacements = new Map(
  Object.entries(originals).flatMap(([path, url]) => {
    const target = path.includes("/scenes/")
      ? path.replace("/scenes/", "/remaster/")
      : path.replace("/shared/", "/remaster/shared/");
    const replacement = remastered[target];
    return replacement ? [[url, replacement] as const] : [];
  }),
);

/** Select the recovered source export without changing its logical footprint. */
export const remasterArtwork = (url: string): string =>
  replacements.get(url) ?? url;

function remasterStates(states: Record<string, string> | undefined) {
  return (
    states &&
    Object.fromEntries(
      Object.entries(states).map(([state, url]) => [
        state,
        remasterArtwork(url),
      ]),
    )
  );
}

/** Geometry, interaction points, timing, content and sound remain shared with V2. */
export function remasterScene(scene: SceneData): SceneData {
  return {
    ...scene,
    background: remasterArtwork(scene.background),
    foreground: scene.foreground && remasterArtwork(scene.foreground),
    objects: scene.objects.map((object) => ({
      ...object,
      sprite: object.sprite && remasterArtwork(object.sprite),
      states: remasterStates(object.states),
    })),
    exits: scene.exits.map((exit) => ({
      ...exit,
      sprite: exit.sprite && remasterArtwork(exit.sprite),
      states: remasterStates(exit.states),
    })),
    animations: scene.animations?.map((animation) => ({
      ...animation,
      strip: remasterArtwork(animation.strip),
    })),
    props: scene.props?.map((prop) => ({
      ...prop,
      sprite: remasterArtwork(prop.sprite),
    })),
  };
}

export function remasterMap(map: TravelMapData): TravelMapData {
  return {
    ...map,
    background: remasterArtwork(map.background),
    marker: map.marker && remasterArtwork(map.marker),
    plane: map.plane && {
      ...map.plane,
      strip: remasterArtwork(map.plane.strip),
    },
  };
}
