/** This preference survives reloads; the adventure itself always starts fresh. */
export const CONTROLS_SEEN_KEY = "retro-adventure:controls-seen:v1";

export function hasSeenControls(): boolean {
  try {
    return localStorage.getItem(CONTROLS_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberControls(): void {
  try {
    localStorage.setItem(CONTROLS_SEEN_KEY, "1");
  } catch {
    // Restricted storage must never prevent the visitor from playing.
  }
}
