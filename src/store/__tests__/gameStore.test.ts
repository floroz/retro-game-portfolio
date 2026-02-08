import { describe, test, expect, beforeEach, vi } from "vitest";
import { useGameStore } from "../gameStore";
import { SCENE_CONFIG } from "../../config/scene";
import type { Position } from "../../types/game";

describe("gameStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const store = useGameStore.getState();
    store.setCharacterPosition(SCENE_CONFIG.characterStart);
    store.setCharacterDirection("right");
    store.setCharacterState("idle");
    store.stopMovement();
    store.setHoveredObject(null);
    store.closeTerminalScreen();
    store.closeDialog();
    useGameStore.setState({
      welcomeShown: false,
      dialogNode: "", // Reset dialog node
      visitedNodes: new Set(),
      terminalOpen: true,
      gameWindowActive: true,
      soundEnabled: false,
    });
  });

  describe("Character state", () => {
    test("should initialize with default character state", () => {
      const state = useGameStore.getState();

      expect(state.characterPosition).toEqual(SCENE_CONFIG.characterStart);
      expect(state.characterDirection).toBe("right");
      expect(state.characterState).toBe("idle");
      expect(state.targetPosition).toBeNull();
    });

    test("should update character position", () => {
      const newPosition: Position = { x: 100, y: 200 };
      const store = useGameStore.getState();

      store.setCharacterPosition(newPosition);

      expect(useGameStore.getState().characterPosition).toEqual(newPosition);
    });

    test("should clamp character position to walkable area", () => {
      const store = useGameStore.getState();

      // Try to set position outside walkable area
      store.setCharacterPosition({ x: -100, y: -100 });

      const { characterPosition } = useGameStore.getState();
      // Position should be clamped to valid range
      expect(characterPosition.x).toBeGreaterThanOrEqual(0);
      expect(characterPosition.y).toBeGreaterThanOrEqual(0);
    });

    test("should update character direction", () => {
      const store = useGameStore.getState();

      store.setCharacterDirection("left");
      expect(useGameStore.getState().characterDirection).toBe("left");

      store.setCharacterDirection("right");
      expect(useGameStore.getState().characterDirection).toBe("right");
    });

    test("should update character state", () => {
      const store = useGameStore.getState();

      store.setCharacterState("walking");
      expect(useGameStore.getState().characterState).toBe("walking");

      store.setCharacterState("interacting");
      expect(useGameStore.getState().characterState).toBe("interacting");
    });
  });

  describe("Character movement", () => {
    test("should start movement to target position", () => {
      const store = useGameStore.getState();
      const initialPos = { ...store.characterPosition };
      const targetPos: Position = { x: initialPos.x + 100, y: initialPos.y };

      store.moveTo(targetPos);

      const state = useGameStore.getState();
      expect(state.targetPosition).toEqual(targetPos);
      expect(state.characterState).toBe("walking");
      expect(state.characterDirection).toBe("right"); // Moving right
    });

    test("should set direction to left when moving left", () => {
      const store = useGameStore.getState();
      const initialPos = { ...store.characterPosition };
      const targetPos: Position = { x: initialPos.x - 100, y: initialPos.y };

      store.moveTo(targetPos);

      const state = useGameStore.getState();
      expect(state.characterDirection).toBe("left");
    });

    test("should stop movement and return to idle", () => {
      const store = useGameStore.getState();

      // Start moving
      store.moveTo({ x: 500, y: 300 });
      expect(useGameStore.getState().characterState).toBe("walking");

      // Stop
      store.stopMovement();

      const state = useGameStore.getState();
      expect(state.targetPosition).toBeNull();
      expect(state.characterState).toBe("idle");
    });

    test("should handle arrival without pending action", () => {
      const store = useGameStore.getState();

      store.moveTo({ x: 500, y: 300 });
      store.onArrival();

      const state = useGameStore.getState();
      expect(state.targetPosition).toBeNull();
      expect(state.characterState).toBe("idle");
    });

    test("should execute pending action on arrival", () => {
      const store = useGameStore.getState();

      // Trigger action that creates a pending action
      store.triggerAction("about", { x: 500, y: 300 });

      // Simulate arrival
      store.onArrival();

      const state = useGameStore.getState();
      expect(state.pendingAction).toBeNull();
      expect(state.terminalScreenAction).toBe("about");
      expect(state.characterState).toBe("interacting");
    });

    test("should open dialog on arrival when pending talk action", () => {
      const store = useGameStore.getState();

      // Trigger talk action
      store.triggerAction("talk", { x: 500, y: 300 });

      // Simulate arrival
      store.onArrival();

      const state = useGameStore.getState();
      expect(state.pendingAction).toBeNull();
      expect(state.dialogOpen).toBe(true);
      expect(state.dialogNode).toBe("intro");
    });
  });

  describe("Interaction state", () => {
    test("should initialize with default interaction state", () => {
      const state = useGameStore.getState();

      expect(state.hoveredObject).toBeNull();
      expect(state.terminalScreenAction).toBeNull();
      expect(state.pendingAction).toBeNull();
    });

    test("should set hovered object", () => {
      const store = useGameStore.getState();

      store.setHoveredObject("computer");
      expect(useGameStore.getState().hoveredObject).toBe("computer");

      store.setHoveredObject(null);
      expect(useGameStore.getState().hoveredObject).toBeNull();
    });

    test("should trigger action and start movement", () => {
      const store = useGameStore.getState();
      const targetPos: Position = { x: 500, y: 300 };

      store.triggerAction("about", targetPos);

      const state = useGameStore.getState();
      // Note: position might be clamped to walkable area
      expect(state.pendingAction).toBeTruthy();
      expect(state.pendingAction?.action).toBe("about");
      expect(state.characterState).toBe("walking");
    });

    test("should open terminal screen with action", () => {
      const store = useGameStore.getState();

      store.openTerminalScreen("about");

      const state = useGameStore.getState();
      expect(state.terminalScreenAction).toBe("about");
      expect(state.characterState).toBe("interacting");
    });

    test("should open dialog instead of terminal screen for talk action", () => {
      const store = useGameStore.getState();

      store.openTerminalScreen("talk");

      const state = useGameStore.getState();
      expect(state.terminalScreenAction).toBeNull();
      expect(state.dialogOpen).toBe(true);
      expect(state.dialogNode).toBe("intro");
    });

    test("should close terminal screen and reset state", () => {
      const store = useGameStore.getState();

      // Open terminal screen first
      store.openTerminalScreen("about");
      expect(useGameStore.getState().terminalScreenAction).toBe("about");

      // Close terminal screen
      store.closeTerminalScreen();

      const state = useGameStore.getState();
      expect(state.terminalScreenAction).toBeNull();
      expect(state.pendingAction).toBeNull();
      expect(state.characterState).toBe("idle");
    });
  });

  describe("Terminal state", () => {
    test("should initialize with terminal open", () => {
      const state = useGameStore.getState();

      expect(state.terminalOpen).toBe(true);
      expect(state.gameWindowActive).toBe(true);
    });

    test("should toggle terminal", () => {
      const store = useGameStore.getState();

      store.toggleTerminal();
      expect(useGameStore.getState().terminalOpen).toBe(false);

      store.toggleTerminal();
      expect(useGameStore.getState().terminalOpen).toBe(true);
    });

    test("should not open terminal when terminal screen is open", () => {
      const store = useGameStore.getState();

      // Open terminal screen
      store.openTerminalScreen("about");

      // Close terminal
      store.toggleTerminal();
      expect(useGameStore.getState().terminalOpen).toBe(false);

      // Try to open terminal - should stay closed
      store.toggleTerminal();
      expect(useGameStore.getState().terminalOpen).toBe(false);
    });

    test("should close terminal and deactivate game window", () => {
      const store = useGameStore.getState();

      store.closeTerminal();

      const state = useGameStore.getState();
      expect(state.terminalOpen).toBe(false);
      expect(state.gameWindowActive).toBe(false);
    });

    test("should set game window active state", () => {
      const store = useGameStore.getState();

      store.setGameWindowActive(false);
      expect(useGameStore.getState().gameWindowActive).toBe(false);

      store.setGameWindowActive(true);
      expect(useGameStore.getState().gameWindowActive).toBe(true);
    });
  });

  describe("Dialog state", () => {
    test("should initialize with default dialog state", () => {
      const state = useGameStore.getState();

      expect(state.welcomeShown).toBe(false);
      expect(state.dialogOpen).toBe(false);
      expect(state.dialogNode).toBe("");
      expect(state.visitedNodes.size).toBe(0);
    });

    test("should dismiss welcome", () => {
      const store = useGameStore.getState();

      store.dismissWelcome();
      expect(useGameStore.getState().welcomeShown).toBe(true);
    });

    test("should open dialog with default node", () => {
      const store = useGameStore.getState();

      store.openDialog();

      const state = useGameStore.getState();
      expect(state.dialogOpen).toBe(true);
      expect(state.dialogNode).toBe("welcome");
      expect(state.terminalScreenAction).toBeNull();
    });

    test("should open dialog with specific node", () => {
      const store = useGameStore.getState();

      store.openDialog("intro");

      const state = useGameStore.getState();
      expect(state.dialogOpen).toBe(true);
      expect(state.dialogNode).toBe("intro");
    });

    test("should not open dialog with invalid node", () => {
      const store = useGameStore.getState();
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      store.openDialog("nonexistent");

      const state = useGameStore.getState();
      expect(state.dialogOpen).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test("should keep terminal open in Win95 desktop mode", () => {
      const store = useGameStore.getState();

      useGameStore.setState({ terminalOpen: true, gameWindowActive: true });

      store.openDialog("intro");

      const state = useGameStore.getState();
      expect(state.terminalOpen).toBe(true);
    });

    test("should close terminal when not in Win95 desktop mode", () => {
      const store = useGameStore.getState();

      useGameStore.setState({ terminalOpen: true, gameWindowActive: false });

      store.openDialog("intro");

      const state = useGameStore.getState();
      expect(state.terminalOpen).toBe(false);
    });

    test("should close dialog", () => {
      const store = useGameStore.getState();

      // Open dialog first
      store.openDialog("intro");
      expect(useGameStore.getState().dialogOpen).toBe(true);

      // Close dialog
      store.closeDialog();

      const state = useGameStore.getState();
      expect(state.dialogOpen).toBe(false);
      expect(state.characterState).toBe("idle");
    });

    test("should select dialog option and navigate", () => {
      const store = useGameStore.getState();

      store.selectDialogOption("about-intro");

      const state = useGameStore.getState();
      expect(state.dialogNode).toBe("about-intro");
      expect(state.visitedNodes.has("about-intro")).toBe(true);
    });

    test("should close dialog on __close__ node", () => {
      const store = useGameStore.getState();

      // Open dialog first
      store.openDialog("intro");
      expect(useGameStore.getState().dialogOpen).toBe(true);

      // Select close option
      store.selectDialogOption("__close__");

      const state = useGameStore.getState();
      expect(state.dialogOpen).toBe(false);
    });

    test("should warn when selecting nonexistent node", () => {
      const store = useGameStore.getState();
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      store.selectDialogOption("nonexistent");

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    test("should track multiple visited nodes", () => {
      const store = useGameStore.getState();

      store.selectDialogOption("intro");
      store.selectDialogOption("about-intro");

      const state = useGameStore.getState();
      expect(state.visitedNodes.has("intro")).toBe(true);
      expect(state.visitedNodes.has("about-intro")).toBe(true);
      expect(state.visitedNodes.size).toBe(2);
    });
  });

  describe("Sound state", () => {
    test("should initialize with sound disabled", () => {
      const state = useGameStore.getState();
      expect(state.soundEnabled).toBe(false);
    });

    test("should toggle sound", () => {
      const store = useGameStore.getState();

      store.toggleSound();
      expect(useGameStore.getState().soundEnabled).toBe(true);

      store.toggleSound();
      expect(useGameStore.getState().soundEnabled).toBe(false);
    });
  });
});
