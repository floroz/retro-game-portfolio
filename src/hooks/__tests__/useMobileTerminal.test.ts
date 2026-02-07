import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { TerminalLine } from "../../types/game";

// Mock the dialog tree - define inline in factory to avoid hoisting issues
vi.mock("../../config/dialogTrees", () => ({
  DIALOG_TREE: {
    welcome: {
      speaker: "daniele" as const,
      text: "Hey! Welcome to my portfolio.",
      options: [
        { id: "opt-continue", label: "Continue", nextNode: "intro" },
        { id: "opt-exit", label: "Exit", nextNode: "__close__" },
      ],
    },
    intro: {
      speaker: "daniele" as const,
      text: "I'm a software engineer based in Zürich.",
      options: [
        { id: "opt-about", label: "Tell me about yourself", nextNode: "about" },
        { id: "opt-work", label: "What do you do?", nextNode: "work" },
      ],
    },
    about: {
      speaker: "daniele" as const,
      text: "I love building great software experiences.",
      options: [],
    },
    work: {
      speaker: "daniele" as const,
      text: "I specialize in React and TypeScript.",
      options: [],
    },
  },
}));

// Mock the store
vi.mock("../../store/gameStore");

// Now import after mocks are set up
import { useMobileTerminal } from "../useMobileTerminal";
import { useGameStore } from "../../store/gameStore";
import { createMockStore } from "../../test/helpers/mockStore";

// Helper function to get last matching line (findLast polyfill)
function findLastLine(
  history: TerminalLine[],
  predicate: (line: TerminalLine) => boolean,
): TerminalLine | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (predicate(history[i])) {
      return history[i];
    }
  }
  return undefined;
}

describe("useMobileTerminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dialog option selection with history tracking (NEW FEATURE)", () => {
    test("should mark dialog-options line with selectedOptionId when option selected", async () => {
      const mockSelectDialogOption = vi.fn();
      vi.mocked(useGameStore).mockReturnValue(
        createMockStore({
          dialogNode: "welcome",
          selectDialogOption: mockSelectDialogOption,
        }),
      );

      const { result } = renderHook(() => useMobileTerminal());

      // Wait for typewriter to complete (instant due to setup.ts)
      await waitFor(() => {
        const optionsLine = result.current.history.find(
          (line) => line.type === "dialog-options",
        );
        expect(optionsLine).toBeDefined();
      });

      // Verify selectedOptionId is not set initially
      const initialOptionsLine = result.current.history.find(
        (line) => line.type === "dialog-options",
      );
      expect(initialOptionsLine?.metadata?.selectedOptionId).toBeUndefined();

      // Select option 1 (Continue)
      act(() => {
        result.current.executeInput("1");
      });

      // Verify selectedOptionId is now set
      const updatedOptionsLine = result.current.history.find(
        (line) => line.type === "dialog-options",
      );
      expect(updatedOptionsLine?.metadata?.selectedOptionId).toBe(
        "opt-continue",
      );

      // Verify selectDialogOption was called with correct node
      expect(mockSelectDialogOption).toHaveBeenCalledWith("intro");
    });

    test("should add user input line showing option label after selection", async () => {
      const mockSelectDialogOption = vi.fn();
      vi.mocked(useGameStore).mockReturnValue(
        createMockStore({
          dialogNode: "welcome",
          selectDialogOption: mockSelectDialogOption,
        }),
      );

      const { result } = renderHook(() => useMobileTerminal());

      // Wait for options to appear
      await waitFor(() => {
        const optionsLine = result.current.history.find(
          (line) => line.type === "dialog-options",
        );
        expect(optionsLine).toBeDefined();
      });

      // Select option 1
      act(() => {
        result.current.executeInput("1");
      });

      // Verify user input line was added
      const inputLine = findLastLine(
        result.current.history,
        (line) => line.type === "input",
      );
      expect(inputLine?.content).toContain("Continue");
    });

    test("should handle __close__ special node", async () => {
      const mockSelectDialogOption = vi.fn();
      const mockCloseTerminal = vi.fn();

      vi.mocked(useGameStore).mockReturnValue(
        createMockStore({
          dialogNode: "welcome",
          selectDialogOption: mockSelectDialogOption,
          closeTerminal: mockCloseTerminal,
        }),
      );

      const { result } = renderHook(() => useMobileTerminal());

      // Wait for options
      await waitFor(() => {
        const optionsLine = result.current.history.find(
          (line) => line.type === "dialog-options",
        );
        expect(optionsLine).toBeDefined();
      });

      // Select option 2 (Exit - leads to __close__)
      act(() => {
        result.current.executeInput("2");
      });

      // __close__ should not call selectDialogOption
      expect(mockSelectDialogOption).not.toHaveBeenCalledWith("__close__");

      // Should add closing message to history
      const outputLine = findLastLine(
        result.current.history,
        (line) => line.type === "output",
      );
      expect(outputLine?.content).toContain("Dialog ended");
    });

    test("should navigate to next dialog node after selecting option", async () => {
      const mockSelectDialogOption = vi.fn();
      vi.mocked(useGameStore).mockReturnValue(
        createMockStore({
          dialogNode: "welcome",
          selectDialogOption: mockSelectDialogOption,
        }),
      );

      const { result } = renderHook(() => useMobileTerminal());

      await waitFor(() => {
        expect(
          result.current.history.some((line) => line.type === "dialog-options"),
        ).toBe(true);
      });

      act(() => {
        result.current.executeInput("1");
      });

      expect(mockSelectDialogOption).toHaveBeenCalledWith("intro");
    });
  });

  describe("Duplicate prevention", () => {
    test("should not add same dialog node to history twice", async () => {
      vi.mocked(useGameStore).mockReturnValue(
        createMockStore({
          dialogNode: "welcome",
        }),
      );

      const { result } = renderHook(() => useMobileTerminal());

      // Wait for first agent message
      await waitFor(() => {
        const agentMessages = result.current.history.filter(
          (line) => line.type === "dialog-agent",
        );
        expect(agentMessages.length).toBeGreaterThan(0);
      });

      const initialCount = result.current.history.filter(
        (line) => line.type === "dialog-agent",
      ).length;

      // Wait a bit to ensure no duplicate is added
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalCount = result.current.history.filter(
        (line) => line.type === "dialog-agent",
      ).length;

      expect(finalCount).toBe(initialCount);
    });
  });

  describe("Command execution", () => {
    test("should execute help command and add output", () => {
      vi.mocked(useGameStore).mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMobileTerminal());

      act(() => {
        result.current.executeInput("help");
      });

      const outputLine = findLastLine(
        result.current.history,
        (line) => line.type === "output",
      );
      expect(outputLine?.content).toContain("Available commands");
    });

    test("should execute clear command and reset history", () => {
      vi.mocked(useGameStore).mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMobileTerminal());

      // Add some commands first
      act(() => {
        result.current.executeInput("help");
      });
      act(() => {
        result.current.executeInput("about");
      });

      const beforeClear = result.current.history.length;
      expect(beforeClear).toBeGreaterThan(1);

      act(() => {
        result.current.executeInput("clear");
      });

      // Should reset to just the ASCII art banner
      expect(result.current.history.length).toBe(1);
      expect(result.current.history[0].content).toContain("DANIELE TORTORA");
    });

    test("should execute talk command and call selectDialogOption", () => {
      const mockSelectDialogOption = vi.fn();
      vi.mocked(useGameStore).mockReturnValue(
        createMockStore({
          selectDialogOption: mockSelectDialogOption,
        }),
      );

      const { result } = renderHook(() => useMobileTerminal());

      act(() => {
        result.current.executeInput("talk");
      });

      // Should call selectDialogOption with 'welcome' after a timeout
      setTimeout(() => {
        expect(mockSelectDialogOption).toHaveBeenCalledWith("welcome");
      }, 400);
    });

    test("should show error for unknown command", () => {
      vi.mocked(useGameStore).mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMobileTerminal());

      act(() => {
        result.current.executeInput("invalid-command");
      });

      const errorLine = findLastLine(
        result.current.history,
        (line) => line.type === "error",
      );
      expect(errorLine?.content).toContain("Command not found");
    });
  });

  describe("Input routing", () => {
    test("should route numeric input to dialog options when dialog active", async () => {
      const mockSelectDialogOption = vi.fn();
      vi.mocked(useGameStore).mockReturnValue(
        createMockStore({
          dialogNode: "welcome",
          selectDialogOption: mockSelectDialogOption,
        }),
      );

      const { result } = renderHook(() => useMobileTerminal());

      await waitFor(() => {
        expect(
          result.current.history.some((line) => line.type === "dialog-options"),
        ).toBe(true);
      });

      act(() => {
        result.current.executeInput("1");
      });

      expect(mockSelectDialogOption).toHaveBeenCalled();
    });

    test("should route non-numeric input to command handler", () => {
      vi.mocked(useGameStore).mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMobileTerminal());

      act(() => {
        result.current.executeInput("help");
      });

      const outputLine = findLastLine(
        result.current.history,
        (line) => line.type === "output",
      );
      expect(outputLine).toBeDefined();
    });

    test("should show error for invalid option number", async () => {
      vi.mocked(useGameStore).mockReturnValue(
        createMockStore({
          dialogNode: "welcome",
        }),
      );

      const { result } = renderHook(() => useMobileTerminal());

      await waitFor(() => {
        expect(
          result.current.history.some((line) => line.type === "dialog-options"),
        ).toBe(true);
      });

      act(() => {
        result.current.executeInput("99");
      });

      // Invalid option number should be treated as command, which doesn't exist
      const errorLine = findLastLine(
        result.current.history,
        (line) => line.type === "error",
      );
      expect(errorLine?.content).toContain("Command not found");
    });
  });

  describe("History navigation", () => {
    test("should navigate to previous command with ArrowUp", () => {
      vi.mocked(useGameStore).mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMobileTerminal());

      // Execute a command
      act(() => {
        result.current.executeInput("help");
      });

      // Clear input
      act(() => {
        result.current.setInput("");
      });

      // Press ArrowUp
      act(() => {
        // Type assertion needed for test mock - we only need key and preventDefault for the test
        result.current.handleKeyDown({
          key: "ArrowUp",
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });

      expect(result.current.input).toBe("help");
    });

    test("should navigate to next command with ArrowDown", () => {
      vi.mocked(useGameStore).mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMobileTerminal());

      // Execute two commands
      act(() => {
        result.current.executeInput("help");
      });
      act(() => {
        result.current.executeInput("about");
      });

      // Navigate up twice
      act(() => {
        result.current.setInput("");
      });
      act(() => {
        // Type assertion needed for test mock - we only need key and preventDefault for the test
        result.current.handleKeyDown({
          key: "ArrowUp",
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });
      act(() => {
        // Type assertion needed for test mock - we only need key and preventDefault for the test
        result.current.handleKeyDown({
          key: "ArrowUp",
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });

      expect(result.current.input).toBe("help");

      // Navigate down once
      act(() => {
        // Type assertion needed for test mock - we only need key and preventDefault for the test
        result.current.handleKeyDown({
          key: "ArrowDown",
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });

      expect(result.current.input).toBe("about");
    });

    test("should clear input when ArrowDown past end", () => {
      vi.mocked(useGameStore).mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMobileTerminal());

      // Execute a command
      act(() => {
        result.current.executeInput("help");
      });

      // Navigate up
      act(() => {
        result.current.setInput("");
      });
      act(() => {
        // Type assertion needed for test mock - we only need key and preventDefault for the test
        result.current.handleKeyDown({
          key: "ArrowUp",
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });

      expect(result.current.input).toBe("help");

      // Navigate down past end
      act(() => {
        // Type assertion needed for test mock - we only need key and preventDefault for the test
        result.current.handleKeyDown({
          key: "ArrowDown",
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });

      expect(result.current.input).toBe("");
    });

    test("should reset history index on new command", () => {
      vi.mocked(useGameStore).mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMobileTerminal());

      // Execute commands
      act(() => {
        result.current.executeInput("help");
      });
      act(() => {
        result.current.executeInput("about");
      });

      // Navigate up
      act(() => {
        result.current.setInput("");
      });
      act(() => {
        // Type assertion needed for test mock - we only need key and preventDefault for the test
        result.current.handleKeyDown({
          key: "ArrowUp",
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });

      // Execute new command
      act(() => {
        result.current.executeInput("skills");
      });

      // Navigate up should get the most recent command
      act(() => {
        result.current.setInput("");
      });
      act(() => {
        // Type assertion needed for test mock - we only need key and preventDefault for the test
        result.current.handleKeyDown({
          key: "ArrowUp",
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });

      expect(result.current.input).toBe("skills");
    });
  });

  describe("Tab completion", () => {
    test("should complete partial command with single match", () => {
      vi.mocked(useGameStore).mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMobileTerminal());

      act(() => {
        result.current.setInput("hel");
      });

      act(() => {
        // Type assertion needed for test mock - we only need key and preventDefault for the test
        result.current.handleKeyDown({
          key: "Tab",
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });

      expect(result.current.input).toBe("help");
    });

    test("should show multiple matches when ambiguous", () => {
      vi.mocked(useGameStore).mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMobileTerminal());

      act(() => {
        result.current.setInput("c"); // "c" matches: chat, clear, contact
      });

      act(() => {
        // Type assertion needed for test mock - we only need key and preventDefault for the test
        result.current.handleKeyDown({
          key: "Tab",
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });

      // Should add output showing possible commands
      const outputLine = findLastLine(
        result.current.history,
        (line) => line.type === "output",
      );
      expect(outputLine?.content).toContain("Possible commands");
    });

    test("should skip hidden commands", () => {
      vi.mocked(useGameStore).mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMobileTerminal());

      // Try to complete 'sud' (sudo is hidden)
      act(() => {
        result.current.setInput("sud");
      });

      act(() => {
        // Type assertion needed for test mock - we only need key and preventDefault for the test
        result.current.handleKeyDown({
          key: "Tab",
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });

      // Should not complete to 'sudo'
      expect(result.current.input).toBe("sud");
    });
  });

  describe("Typewriter integration", () => {
    test("should append agent message to history on typewriter complete", async () => {
      vi.mocked(useGameStore).mockReturnValue(
        createMockStore({
          dialogNode: "welcome",
        }),
      );

      const { result } = renderHook(() => useMobileTerminal());

      await waitFor(() => {
        const agentMessage = result.current.history.find(
          (line) => line.type === "dialog-agent",
        );
        expect(agentMessage).toBeDefined();
        expect(agentMessage?.content).toContain("Welcome to my portfolio");
      });
    });

    test("should append options after agent message", async () => {
      vi.mocked(useGameStore).mockReturnValue(
        createMockStore({
          dialogNode: "welcome",
        }),
      );

      const { result } = renderHook(() => useMobileTerminal());

      await waitFor(() => {
        const optionsLine = result.current.history.find(
          (line) => line.type === "dialog-options",
        );
        expect(optionsLine).toBeDefined();
        expect(optionsLine?.metadata?.options).toBeDefined();
        expect(optionsLine?.metadata?.options?.length).toBeGreaterThan(0);
      });
    });
  });
});
