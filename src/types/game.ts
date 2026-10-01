/**
 * Core game types for the Day of the Tentacle inspired portfolio.
 * Scene data types live in src/engine/types.ts.
 */
import type { SectionId } from "../engine/types";

/** Something the toolbar or a hotspot can open: a section, or the dialog. */
export type ActionType = SectionId | "talk";

/** Dialog system types */
export type DialogSpeaker = "daniele" | "narrator";

export interface DialogOption {
  id: string;
  label: string;
  nextNode: string;
}

export interface DialogNode {
  speaker: DialogSpeaker;
  text: string;
  options?: DialogOption[];
  autoAdvance?: string; // Next node ID for linear dialog
}
