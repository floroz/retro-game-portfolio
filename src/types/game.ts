/**
 * Core game types for the Day of the Tentacle inspired portfolio.
 * Scene data types live in src/engine/types.ts.
 */
import type { SectionId } from "../engine/types";

/** Something the toolbar or a hotspot can open: a section, or the dialog. */
export type ActionType = SectionId | "talk";

/** Terminal command action types */
type TerminalAction =
  | "showHelp"
  | "openDialog"
  | "downloadResume"
  | "clearTerminal"
  | "listSections"
  | "showAbout"
  | "showExperience"
  | "showSkills"
  | "showContact"
  | "showWhoami"
  | "showSudoJoke"
  | "showMatrixEffect"
  | "travel"
  | "closeTerminal";

export interface TerminalCommand {
  description: string;
  action: TerminalAction;
  payload?: ActionType | string;
  hidden?: boolean;
}

export type TerminalCommands = Record<string, TerminalCommand>;

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

/** Terminal output line types for mobile */
export interface TerminalLine {
  type:
    | "input" // User typed command/input
    | "output" // Command output
    | "error" // Error messages
    | "dialog-agent" // Agent dialog message
    | "dialog-options"; // Dialog option list

  content: string;

  metadata?: {
    speaker?: DialogSpeaker;
    options?: DialogOption[];
    /** The id of the option the user selected (only for dialog-options lines) */
    selectedOptionId?: string;
    timestamp?: number;
  };
}
