import { create } from "zustand";
import type { ActionType } from "../types/game";
import type {
  CountrySceneId,
  ObjectInspection,
  SceneId,
} from "../engine/types";
import { DIALOG_TREE } from "../config/dialogTrees";

interface GameState {
  // World state. Daniele's position and animation live in the scene engine
  // (src/engine/SceneEngine.ts), which runs every frame outside React.
  currentScene: SceneId;
  /** A trip or the travel map is playing, and a click skips it. */
  skippable: boolean;
  /** Where the travel map is flying to, while it plays. */
  flyingTo: CountrySceneId | null;

  // Interaction state
  /** Status-line text for whatever the pointer is over. */
  hoveredObject: string | null;
  contentSection: ActionType | null;
  inspection: ObjectInspection | null;
  gameWindowActive: boolean; // Track if game window is active in Win95 desktop

  // Dialog state
  welcomeShown: boolean;
  controlsOpen: boolean;
  openControls: () => void;
  closeControls: () => void;
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

  // Interaction actions
  setHoveredObject: (id: string | null) => void;
  openContent: (action: ActionType) => void;
  openInspection: (inspection: ObjectInspection) => void;
  closeContent: () => void;
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

// Always show welcome on each page load (no persistence)

export const useGameStore = create<GameState>((set, get) => ({
  currentScene: "hall",
  skippable: false,
  flyingTo: null,

  // Initial interaction state
  hoveredObject: null,
  contentSection: null,
  inspection: null,
  gameWindowActive: true, // Game window is active by default

  // Initial dialog state - always start fresh
  welcomeShown: false,
  controlsOpen: false,
  openControls: () => set({ controlsOpen: true, hoveredObject: null }),
  closeControls: () => set({ controlsOpen: false }),
  dialogOpen: false,
  dialogNode: "",
  dialogReady: false,
  visitedNodes: new Set<string>(),
  soundEnabled: true,

  // World actions
  // The pointer is over nothing in the new scene yet.
  setCurrentScene: (scene) => set({ currentScene: scene, hoveredObject: null }),

  // Interaction actions
  setHoveredObject: (id) => set({ hoveredObject: id }),

  openContent: (action: ActionType) => {
    // "talk" action opens the adventure dialog instead
    if (action === "talk") {
      get().openDialog("intro");
      return;
    }

    // A content screen ends any conversation.
    set({
      controlsOpen: false,
      contentSection: action,
      inspection: null,
      hoveredObject: null,
      dialogOpen: false,
      dialogReady: false,
    });
  },

  openInspection: (inspection) =>
    set({
      controlsOpen: false,
      inspection,
      contentSection: null,
      hoveredObject: null,
      dialogOpen: false,
      dialogReady: false,
    }),

  closeContent: () => {
    set({ contentSection: null, inspection: null });
  },

  setGameWindowActive: (active: boolean) => set({ gameWindowActive: active }),

  // Dialog actions
  dismissWelcome: () => {
    set({ welcomeShown: true });
  },

  openDialog: (startNode = "welcome") => {
    // Validate that the dialog node exists
    if (!DIALOG_TREE[startNode]) {
      console.error(
        `Dialog node "${startNode}" not found in DIALOG_TREE. Available nodes:`,
        Object.keys(DIALOG_TREE),
      );
      return;
    }

    // Asking for the line already being said changes nothing: the scene
    // would not say it again, and its choices would never come back.
    const { dialogOpen, dialogNode, dialogReady } = get();
    const again = dialogOpen && dialogNode === startNode;

    set({
      controlsOpen: false,
      dialogOpen: true,
      dialogNode: startNode,
      dialogReady: again ? dialogReady : false,
      contentSection: null,
      inspection: null,
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
