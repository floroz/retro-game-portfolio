import { useEffect, useRef, useState } from "react";
import { SceneAudio } from "../../engine/audio";

/** No audio context or download until the visitor explicitly switches sound on. */
export function usePocketAmbience(active: boolean) {
  const audio = useRef<SceneAudio | null>(null);
  const [enabled, setEnabled] = useState(false);
  function toggle() {
    const next = !enabled;
    if (next && !audio.current) {
      audio.current = new SceneAudio();
      audio.current.setTracks(undefined, {
        src: "/audio/ambience/sorrento.mp3",
        loopStart: 0.5,
        loopEnd: 36.5,
      });
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
    const timer = window.setInterval(() => {
      if (enabled && active && !document.hidden)
        audio.current?.play("moka-gurgle");
    }, 18000);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      audio.current?.setEnabled(false);
    };
  }, [active, enabled]);
  return { enabled, toggle };
}
