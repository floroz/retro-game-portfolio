import { create } from "zustand";
import type { ActionType } from "../types/game";
import type {
  CountrySceneId,
  ObjectInspection,
  SceneId,
  SectionId,
} from "../engine/types";
import { DIALOG_TREE } from "../config/dialogTrees";

/**
 * A trip for the scene engine to run. Terminal commands post
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
  /** Where the travel map is flying to, while it plays. */
  flyingTo: CountrySceneId | null;

  // Interaction state
  /** Status-line text for whatever the pointer is over. */
  hoveredObject: string | null;
  terminalScreenAction: ActionType | null;
  inspection: ObjectInspection | null;
  terminalOpen: boolean;
  gameWindowActive: boolean; // Track if game window is active in Win95 desktop

  // Dialog state
  welcomeShown: boolean;
  dialogOpen: boolean;
  dialogNode: string;
  /**
   * Daniele has said the current line, so its choices are up in the panel.
   * The scene sets it (see `useConversation`).
   */
  dialogReady: boolean;
  visitedNodes: Set<string>;
  soundEnabled: boolean;

  // World actions
  setCurrentScene: (scene: SceneId) => void;
  /** Terminal shortcut: walk, fly, and open a section. */
  goToSection: (section: SectionId) => void;
  /** Fly to a scene without opening anything (terminal `fly`). */
  travelTo: (scene: SceneId) => void;
  /** Returns the pending request, if any, and clears it. */
  takeSceneRequest: () => SceneRequest | null;

  // Interaction actions
  setHoveredObject: (id: string | null) => void;
  openTerminalScreen: (action: ActionType) => void;
  openInspection: (inspection: ObjectInspection) => void;
  closeTerminalScreen: () => void;
  toggleTerminal: () => void;
  closeTerminal: () => void;
  setGameWindowActive: (active: boolean) => void;

  // Dialog actions
  dismissWelcome: () => void;
  openDialog: (startNode?: string) => void;
  closeDialog: () => void;
  selectDialogOption: (nodeId: string) => void;
  setDialogReady: (ready: boolean) => void;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
}

let requestId = 0;

// Always show welcome on each page load (no persistence)

export const useGameStore = create<GameState>((set, get) => ({
  currentScene: "hall",
  sceneRequest: null,
  skippable: false,
  flyingTo: null,

  // Initial interaction state
  hoveredObject: null,
  terminalScreenAction: null,
  inspection: null,
  terminalOpen: true, // Always start in Win95 Desktop mode
  gameWindowActive: true, // Game window is active by default

  // Initial dialog state - always start fresh
  welcomeShown: false,
  dialogOpen: false,
  dialogNode: "",
  dialogReady: false,
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
      inspection: null,
      dialogOpen: false,
      dialogReady: false,
    });
  },

  travelTo: (scene) => {
    requestId += 1;
    set({
      sceneRequest: { id: requestId, kind: "travel", scene },
      terminalScreenAction: null,
      inspection: null,
      dialogOpen: false,
      dialogReady: false,
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

    // A content screen ends any conversation.
    set({
      terminalScreenAction: action,
      inspection: null,
      sceneRequest: null,
      hoveredObject: null,
      dialogOpen: false,
      dialogReady: false,
    });
  },

  openInspection: (inspection) =>
    set({
      inspection,
      terminalScreenAction: null,
      sceneRequest: null,
      hoveredObject: null,
      dialogOpen: false,
      dialogReady: false,
    }),

  closeTerminalScreen: () => {
    set({ terminalScreenAction: null, inspection: null });
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

    // Asking for the line already being said changes nothing: the scene
    // would not say it again, and its choices would never come back.
    const { dialogOpen, dialogNode, dialogReady } = get();
    const again = dialogOpen && dialogNode === startNode;

    set({
      dialogOpen: true,
      dialogNode: startNode,
      dialogReady: again ? dialogReady : false,
      terminalScreenAction: null,
      inspection: null,
      terminalOpen: shouldKeepTerminalOpen,
    });
  },

  closeDialog: () => {
    set({ dialogOpen: false, dialogReady: false });
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
      dialogReady: false,
      visitedNodes: new Set([...state.visitedNodes, nodeId]),
    }));
  },

  setDialogReady: (ready: boolean) => set({ dialogReady: ready }),

  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
  },

  setSoundEnabled: (enabled: boolean) => {
    set({ soundEnabled: enabled });
  },
}));
