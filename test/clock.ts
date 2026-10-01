import type { Page } from "@playwright/test";

/**
 * Settle scene movement without drawing every intermediate 60 Hz frame.
 * fastForward fires the pending RAF once; SceneEngine accepts at most 100 ms
 * per update, so every step stays within that bound. The real frame loop still
 * drives walking, transitions and queued interactions. Keep runFor for tests
 * that sample animation itself.
 */
export async function advanceScene(page: Page, milliseconds: number) {
  for (let elapsed = 0; elapsed < milliseconds; elapsed += 100) {
    await page.clock.fastForward(Math.min(100, milliseconds - elapsed));
  }
}
