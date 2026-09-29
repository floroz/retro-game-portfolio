import { vi } from "vitest";
import { useGameStore } from "../../store/gameStore";

type GameState = ReturnType<typeof useGameStore.getState>;

/**
 * Creates a mock Zustand store for testing hooks
 * Automatically syncs with the real GameState type
 */
export function createMockStore(overrides: Partial<GameState> = {}): GameState {
  // Get the default state from the real store
  const defaultState = useGameStore.getState();

  // Create a mock with all methods replaced by vi.fn()
  const mockState: GameState = {
    ...defaultState,
    // Override all methods with mocked functions
    selectDialogOption: vi.fn(),
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    dismissWelcome: vi.fn(),
    toggleSound: vi.fn(),
    closeTerminal: vi.fn(),
    toggleTerminal: vi.fn(),
    setCurrentScene: vi.fn(),
    goToSection: vi.fn(),
    travelTo: vi.fn(),
    takeSceneRequest: vi.fn(() => null),
    setHoveredObject: vi.fn(),
    openTerminalScreen: vi.fn(),
    closeTerminalScreen: vi.fn(),
    setGameWindowActive: vi.fn(),
  };

  // Apply any overrides
  return {
    ...mockState,
    ...overrides,
  };
}
