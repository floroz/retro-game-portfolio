import { describe, test, expect, beforeEach, vi } from "vitest";
import { useGameStore } from "../gameStore";

describe("gameStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const store = useGameStore.getState();
    store.setHoveredObject(null);
    store.closeContent();
    store.closeDialog();
    useGameStore.setState({
      welcomeShown: false,
      dialogNode: "", // Reset dialog node
      visitedNodes: new Set(),
      gameWindowActive: true,
      soundEnabled: false,
      currentScene: "hall",
    });
  });

  describe("World state", () => {
    test("should start in the Hall", () => {
      expect(useGameStore.getState().currentScene).toBe("hall");
    });

    test("should track the current scene", () => {
      useGameStore.getState().setCurrentScene("zurich");
      expect(useGameStore.getState().currentScene).toBe("zurich");
    });
  });

  describe("Interaction state", () => {
    test("should initialize with default interaction state", () => {
      const state = useGameStore.getState();

      expect(state.hoveredObject).toBeNull();
      expect(state.contentSection).toBeNull();
    });

    test("should set hovered object", () => {
      const store = useGameStore.getState();

      store.setHoveredObject("computer");
      expect(useGameStore.getState().hoveredObject).toBe("computer");

      store.setHoveredObject(null);
      expect(useGameStore.getState().hoveredObject).toBeNull();
    });

    test("should open the content screen for a section", () => {
      const store = useGameStore.getState();

      store.openContent("about");

      const state = useGameStore.getState();
      expect(state.contentSection).toBe("about");
    });

    test("should open dialog instead of the content screen for talk action", () => {
      const store = useGameStore.getState();

      store.openContent("talk");

      const state = useGameStore.getState();
      expect(state.contentSection).toBeNull();
      expect(state.dialogOpen).toBe(true);
      expect(state.dialogNode).toBe("intro");
    });

    test("should close the content screen and reset state", () => {
      const store = useGameStore.getState();

      // Open the content screen first
      store.openContent("about");
      expect(useGameStore.getState().contentSection).toBe("about");

      // Close the content screen
      store.closeContent();

      const state = useGameStore.getState();
      expect(state.contentSection).toBeNull();
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
      store.openContent("about");

      const state = useGameStore.getState();
      expect(state.contentSection).toBe("about");
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
      expect(state.contentSection).toBeNull();
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

describe("object inspections", () => {
  test("inspection, section and conversation are mutually exclusive", () => {
    const store = useGameStore.getState();
    const item = {
      title: "Souvenir",
      art: "/test.png",
      artAlt: "Souvenir",
      paragraphs: ["A keepsake."],
    };
    store.openContent("about");
    store.openInspection(item);
    expect(useGameStore.getState()).toMatchObject({
      inspection: item,
      contentSection: null,
      dialogOpen: false,
    });
    store.openContent("skills");
    expect(useGameStore.getState()).toMatchObject({
      inspection: null,
      contentSection: "skills",
    });
    store.openInspection(item);
    store.openDialog("intro");
    expect(useGameStore.getState()).toMatchObject({
      inspection: null,
      contentSection: null,
      dialogOpen: true,
    });
    store.openInspection(item);
    store.closeContent();
    expect(useGameStore.getState().inspection).toBeNull();
  });
});
