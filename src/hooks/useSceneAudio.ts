import { useEffect } from "react";
import { sceneAudio } from "../engine/runtime";
import { SCENES } from "../engine/scenes";
import { useGameStore } from "../store/gameStore";

/**
 * Plays the current scene's music and ambience, and the engine's effects,
 * while the sound toggle is on. Replaces v1's single theme.mp3 loop.
 */
export function useSceneAudio({ enabled = true }: { enabled?: boolean } = {}) {
  useEffect(() => {
    if (!enabled) return;
    const apply = (state: ReturnType<typeof useGameStore.getState>) => {
      const scene = SCENES[state.currentScene];
      sceneAudio.setTracks(scene.music, scene.ambience);
      sceneAudio.setEnabled(state.soundEnabled && state.welcomeShown);
    };
    apply(useGameStore.getState());
    // Subscribing (rather than an effect on soundEnabled) keeps the resume
    // inside the click that turned sound on, which autoplay rules require.
    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (
        state.soundEnabled !== prev.soundEnabled ||
        state.welcomeShown !== prev.welcomeShown ||
        state.currentScene !== prev.currentScene
      ) {
        apply(state);
      }
    });
    return () => {
      unsubscribe();
      sceneAudio.setEnabled(false);
    };
  }, [enabled]);
}
