import { create } from "zustand";
import type {
  Position,
  Direction,
  CharacterState,
  ActionType,
} from "../types/game";
import { SCENE_CONFIG, clampToWalkableArea } from "../config/scene";
import { DIALOG_TREE } from "../config/dialogTrees";

interface GameState {
  // Character state
  characterPosition: Position;
  characterDirection: Direction;
  characterState: CharacterState;
  targetPosition: Position | null;

  // Interaction state
  hoveredObject: string | null;
  activeAction: ActionType | null;
  pendingAction: { action: ActionType; targetPos: Position } | null;
  modalOpen: boolean;
  terminalOpen: boolean;

  // Dialog state
  welcomeShown: boolean;
  dialogOpen: boolean;
  dialogNode: string;
  visitedNodes: Set<string>;
  soundEnabled: boolean;

  // Character actions
  setCharacterPosition: (position: Position) => void;
  setCharacterDirection: (direction: Direction) => void;
  setCharacterState: (state: CharacterState) => void;
  moveTo: (position: Position) => void;
  stopMovement: () => void;
  onArrival: () => void;

  // Interaction actions
  setHoveredObject: (id: string | null) => void;
  triggerAction: (action: ActionType, targetPos: Position) => void;
  openModal: (action: ActionType) => void;
  closeModal: () => void;
  toggleTerminal: () => void;
  closeTerminal: () => void;

  // Dialog actions
  dismissWelcome: () => void;
  openDialog: (startNode?: string) => void;
  closeDialog: () => void;
  selectDialogOption: (nodeId: string) => void;
  toggleSound: () => void;

  // Mobile actions
  startMobileDialogSession: () => void;
}

// Always show welcome on each page load (no persistence)

export const useGameStore = create<GameState>((set, get) => ({
  // Initial character state
  characterPosition: SCENE_CONFIG.characterStart,
  characterDirection: "right",
  characterState: "idle",
  targetPosition: null,

  // Initial interaction state
  hoveredObject: null,
  activeAction: null,
  pendingAction: null,
  modalOpen: false,
  terminalOpen: false,

  // Initial dialog state - always start fresh
  welcomeShown: false,
  dialogOpen: false,
  dialogNode: "",
  visitedNodes: new Set<string>(),
  soundEnabled: false,

  // Character actions
  setCharacterPosition: (position) => {
    const clamped = clampToWalkableArea(position.x, position.y);
    set({ characterPosition: clamped });
  },

  setCharacterDirection: (direction) => set({ characterDirection: direction }),

  setCharacterState: (state) => set({ characterState: state }),

  moveTo: (position) => {
    const clamped = clampToWalkableArea(position.x, position.y);
    const { characterPosition } = get();

    // Determine direction based on target
    const direction: Direction =
      clamped.x >= characterPosition.x ? "right" : "left";

    set({
      targetPosition: clamped,
      characterDirection: direction,
      characterState: "walking",
    });
  },

  stopMovement: () => {
    set({
      targetPosition: null,
      characterState: "idle",
    });
  },

  onArrival: () => {
    const { pendingAction, openDialog } = get();

    set({
      targetPosition: null,
      characterState: "idle",
    });

    // If there was a pending action, execute it
    if (pendingAction) {
      // "talk" action opens the adventure dialog
      if (pendingAction.action === "talk") {
        set({ pendingAction: null, activeAction: null });
        openDialog("intro");
      } else {
        set({
          activeAction: pendingAction.action,
          modalOpen: true,
          pendingAction: null,
        });
      }
    }
  },

  // Interaction actions
  setHoveredObject: (id) => set({ hoveredObject: id }),

  triggerAction: (action, targetPos) => {
    const clamped = clampToWalkableArea(targetPos.x, targetPos.y);

    // Set pending action and start walking to target
    set({
      pendingAction: { action, targetPos: clamped },
      activeAction: action,
    });

    // Start moving to the interaction point
    get().moveTo(clamped);
  },

  openModal: (action) => {
    // "talk" action opens the adventure dialog instead
    if (action === "talk") {
      get().openDialog("intro");
      return;
    }

    set({
      activeAction: action,
      modalOpen: true,
      characterState: "interacting",
    });
  },

  closeModal: () => {
    set({
      activeAction: null,
      modalOpen: false,
      pendingAction: null,
      characterState: "idle",
    });
  },

  toggleTerminal: () => {
    const { terminalOpen, modalOpen } = get();
    // Don't open terminal if modal is open
    if (modalOpen && !terminalOpen) return;

    set({ terminalOpen: !terminalOpen });
  },

  closeTerminal: () => set({ terminalOpen: false }),

  // Dialog actions
  dismissWelcome: () => {
    set({ welcomeShown: true });
  },

  openDialog: (startNode = "welcome") => {
    // Close other overlays first
    set({
      dialogOpen: true,
      dialogNode: startNode,
      modalOpen: false,
      terminalOpen: false,
    });
  },

  closeDialog: () => {
    set({
      dialogOpen: false,
      characterState: "idle",
    });
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

  // Mobile actions
  startMobileDialogSession: () => {
    set({ dialogNode: "intro", dialogOpen: true });
  },
}));
