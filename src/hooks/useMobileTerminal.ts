import { useState, useCallback, useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import { DIALOG_TREE } from "../config/dialogTrees";
import {
  TERMINAL_COMMANDS,
  getHelpText,
  getListSections,
  getWhoamiText,
  getSudoJoke,
  getMatrixEffect,
  getAboutText,
  getExperienceText,
  getSkillsText,
  getContactText,
} from "../config/commands";
import { useTypewriter } from "./useTypewriter";
import type { TerminalLine } from "../types/game";

// ASCII art for terminal welcome
const TERMINAL_ART = `
+--------------------------------------+
|                                      |
|        DANIELE TORTORA               |
|   Senior Software Engineer           |
|        Portfolio v4.0                |
|                                      |
+--------------------------------------+
`;

/**
 * Unified mobile terminal hook that merges dialog and command functionality
 */
export function useMobileTerminal() {
  const { dialogNode, selectDialogOption, closeTerminal } = useGameStore();
  const currentNode = DIALOG_TREE[dialogNode];

  // Terminal state
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: "output", content: TERMINAL_ART },
  ]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track if intro has been triggered to prevent multiple calls
  const introTriggeredRef = useRef(false);

  // Track which dialog nodes have been added to history to prevent duplicates
  const addedNodesRef = useRef<Set<string>>(new Set());

  // Derive dialog message directly from currentNode instead of syncing in effect
  // Only show dialog text if we have a valid dialogNode (not empty string from initial state)
  const dialogText = dialogNode && currentNode?.text ? currentNode.text : "";

  // Callback to add dialog to history when typewriter completes
  const handleTypewriterComplete = useCallback(() => {
    if (!currentNode || !dialogText.trim()) return;

    // Only add if we haven't added this dialog node before
    if (!addedNodesRef.current.has(dialogNode)) {
      addedNodesRef.current.add(dialogNode);

      // Add agent message to history
      setHistory((prev) => [
        ...prev,
        {
          type: "dialog-agent",
          content: currentNode.text,
          metadata: {
            speaker: currentNode.speaker,
            timestamp: Date.now(),
          },
        },
      ]);

      // Add options to history if they exist
      if (currentNode.options && currentNode.options.length > 0) {
        setHistory((prev) => [
          ...prev,
          {
            type: "dialog-options",
            content: "",
            metadata: {
              options: currentNode.options,
              timestamp: Date.now(),
            },
          },
        ]);
      }
    }
  }, [currentNode, dialogNode, dialogText]);

  // Typewriter for dialog messages (60 chars/sec, faster on mobile)
  const { displayedText, isTyping, skip } = useTypewriter(dialogText, {
    speed: 60,
    onComplete: handleTypewriterComplete,
  });

  // Trigger intro dialog on mount (only once)
  useEffect(() => {
    if (!introTriggeredRef.current && !dialogNode) {
      introTriggeredRef.current = true;
      selectDialogOption("intro");
    }
  }, [dialogNode, selectDialogOption]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Add output to terminal
  const addOutput = useCallback(
    (content: string, type: "output" | "error" = "output") => {
      setHistory((prev) => [
        ...prev,
        { type, content, metadata: { timestamp: Date.now() } },
      ]);
    },
    [],
  );

  // Execute terminal command
  const executeCommand = useCallback(
    (rawInput: string) => {
      const trimmed = rawInput.trim();
      if (!trimmed) return;

      // Add input to history display
      setHistory((prev) => [
        ...prev,
        {
          type: "input",
          content: `> ${trimmed}`,
          metadata: { timestamp: Date.now() },
        },
      ]);

      // Add to command history for arrow key navigation
      setCommandHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);

      // Parse command
      const [cmd] = trimmed.toLowerCase().split(/\s+/);

      // Check if command exists
      const command = TERMINAL_COMMANDS[cmd];

      if (!command) {
        addOutput(
          `Command not found: ${cmd}\nType 'help' for available commands.`,
          "error",
        );
        return;
      }

      // Execute based on action type
      switch (command.action) {
        case "showHelp":
          addOutput(getHelpText());
          break;

        case "showAbout":
          addOutput(getAboutText());
          break;

        case "showExperience":
          addOutput(getExperienceText());
          break;

        case "showSkills":
          addOutput(getSkillsText());
          break;

        case "showContact":
          addOutput(getContactText());
          break;

        case "openDialog":
          addOutput("Starting conversation...");
          setTimeout(() => {
            selectDialogOption(command.payload as string);
          }, 300);
          break;

        case "downloadResume":
          addOutput(
            "Opening resume download...\n(Resume PDF would download here)",
          );
          // TODO: Implement actual download
          break;

        case "clearTerminal":
          setHistory([{ type: "output", content: TERMINAL_ART }]);
          break;

        case "listSections":
          addOutput(getListSections());
          break;

        case "showWhoami":
          addOutput(getWhoamiText());
          break;

        case "closeTerminal":
          closeTerminal();
          break;

        case "showSudoJoke":
          addOutput(getSudoJoke());
          break;

        case "showMatrixEffect":
          addOutput(getMatrixEffect());
          break;

        default:
          addOutput(`Unknown action: ${command.action}`, "error");
      }
    },
    [addOutput, closeTerminal, selectDialogOption],
  );

  // Handle input (commands OR dialog option selection)
  const handleInput = useCallback(
    (input: string) => {
      const trimmed = input.trim();

      // Check if it's a dialog option number
      if (currentNode?.options && /^\d+$/.test(trimmed)) {
        const optionIndex = parseInt(trimmed, 10) - 1;
        const option = currentNode.options[optionIndex];

        if (option) {
          // Mark the most recent dialog-options line with the selected option
          setHistory((prev) => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
              if (
                updated[i].type === "dialog-options" &&
                !updated[i].metadata?.selectedOptionId
              ) {
                updated[i] = {
                  ...updated[i],
                  metadata: {
                    ...updated[i].metadata,
                    selectedOptionId: option.id,
                  },
                };
                break;
              }
            }
            // Add user selection to history
            updated.push({
              type: "input",
              content: `> ${option.label}`,
              metadata: { timestamp: Date.now() },
            });
            return updated;
          });

          // Allow new dialog node to be added by clearing the ref guard
          addedNodesRef.current.delete(option.nextNode);

          // Navigate to next dialog node
          if (option.nextNode === "__close__") {
            // Add closing message and allow commands
            addOutput(
              "Dialog ended. Type 'talk' to start again, or try other commands like 'about', 'skills', etc.",
            );
          } else {
            selectDialogOption(option.nextNode);
          }

          return;
        }
      }

      // Otherwise, treat as command
      executeCommand(trimmed);
    },
    [currentNode, selectDialogOption, executeCommand, addOutput],
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          if (input.trim()) {
            handleInput(input);
            setInput("");
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (commandHistory.length > 0) {
            const newIndex =
              historyIndex === -1
                ? commandHistory.length - 1
                : Math.max(0, historyIndex - 1);
            setHistoryIndex(newIndex);
            setInput(commandHistory[newIndex]);
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (historyIndex !== -1) {
            const newIndex = historyIndex + 1;
            if (newIndex >= commandHistory.length) {
              setHistoryIndex(-1);
              setInput("");
            } else {
              setHistoryIndex(newIndex);
              setInput(commandHistory[newIndex]);
            }
          }
          break;

        case "Tab": {
          e.preventDefault();
          // Simple tab completion
          const partial = input.toLowerCase();
          if (partial) {
            const matches = Object.keys(TERMINAL_COMMANDS).filter(
              (cmd) =>
                cmd.startsWith(partial) && !TERMINAL_COMMANDS[cmd].hidden,
            );
            if (matches.length === 1) {
              setInput(matches[0]);
            } else if (matches.length > 1) {
              addOutput(`\nPossible commands: ${matches.join(", ")}`);
            }
          }
          break;
        }
      }
    },
    [input, commandHistory, historyIndex, handleInput, addOutput],
  );

  return {
    history,
    setHistory,
    input,
    setInput,
    handleKeyDown,
    executeInput: handleInput,
    inputRef,

    // Dialog-specific for rendering typewriter
    currentDialogMessage: displayedText,
    isTyping,
    skipTypewriter: skip,
    currentOptions: currentNode?.options || [],
  };
}
