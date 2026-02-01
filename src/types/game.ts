/**
 * Core game types for the Day of the Tentacle inspired portfolio
 */

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Direction = "left" | "right";

export type CharacterState = "idle" | "walking" | "interacting";

export type ActionType =
  | "experience"
  | "projects"
  | "skills"
  | "about"
  | "contact"
  | "resume"
  | "talk";

export interface InteractiveObjectConfig {
  id: string;
  position: Position;
  size: Size;
  action: ActionType;
  label: string;
  /** Interaction point - where character should walk to */
  interactionPoint: Position;
}

export interface WalkableArea {
  minY: number;
  maxY: number;
  minX: number;
  maxX: number;
}

export interface SceneConfig {
  width: number;
  height: number;
  characterStart: Position;
  walkableArea: WalkableArea;
  objects: InteractiveObjectConfig[];
}

/** Terminal command action types */
type TerminalAction =
  | "showHelp"
  | "openModal"
  | "openDialog"
  | "downloadResume"
  | "clearTerminal"
  | "listSections"
  | "navigate"
  | "showWhoami"
  | "showSudoJoke"
  | "showMatrixEffect"
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
