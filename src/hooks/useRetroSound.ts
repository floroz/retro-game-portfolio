import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";

/**
 * Audio context singleton shared across the app.
 * Reuse existing one from useDialogSound if available.
 */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioContext) {
    try {
      audioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
    } catch {
      console.warn("Web Audio API not supported");
      return null;
    }
  }
  return audioContext;
}

/** Check if reduced motion is preferred */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface UseRetroSoundReturn {
  /** Play the Game Boy boot startup sound (mp3) */
  playBootChime: () => void;
  /** Play a short tap/click feedback blip */
  playTapSound: () => void;
  /** Play a confirm sound (entering a section) */
  playConfirmSound: () => void;
  /** Play a back/cancel sound */
  playBackSound: () => void;
}

/**
 * Sound effects hook for the RetroPlay Game Boy console.
 * Boot chime uses the original Game Boy startup mp3.
 * UI sounds are synthesized via Web Audio API.
 * Respects soundEnabled from store and prefers-reduced-motion.
 */
export function useRetroSound(): UseRetroSoundReturn {
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const contextResumedRef = useRef(false);
  const bootAudioRef = useRef<HTMLAudioElement | null>(null);

  // Resume audio context on first user interaction
  useEffect(() => {
    if (contextResumedRef.current) return;

    const resumeContext = () => {
      const ctx = getAudioContext();
      if (ctx?.state === "suspended") {
        ctx.resume();
      }
      contextResumedRef.current = true;
    };

    window.addEventListener("click", resumeContext, { once: true });
    window.addEventListener("touchstart", resumeContext, { once: true });
    window.addEventListener("keydown", resumeContext, { once: true });

    return () => {
      window.removeEventListener("click", resumeContext);
      window.removeEventListener("touchstart", resumeContext);
      window.removeEventListener("keydown", resumeContext);
    };
  }, []);

  // Preload the boot startup sound
  useEffect(() => {
    const audio = new Audio("/nintendo-game-boy-startup.mp3");
    audio.preload = "auto";
    audio.volume = 0.5;
    bootAudioRef.current = audio;

    return () => {
      audio.pause();
      bootAudioRef.current = null;
    };
  }, []);

  /**
   * Play the original Game Boy startup sound from mp3.
   */
  const playBootChime = useCallback(() => {
    if (!soundEnabled || prefersReducedMotion()) return;

    const audio = bootAudioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay may be blocked; ignore
    });
  }, [soundEnabled]);

  /**
   * Short tap/click blip for menu navigation and scrolling.
   * Square wave at 880Hz, very short duration.
   */
  const playTapSound = useCallback(() => {
    if (!soundEnabled || prefersReducedMotion()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "square";
      osc.frequency.setValueAtTime(880, now); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore audio errors
    }
  }, [soundEnabled]);

  /**
   * Confirm sound for entering a section.
   * Two-tone ascending beep: C5 -> E5.
   */
  const playConfirmSound = useCallback(() => {
    if (!soundEnabled || prefersReducedMotion()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // First tone (C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "square";
      osc1.frequency.value = 523;
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.linearRampToValueAtTime(0, now + 0.06);
      osc1.start(now);
      osc1.stop(now + 0.06);

      // Second tone (E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "square";
      osc2.frequency.value = 659;
      gain2.gain.setValueAtTime(0.08, now + 0.05);
      gain2.gain.linearRampToValueAtTime(0, now + 0.12);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.12);
    } catch {
      // Ignore audio errors
    }
  }, [soundEnabled]);

  /**
   * Back/cancel sound — descending tone.
   * Single note at E4 with quick decay.
   */
  const playBackSound = useCallback(() => {
    if (!soundEnabled || prefersReducedMotion()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "square";
      osc.frequency.setValueAtTime(523, now); // C5
      osc.frequency.linearRampToValueAtTime(330, now + 0.08); // slide down to E4

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore audio errors
    }
  }, [soundEnabled]);

  return {
    playBootChime,
    playTapSound,
    playConfirmSound,
    playBackSound,
  };
}
