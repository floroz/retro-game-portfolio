import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSceneClick } from "../useSceneClick";
import { useGameStore } from "../../store/gameStore";
import type { InteractiveObjectConfig } from "../../types/game";

// Mock the scene config with test objects
vi.mock("../../config/scene", () => ({
  OBJECTS: [
    {
      id: "computer",
      position: { x: 100, y: 100 },
      size: { width: 50, height: 50 },
      action: "about",
      label: "Computer",
      interactionPoint: { x: 120, y: 120 },
    },
    {
      id: "phone",
      position: { x: 200, y: 100 },
      size: { width: 30, height: 30 },
      action: "contact",
      label: "Phone",
      interactionPoint: { x: 220, y: 120 },
    },
    {
      id: "bookshelf",
      position: { x: 300, y: 100 },
      size: { width: 60, height: 60 },
      action: "experience",
      label: "Bookshelf",
      interactionPoint: { x: 330, y: 120 },
    },
  ] as InteractiveObjectConfig[],
  SCENE_CONFIG: {
    characterStart: { x: 400, y: 300 },
  },
  clampToWalkableArea: vi.fn((x: number, y: number) => ({ x, y })),
}));

// Mock dialog tree
vi.mock("../../config/dialogTrees", () => ({
  DIALOG_TREE: {
    intro: {
      speaker: "daniele" as const,
      text: "Hello",
      options: [],
    },
  },
}));

describe("useSceneClick", () => {
  beforeEach(() => {
    // Reset store to clean state
    const store = useGameStore.getState();
    store.closeTerminalScreen();
    store.closeDialog();
    useGameStore.setState({
      terminalScreenAction: null,
      terminalOpen: false,
      gameWindowActive: true,
      hoveredObject: null,
    });
  });

  describe("handleObjectClick", () => {
    test("should trigger action when clicking on object", () => {
      const { result } = renderHook(() => useSceneClick());

      act(() => {
        result.current.handleObjectClick("computer");
      });

      const state = useGameStore.getState();
      // Check that triggerAction was called by verifying the state changes
      expect(state.pendingAction?.action).toBe("about");
      expect(state.characterState).toBe("walking");
    });

    test("should not trigger action for non-existent object", () => {
      const { result } = renderHook(() => useSceneClick());

      act(() => {
        result.current.handleObjectClick("nonexistent");
      });

      const state = useGameStore.getState();
      expect(state.pendingAction).toBeNull();
    });

    test("should not trigger action when terminal screen is open", () => {
      useGameStore.setState({ terminalScreenAction: "about" });

      const { result } = renderHook(() => useSceneClick());

      act(() => {
        result.current.handleObjectClick("computer");
      });

      const state = useGameStore.getState();
      expect(state.pendingAction).toBeNull();
    });

    test("should not trigger action when terminal is open and game window is inactive", () => {
      useGameStore.setState({ terminalOpen: true, gameWindowActive: false });

      const { result } = renderHook(() => useSceneClick());

      act(() => {
        result.current.handleObjectClick("computer");
      });

      const state = useGameStore.getState();
      expect(state.pendingAction).toBeNull();
    });

    test("should trigger action when terminal is open but game window is active", () => {
      useGameStore.setState({ terminalOpen: true, gameWindowActive: true });

      const { result } = renderHook(() => useSceneClick());

      act(() => {
        result.current.handleObjectClick("computer");
      });

      const state = useGameStore.getState();
      expect(state.pendingAction?.action).toBe("about");
      expect(state.characterState).toBe("walking");
    });
  });

  describe("handleObjectHover", () => {
    test("should set hovered object", () => {
      const { result } = renderHook(() => useSceneClick());

      act(() => {
        result.current.handleObjectHover("computer");
      });

      expect(result.current.hoveredObject).toBe("computer");
    });

    test("should clear hovered object when null", () => {
      const { result } = renderHook(() => useSceneClick());

      // Set hovered object first
      act(() => {
        result.current.handleObjectHover("computer");
      });
      expect(result.current.hoveredObject).toBe("computer");

      // Clear it
      act(() => {
        result.current.handleObjectHover(null);
      });
      expect(result.current.hoveredObject).toBeNull();
    });
  });

  describe("handleActionClick", () => {
    test("should trigger action when clicking action button", () => {
      const { result } = renderHook(() => useSceneClick());

      act(() => {
        result.current.handleActionClick("about");
      });

      const state = useGameStore.getState();
      expect(state.pendingAction?.action).toBe("about");
      expect(state.characterState).toBe("walking");
    });

    test("should not trigger action for non-existent action", () => {
      const { result } = renderHook(() => useSceneClick());

      act(() => {
        result.current.handleActionClick("talk");
      });

      const state = useGameStore.getState();
      expect(state.pendingAction).toBeNull();
    });

    test("should not trigger action when terminal screen is open", () => {
      useGameStore.setState({ terminalScreenAction: "about" });

      const { result } = renderHook(() => useSceneClick());

      act(() => {
        result.current.handleActionClick("about");
      });

      const state = useGameStore.getState();
      expect(state.pendingAction).toBeNull();
    });

    test("should not trigger action when terminal is open and game window is inactive", () => {
      useGameStore.setState({ terminalOpen: true, gameWindowActive: false });

      const { result } = renderHook(() => useSceneClick());

      act(() => {
        result.current.handleActionClick("about");
      });

      const state = useGameStore.getState();
      expect(state.pendingAction).toBeNull();
    });

    test("should trigger action when terminal is open but game window is active", () => {
      useGameStore.setState({ terminalOpen: true, gameWindowActive: true });

      const { result } = renderHook(() => useSceneClick());

      act(() => {
        result.current.handleActionClick("about");
      });

      const state = useGameStore.getState();
      expect(state.pendingAction?.action).toBe("about");
      expect(state.characterState).toBe("walking");
    });
  });

  describe("hoveredObject", () => {
    test("should return current hovered object from store", () => {
      useGameStore.setState({ hoveredObject: "phone" });

      const { result } = renderHook(() => useSceneClick());

      expect(result.current.hoveredObject).toBe("phone");
    });

    test("should return null when no object is hovered", () => {
      useGameStore.setState({ hoveredObject: null });

      const { result } = renderHook(() => useSceneClick());

      expect(result.current.hoveredObject).toBeNull();
    });
  });
});
