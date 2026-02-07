import { expect, test, describe } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Win95TerminalWindow } from "../Win95TerminalWindow";
import { useMobileTerminal } from "../../../hooks/useMobileTerminal";

/**
 * Test wrapper component that provides full terminal functionality
 * Uses the real useMobileTerminal hook for integration testing
 */
function TerminalTestWrapper(
  props?: Partial<{
    onClose: () => void;
    onFocus: () => void;
  }>,
) {
  const terminalHook = useMobileTerminal();

  return (
    <Win95TerminalWindow
      history={terminalHook.history}
      input={terminalHook.input}
      setInput={terminalHook.setInput}
      handleKeyDown={terminalHook.handleKeyDown}
      executeInput={terminalHook.executeInput}
      inputRef={terminalHook.inputRef as React.RefObject<HTMLInputElement>}
      currentDialogMessage={terminalHook.currentDialogMessage}
      isTyping={terminalHook.isTyping}
      skipTypewriter={terminalHook.skipTypewriter}
      onClose={props?.onClose ?? (() => {})}
      isActive={true}
      onFocus={props?.onFocus ?? (() => {})}
      zIndex={100}
    />
  );
}

describe("Win95 Terminal Window - Browser Tests", () => {
  describe("Suite 1: Terminal Rendering", () => {
    test("TC-001: Initial Render", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      // Verify terminal window is visible
      const terminalWindow = container.querySelector(
        '[data-e2e="win95-terminal-window"]',
      );
      expect(terminalWindow).toBeTruthy();

      // Verify terminal output area exists
      const terminalOutput = container.querySelector(
        '[data-e2e="terminal-output"]',
      );
      expect(terminalOutput).toBeTruthy();

      // Verify input field exists
      const inputField = container.querySelector('[data-e2e="terminal-input"]');
      expect(inputField).toBeTruthy();
    });
  });

  describe("Suite 2: Command Execution", () => {
    test("TC-004: Help Command", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      // Get the input field
      const inputField = container.querySelector(
        '[data-e2e="terminal-input"]',
      ) as HTMLInputElement;
      expect(inputField).toBeTruthy();

      // Type "help" command
      await userEvent.fill(inputField, "help");

      // Press Enter
      await userEvent.keyboard("{Enter}");

      // Wait a bit for command to execute
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify output contains help text
      const terminalOutput = container.querySelector(
        '[data-e2e="terminal-output"]',
      );
      const outputText = terminalOutput?.textContent || "";
      expect(outputText).toContain("> help");
      expect(outputText).toContain("Available commands:");
      expect(outputText).toContain("about");
      expect(outputText).toContain("skills");
    });

    test("TC-005: About Command", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      const inputField = container.querySelector(
        '[data-e2e="terminal-input"]',
      ) as HTMLInputElement;

      await userEvent.fill(inputField, "about");
      await userEvent.keyboard("{Enter}");
      await new Promise((resolve) => setTimeout(resolve, 100));

      const terminalOutput = container.querySelector(
        '[data-e2e="terminal-output"]',
      );
      const outputText = terminalOutput?.textContent || "";
      expect(outputText).toContain("> about");
      expect(outputText).toContain("About");
    });

    test("TC-012: Invalid Command", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      const inputField = container.querySelector(
        '[data-e2e="terminal-input"]',
      ) as HTMLInputElement;

      await userEvent.fill(inputField, "invalidcommand");
      await userEvent.keyboard("{Enter}");
      await new Promise((resolve) => setTimeout(resolve, 100));

      const terminalOutput = container.querySelector(
        '[data-e2e="terminal-output"]',
      );
      const outputText = terminalOutput?.textContent || "";
      expect(outputText).toContain("> invalidcommand");
      expect(outputText).toContain("Command not found");
    });

    test("TC-013: Case Insensitivity", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      const inputField = container.querySelector(
        '[data-e2e="terminal-input"]',
      ) as HTMLInputElement;

      await userEvent.fill(inputField, "HELP");
      await userEvent.keyboard("{Enter}");
      await new Promise((resolve) => setTimeout(resolve, 100));

      const terminalOutput = container.querySelector(
        '[data-e2e="terminal-output"]',
      );
      const outputText = terminalOutput?.textContent || "";
      expect(outputText).toContain("> HELP");
      expect(outputText).toContain("Available commands:");
    });
  });

  describe("Suite 3: Keyboard Navigation", () => {
    test("TC-016: Arrow Up - Previous Command", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      const inputField = container.querySelector(
        '[data-e2e="terminal-input"]',
      ) as HTMLInputElement;

      // Execute a command
      await userEvent.fill(inputField, "help");
      await userEvent.keyboard("{Enter}");
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Execute another command
      await userEvent.fill(inputField, "about");
      await userEvent.keyboard("{Enter}");
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Press Arrow Up
      await userEvent.keyboard("{ArrowUp}");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify input contains "about"
      expect(inputField.value).toBe("about");
    });

    test("TC-019: Arrow Down - Clear at End", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      const inputField = container.querySelector(
        '[data-e2e="terminal-input"]',
      ) as HTMLInputElement;

      // Execute a command
      await userEvent.fill(inputField, "help");
      await userEvent.keyboard("{Enter}");
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Press Arrow Up (input = "help")
      await userEvent.keyboard("{ArrowUp}");
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(inputField.value).toBe("help");

      // Press Arrow Down (should clear)
      await userEvent.keyboard("{ArrowDown}");
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(inputField.value).toBe("");
    });

    test("TC-021: Tab Completion - Single Match", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      const inputField = container.querySelector(
        '[data-e2e="terminal-input"]',
      ) as HTMLInputElement;

      // Type partial command
      await userEvent.fill(inputField, "ski");

      // Press Tab
      await userEvent.keyboard("{Tab}");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify auto-complete to "skills"
      expect(inputField.value).toBe("skills");
    });

    test("TC-022: Tab Completion - Multiple Matches", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      const inputField = container.querySelector(
        '[data-e2e="terminal-input"]',
      ) as HTMLInputElement;

      // Type partial command with multiple matches
      await userEvent.fill(inputField, "e");

      // Press Tab
      await userEvent.keyboard("{Tab}");
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify suggestions shown
      const terminalOutput = container.querySelector(
        '[data-e2e="terminal-output"]',
      );
      const outputText = terminalOutput?.textContent || "";
      expect(outputText).toContain("Possible commands:");
      expect(outputText).toContain("experience");
      expect(outputText).toContain("exit");

      // Verify input unchanged
      expect(inputField.value).toBe("e");
    });
  });

  describe("Suite 4: Dialog System", () => {
    test("TC-026: Dialog Trigger", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      const inputField = container.querySelector(
        '[data-e2e="terminal-input"]',
      ) as HTMLInputElement;

      // Execute talk command
      await userEvent.fill(inputField, "talk");
      await userEvent.keyboard("{Enter}");

      // Wait for dialog to appear
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify starting message
      const terminalOutput = container.querySelector(
        '[data-e2e="terminal-output"]',
      );
      const outputText = terminalOutput?.textContent || "";
      expect(outputText).toContain("Starting conversation");

      // Verify dialog agent message appears
      const dialogMessages = container.querySelectorAll(
        '[data-e2e="dialog-agent-message"]',
      );
      expect(dialogMessages.length).toBeGreaterThan(0);
    });

    test("TC-030: Dialog Option Selection - Type Number", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      const inputField = container.querySelector(
        '[data-e2e="terminal-input"]',
      ) as HTMLInputElement;

      // Execute talk command
      await userEvent.fill(inputField, "talk");
      await userEvent.keyboard("{Enter}");
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify options appear
      const dialogOptions = container.querySelectorAll(
        '[data-e2e="dialog-option"]',
      );
      expect(dialogOptions.length).toBeGreaterThan(0);

      // Type "1" to select first option
      await userEvent.fill(inputField, "1");
      await userEvent.keyboard("{Enter}");
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify next dialog node appears (more dialog messages)
      const dialogMessagesAfter = container.querySelectorAll(
        '[data-e2e="dialog-agent-message"]',
      );
      expect(dialogMessagesAfter.length).toBeGreaterThan(1);
    });

    test("TC-031: Dialog Option Selection - Invalid Number", async () => {
      const { container } = await render(<TerminalTestWrapper />);

      const inputField = container.querySelector(
        '[data-e2e="terminal-input"]',
      ) as HTMLInputElement;

      // Execute talk command
      await userEvent.fill(inputField, "talk");
      await userEvent.keyboard("{Enter}");
      await new Promise((resolve) => setTimeout(resolve, 200));

      const dialogMessagesBefore = container.querySelectorAll(
        '[data-e2e="dialog-agent-message"]',
      );
      const countBefore = dialogMessagesBefore.length;

      // Type invalid option number
      await userEvent.fill(inputField, "99");
      await userEvent.keyboard("{Enter}");
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify no new dialog appears (invalid selection treated as command)
      const dialogMessagesAfter = container.querySelectorAll(
        '[data-e2e="dialog-agent-message"]',
      );
      expect(dialogMessagesAfter.length).toBe(countBefore);

      // Input should be cleared
      expect(inputField.value).toBe("");
    });
  });
});
