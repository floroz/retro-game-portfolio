import { useEffect } from "react";
import { getEngine } from "../engine/runtime";
import { useGameStore } from "../store/gameStore";

type Dir = "left" | "right" | "up" | "down";

const KEYS: Record<string, Dir> = {
  ArrowLeft: "left",
  a: "left",
  ArrowRight: "right",
  d: "right",
  ArrowUp: "up",
  w: "up",
  ArrowDown: "down",
  s: "down",
};

/**
 * Arrow keys (and WASD) walk Daniele while held; Escape stops him or skips
 * a running trip. Ignored while typing, or while another window has focus.
 */
export function useSceneKeyboard() {
  const gameWindowActive = useGameStore((s) => s.gameWindowActive);
  useEffect(() => {
    if (!gameWindowActive) return;
    const held = new Set<Dir>();
    const push = () => {
      const dx = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0);
      const dy = (held.has("down") ? 1 : 0) - (held.has("up") ? 1 : 0);
      getEngine().setKeyboard(dx, dy);
    };
    const blocked = (e: KeyboardEvent) => {
      const s = useGameStore.getState();
      return (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        s.contentSection !== null ||
        s.inspection !== null ||
        s.dialogOpen ||
        !s.gameWindowActive
      );
    };
    const onDown = (e: KeyboardEvent) => {
      if (blocked(e)) return;
      if (e.key === "Escape") {
        getEngine().stop();
        return;
      }
      const dir = KEYS[e.key];
      if (!dir || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      held.add(dir);
      push();
    };
    const onUp = (e: KeyboardEvent) => {
      const dir = KEYS[e.key];
      if (!dir || !held.has(dir)) return;
      held.delete(dir);
      push();
    };
    const onBlur = () => {
      held.clear();
      push();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      held.clear();
      getEngine().setKeyboard(0, 0);
    };
  }, [gameWindowActive]);
}
