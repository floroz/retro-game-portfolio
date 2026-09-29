import { create } from "zustand";
import type { ActionType } from "../types/game";
import type { SceneId, SectionId } from "../engine/types";
import { DIALOG_TREE } from "../config/dialogTrees";

/**
 * A trip for the scene engine to run. The toolbar and the terminal post
 * requests here; the mounted scene takes them (see `takeSceneRequest`).
 */
type SceneRequest =
  | { id: number; kind: "section"; section: SectionId }
  | { id: number; kind: "travel"; scene: SceneId };

interface GameState {
  // World state. Daniele's position and animation live in the scene engine
  // (src/engine/SceneEngine.ts), which runs every frame outside React.
  currentScene: SceneId;
  sceneRequest: SceneRequest | null;
  /** A trip or the travel map is playing, and a click skips it. */
  skippable: boolean;

  // Interaction state
  /** Status-line text for whatever the pointer is over. */
  hoveredObject: string | null;
  terminalScreenAction: ActionType | null;
  terminalOpen: boolean;
  gameWindowActive: boolean; // Track if game window is active in Win95 desktop

  // Dialog state
  welcomeShown: boolean;
  dialogOpen: boolean;
  dialogNode: string;
  visitedNodes: Set<string>;
  soundEnabled: boolean;

  // World actions
  setCurrentScene: (scene: SceneId) => void;
  /** Toolbar and terminal shortcut: walk, fly, and open a section. */
  goToSection: (section: SectionId) => void;
  /** Fly to a scene without opening anything (terminal `fly`). */
  travelTo: (scene: SceneId) => void;
  /** Returns the pending request, if any, and clears it. */
  takeSceneRequest: () => SceneRequest | null;

  // Interaction actions
  setHoveredObject: (id: string | null) => void;
  openTerminalScreen: (action: ActionType) => void;
  closeTerminalScreen: () => void;
  toggleTerminal: () => void;
  closeTerminal: () => void;
  setGameWindowActive: (active: boolean) => void;

  // Dialog actions
  dismissWelcome: () => void;
  openDialog: (startNode?: string) => void;
  closeDialog: () => void;
  selectDialogOption: (nodeId: string) => void;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
}

let requestId = 0;

// Always show welcome on each page load (no persistence)

export const useGameStore = create<GameState>((set, get) => ({
  currentScene: "hall",
  sceneRequest: null,
  skippable: false,

  // Initial interaction state
  hoveredObject: null,
  terminalScreenAction: null,
  terminalOpen: true, // Always start in Win95 Desktop mode
  gameWindowActive: true, // Game window is active by default

  // Initial dialog state - always start fresh
  welcomeShown: false,
  dialogOpen: false,
  dialogNode: "",
  visitedNodes: new Set<string>(),
  soundEnabled: false,

  // World actions
  // The pointer is over nothing in the new scene yet.
  setCurrentScene: (scene) => set({ currentScene: scene, hoveredObject: null }),

  goToSection: (section) => {
    requestId += 1;
    set({
      sceneRequest: { id: requestId, kind: "section", section },
      // Get the content screen and dialog out of the way, so the trip plays.
      terminalScreenAction: null,
      dialogOpen: false,
    });
  },

  travelTo: (scene) => {
    requestId += 1;
    set({
      sceneRequest: { id: requestId, kind: "travel", scene },
      terminalScreenAction: null,
      dialogOpen: false,
    });
  },

  takeSceneRequest: () => {
    const request = get().sceneRequest;
    if (request) set({ sceneRequest: null });
    return request;
  },

  // Interaction actions
  setHoveredObject: (id) => set({ hoveredObject: id }),

  openTerminalScreen: (action: ActionType) => {
    // "talk" action opens the adventure dialog instead
    if (action === "talk") {
      get().openDialog("intro");
      return;
    }

    set({ terminalScreenAction: action, hoveredObject: null });
  },

  closeTerminalScreen: () => {
    set({ terminalScreenAction: null });
  },

  toggleTerminal: () => {
    const { terminalOpen, terminalScreenAction } = get();
    // Don't open terminal if terminal screen is open
    if (terminalScreenAction && !terminalOpen) return;

    set({ terminalOpen: !terminalOpen });
  },

  closeTerminal: () => set({ terminalOpen: false, gameWindowActive: false }),

  setGameWindowActive: (active: boolean) => set({ gameWindowActive: active }),

  // Dialog actions
  dismissWelcome: () => {
    set({ welcomeShown: true });
  },

  openDialog: (startNode = "welcome") => {
    const { terminalOpen, gameWindowActive } = get();

    // Validate that the dialog node exists
    if (!DIALOG_TREE[startNode]) {
      console.error(
        `Dialog node "${startNode}" not found in DIALOG_TREE. Available nodes:`,
        Object.keys(DIALOG_TREE),
      );
      return;
    }

    // Close other overlays first
    // Don't close terminal if we're in Win95 desktop mode with game window active
    const shouldKeepTerminalOpen = terminalOpen && gameWindowActive;

    set({
      dialogOpen: true,
      dialogNode: startNode,
      terminalScreenAction: null,
      terminalOpen: shouldKeepTerminalOpen,
    });
  },

  closeDialog: () => {
    set({ dialogOpen: false });
  },

  selectDialogOption: (nodeId: string) => {
    // Handle special close node
    if (nodeId === "__close__") {
      get().closeDialog();
      return;
    }

    // Check if node exists in dialog tree
    const node = DIALOG_TREE[nodeId];
    if (!node) {
      console.warn(`Dialog node "${nodeId}" not found`);
      return;
    }

    // Track visited nodes and update current node
    set((state) => ({
      dialogNode: nodeId,
      visitedNodes: new Set([...state.visitedNodes, nodeId]),
    }));
  },

  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
  },

  setSoundEnabled: (enabled: boolean) => {
    set({ soundEnabled: enabled });
  },
}));
