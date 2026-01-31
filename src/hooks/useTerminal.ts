import { useState, useCallback, useRef, useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import {
  TERMINAL_COMMANDS,
  getHelpText,
  getListSections,
  getWhoamiText,
  getSudoJoke,
  getMatrixEffect,
} from "../config/commands";
import { PROFILE } from "../config/profile";
import type { ActionType } from "../types/game";

interface TerminalLine {
  type: "input" | "output" | "error";
  content: string;
}

const WELCOME_MESSAGE = `${PROFILE.portfolio.title} PORTFOLIO v${PROFILE.portfolio.version}
Type 'help' for available commands.
`;

/**
 * Hook to manage terminal state and command execution
 */
export function useTerminal() {
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: "output", content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { openModal, closeTerminal, openDialog } = useGameStore();

  // Focus input when terminal opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const addOutput = useCallback(
    (content: string, type: "output" | "error" = "output") => {
      setHistory((prev) => [...prev, { type, content }]);
    },
    [],
  );

  const executeCommand = useCallback(
    (rawInput: string) => {
      const trimmed = rawInput.trim();
      if (!trimmed) return;

      // Add input to history display
      setHistory((prev) => [
        ...prev,
        { type: "input", content: `> ${trimmed}` },
      ]);

      // Add to command history for arrow key navigation
      setCommandHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);

      // Parse command and args
      const [cmd, ...args] = trimmed.toLowerCase().split(/\s+/);

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

        case "openModal":
          if (command.payload) {
            openModal(command.payload as ActionType);
            closeTerminal();
          }
          break;

        case "openDialog":
          addOutput("Starting conversation...");
          setTimeout(() => {
            openDialog(command.payload as string);
            closeTerminal();
          }, 300);
          break;

        case "downloadResume":
          addOutput(
            "Opening resume download...\n(Resume PDF would download here)",
          );
          // TODO: Implement actual download
          break;

        case "clearTerminal":
          setHistory([{ type: "output", content: WELCOME_MESSAGE }]);
          break;

        case "listSections":
          addOutput(getListSections());
          break;

        case "navigate":
          if (args.length === 0) {
            addOutput("Usage: cd <section>\nExample: cd projects", "error");
          } else {
            const section = args[0].replace("/", "");
            const sectionCommand = TERMINAL_COMMANDS[section];
            if (sectionCommand && sectionCommand.action === "openModal") {
              addOutput(`Navigating to ${section}...`);
              setTimeout(() => {
                openModal(sectionCommand.payload as ActionType);
                closeTerminal();
              }, 500);
            } else {
              addOutput(
                `Section not found: ${section}\nUse 'ls' to see available sections.`,
                "error",
              );
            }
          }
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
    [addOutput, openModal, closeTerminal, openDialog],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "Enter":
          executeCommand(input);
          setInput("");
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
    [input, commandHistory, historyIndex, executeCommand, addOutput],
  );

  return {
    history,
    input,
    setInput,
    handleKeyDown,
    executeCommand,
    inputRef,
  };
}
