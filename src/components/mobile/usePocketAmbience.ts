import { useEffect, useRef, useState } from "react";
import { SceneAudio } from "../../engine/audio";
import { SORRENTO_SCENE } from "../../config/scenes/sorrento";

/**
 * The desktop Sorrento kitchen's music and ambience. No audio context or
 * download until the visitor explicitly switches sound on.
 */
export function usePocketAmbience(active: boolean) {
  const audio = useRef<SceneAudio | null>(null);
  const [enabled, setEnabled] = useState(false);
  function toggle() {
    const next = !enabled;
    if (next && !audio.current) {
      audio.current = new SceneAudio();
      audio.current.setTracks(SORRENTO_SCENE.music, SORRENTO_SCENE.ambience);
    }
    // Resume inside the user gesture for mobile Safari.
    audio.current?.setEnabled(next && active && !document.hidden);
    setEnabled(next);
  }
  useEffect(() => {
    const sync = () =>
      audio.current?.setEnabled(enabled && active && !document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      audio.current?.setEnabled(false);
    };
  }, [active, enabled]);
  return { enabled, toggle };
}
