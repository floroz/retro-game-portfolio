import { useCallback } from "react";
import { useGameStore } from "../store/gameStore";
import { OBJECTS } from "../config/scene";
import type { ActionType } from "../types/game";

/**
 * Hook to handle clicks on interactive objects in the scene
 */
export function useSceneClick() {
  const {
    triggerAction,
    setHoveredObject,
    hoveredObject,
    modalOpen,
    terminalOpen,
    gameWindowActive,
  } = useGameStore();

  const handleObjectClick = useCallback(
    (objectId: string) => {
      // Don't handle clicks if modal is open
      if (modalOpen) return;

      // Don't handle clicks if terminal is open UNLESS the game window is active
      if (terminalOpen && !gameWindowActive) return;

      const object = OBJECTS.find((obj) => obj.id === objectId);
      if (!object) return;

      triggerAction(object.action, object.interactionPoint);
    },
    [triggerAction, modalOpen, terminalOpen, gameWindowActive],
  );

  const handleObjectHover = useCallback(
    (objectId: string | null) => {
      setHoveredObject(objectId);
    },
    [setHoveredObject],
  );

  const handleActionClick = useCallback(
    (action: ActionType) => {
      // Don't handle clicks if modal is open
      if (modalOpen) return;

      // Don't handle clicks if terminal is open UNLESS the game window is active
      if (terminalOpen && !gameWindowActive) return;

      const object = OBJECTS.find((obj) => obj.action === action);
      if (!object) return;

      triggerAction(action, object.interactionPoint);
    },
    [triggerAction, modalOpen, terminalOpen, gameWindowActive],
  );

  return {
    hoveredObject,
    handleObjectClick,
    handleObjectHover,
    handleActionClick,
  };
}
