import { useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";

interface UseBackgroundMusicOptions {
  /** Whether background music is enabled for the current context (default: true) */
  enabled?: boolean;
}

/**
 * Background music hook that plays theme.mp3 in a loop
 * Respects user's sound preference from store
 * Can be disabled per-context (e.g. mobile uses retro SFX instead)
 */
export function useBackgroundMusic({
  enabled = true,
}: UseBackgroundMusicOptions = {}) {
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Skip if disabled for this context (e.g. mobile)
    if (!enabled) return;

    // Check for prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Create audio element once
    if (!audioRef.current) {
      audioRef.current = new Audio("/theme.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3; // Background music should be quieter than SFX
      audioRef.current.preload = "auto";
    }

    const audio = audioRef.current;

    // Play/pause based on sound setting
    if (soundEnabled && !hasStartedRef.current) {
      // Start playback when sound is enabled
      // Note: This might fail if user hasn't interacted with the page yet
      // That's why we also have the interaction handler below
      audio
        .play()
        .then(() => {
          hasStartedRef.current = true;
        })
        .catch(() => {
          // Autoplay failed, will be handled by user interaction
        });
    } else if (!soundEnabled && hasStartedRef.current) {
      audio.pause();
      hasStartedRef.current = false;
    }

    // Handle user interaction to start audio
    // Required for browsers that block autoplay
    const startOnInteraction = () => {
      if (soundEnabled && !hasStartedRef.current) {
        audio
          .play()
          .then(() => {
            hasStartedRef.current = true;
          })
          .catch(() => {
            // Ignore if playback fails
          });
      }
    };

    // Listen for first user interaction
    if (soundEnabled && !hasStartedRef.current) {
      window.addEventListener("click", startOnInteraction, { once: true });
      window.addEventListener("keydown", startOnInteraction, { once: true });
      window.addEventListener("touchstart", startOnInteraction, { once: true });
    }

    return () => {
      window.removeEventListener("click", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
      window.removeEventListener("touchstart", startOnInteraction);
    };
  }, [soundEnabled, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
}
