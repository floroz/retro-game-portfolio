import { describe, test, expect, beforeEach, vi } from "vitest";
import { useGameStore } from "../gameStore";

describe("gameStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const store = useGameStore.getState();
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
      currentScene: "hall",
      sceneRequest: null,
    });
  });

  describe("World state", () => {
    test("should start in the Hall with no pending trip", () => {
      const state = useGameStore.getState();
      expect(state.currentScene).toBe("hall");
      expect(state.sceneRequest).toBeNull();
    });

    test("should track the current scene", () => {
      useGameStore.getState().setCurrentScene("zurich");
      expect(useGameStore.getState().currentScene).toBe("zurich");
    });

    test("should post a section shortcut and clear overlays", () => {
      const store = useGameStore.getState();
      store.openTerminalScreen("about");
      store.goToSection("skills");

      const state = useGameStore.getState();
      expect(state.sceneRequest).toMatchObject({
        kind: "section",
        section: "skills",
      });
      expect(state.terminalScreenAction).toBeNull();
      expect(state.dialogOpen).toBe(false);
    });

    test("should post a travel request", () => {
      useGameStore.getState().travelTo("sorrento");
      expect(useGameStore.getState().sceneRequest).toMatchObject({
        kind: "travel",
        scene: "sorrento",
      });
    });

    test("should hand each request over once", () => {
      const store = useGameStore.getState();
      store.goToSection("resume");
      const first = store.takeSceneRequest();
      expect(first).toMatchObject({ kind: "section", section: "resume" });
      expect(useGameStore.getState().takeSceneRequest()).toBeNull();
    });

    test("should give every request a new id", () => {
      const store = useGameStore.getState();
      store.goToSection("about");
      const a = store.takeSceneRequest();
      store.goToSection("about");
      const b = useGameStore.getState().takeSceneRequest();
      expect(a?.id).not.toBe(b?.id);
    });
  });

  describe("Interaction state", () => {
    test("should initialize with default interaction state", () => {
      const state = useGameStore.getState();

      expect(state.hoveredObject).toBeNull();
      expect(state.terminalScreenAction).toBeNull();
    });

    test("should set hovered object", () => {
      const store = useGameStore.getState();

      store.setHoveredObject("computer");
      expect(useGameStore.getState().hoveredObject).toBe("computer");

      store.setHoveredObject(null);
      expect(useGameStore.getState().hoveredObject).toBeNull();
    });

    test("should open terminal screen with action", () => {
      const store = useGameStore.getState();

      store.openTerminalScreen("about");

      const state = useGameStore.getState();
      expect(state.terminalScreenAction).toBe("about");
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

    test("a line's choices are up only once Daniele has said it", () => {
      const store = useGameStore.getState();

      store.openDialog("intro");
      expect(useGameStore.getState().dialogReady).toBe(false);

      store.setDialogReady(true);
      expect(useGameStore.getState().dialogReady).toBe(true);

      // Choosing an option moves to the next line, which he has to say.
      store.selectDialogOption("intro-2");
      expect(useGameStore.getState().dialogNode).toBe("intro-2");
      expect(useGameStore.getState().dialogReady).toBe(false);

      store.setDialogReady(true);
      store.selectDialogOption("__close__");
      expect(useGameStore.getState().dialogOpen).toBe(false);
      expect(useGameStore.getState().dialogReady).toBe(false);
    });

    test("opening the line already being said leaves its choices up", () => {
      const store = useGameStore.getState();

      store.openDialog("intro");
      store.setDialogReady(true);
      store.openDialog("intro");
      expect(useGameStore.getState().dialogReady).toBe(true);

      // A different line has to be said first.
      store.openDialog("welcome");
      expect(useGameStore.getState().dialogReady).toBe(false);
    });

    test("opening a content screen ends the conversation", () => {
      const store = useGameStore.getState();

      store.openDialog("intro");
      store.setDialogReady(true);
      store.openTerminalScreen("about");

      const state = useGameStore.getState();
      expect(state.terminalScreenAction).toBe("about");
      expect(state.dialogOpen).toBe(false);
      expect(state.dialogReady).toBe(false);
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
