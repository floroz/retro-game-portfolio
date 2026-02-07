import { useEffect, useCallback, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import {
  CHARACTER_SPEED,
  MAX_TRAVEL_TIME,
  clampToWalkableArea,
  VIEWPORT,
} from "../config/scene";

const ARRIVAL_THRESHOLD = 5; // Distance in pixels to consider "arrived"

// Track which movement keys are currently pressed
type DirectionKey = "left" | "right" | "up" | "down";

/**
 * Hook to handle character movement animation and input
 */
export function useCharacterMovement() {
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const initialDistanceRef = useRef<number>(0);

  // Track held keys for continuous keyboard movement
  const heldKeysRef = useRef<Set<DirectionKey>>(new Set());
  const keyboardAnimationRef = useRef<number | null>(null);
  const lastKeyboardTimeRef = useRef<number>(0);

  const {
    characterPosition,
    targetPosition,
    moveTo,
    stopMovement,
    terminalScreenAction,
    terminalOpen,
    gameWindowActive,
  } = useGameStore();

  // Animation loop for smooth movement
  useEffect(() => {
    if (!targetPosition) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      initialDistanceRef.current = 0;
      return;
    }

    // Calculate initial distance for speed calculation
    const store = useGameStore.getState();
    const dx = targetPosition.x - store.characterPosition.x;
    const dy = targetPosition.y - store.characterPosition.y;
    initialDistanceRef.current = Math.sqrt(dx * dx + dy * dy);

    const animate = (currentTime: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = currentTime;

      const currentStore = useGameStore.getState();
      const {
        characterPosition: pos,
        targetPosition: target,
        pendingAction,
      } = currentStore;

      if (!target) return;

      // Calculate direction and distance
      const currentDx = target.x - pos.x;
      const currentDy = target.y - pos.y;
      const distance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);

      // Check if arrived
      if (distance < ARRIVAL_THRESHOLD) {
        currentStore.setCharacterPosition(target);
        currentStore.onArrival();
        lastTimeRef.current = 0;
        initialDistanceRef.current = 0;
        return;
      }

      // Calculate speed: for button-triggered actions, ensure max 1.5s travel time
      // For free movement, use normal speed
      let speed = CHARACTER_SPEED;
      if (pendingAction && initialDistanceRef.current > 0) {
        // Calculate speed needed to cover initial distance in MAX_TRAVEL_TIME
        const requiredSpeed = initialDistanceRef.current / MAX_TRAVEL_TIME;
        // Use the higher of required speed or base speed
        speed = Math.max(requiredSpeed, CHARACTER_SPEED);
      }

      const moveDistance = speed * deltaTime;
      const ratio = Math.min(moveDistance / distance, 1);

      const newX = pos.x + currentDx * ratio;
      const newY = pos.y + currentDy * ratio;

      currentStore.setCharacterPosition({ x: newX, y: newY });

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetPosition]);

  // Handle scene click to move character
  const handleSceneClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Don't handle clicks if terminal screen is open
      if (terminalScreenAction) return;

      // Don't handle clicks if terminal is open UNLESS the game window is active
      if (terminalOpen && !gameWindowActive) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const scaleX = VIEWPORT.width / rect.width;
      const scaleY = VIEWPORT.sceneHeight / rect.height;

      // Convert click position to scene coordinates
      const clickX = (event.clientX - rect.left) * scaleX;
      const clickY = (event.clientY - rect.top) * scaleY;

      // Convert to "bottom" Y coordinate (scene uses bottom positioning)
      const bottomY = VIEWPORT.sceneHeight - clickY;

      // Clamp to walkable area
      const clamped = clampToWalkableArea(clickX, bottomY);

      moveTo(clamped);
    },
    [moveTo, terminalScreenAction, terminalOpen, gameWindowActive],
  );

  // Handle keyboard input for continuous character movement
  useEffect(() => {
    const keyToDirection: Record<string, DirectionKey> = {
      ArrowLeft: "left",
      a: "left",
      ArrowRight: "right",
      d: "right",
      ArrowUp: "up",
      w: "up",
      ArrowDown: "down",
      s: "down",
    };

    // Animation loop for continuous keyboard movement
    const animateKeyboardMovement = (currentTime: number) => {
      const store = useGameStore.getState();

      if (heldKeysRef.current.size === 0) {
        keyboardAnimationRef.current = null;
        lastKeyboardTimeRef.current = 0;
        // Set character back to idle when no keys are held
        store.setCharacterState("idle");
        return;
      }

      if (!lastKeyboardTimeRef.current) {
        lastKeyboardTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastKeyboardTimeRef.current) / 1000;
      lastKeyboardTimeRef.current = currentTime;

      const pos = store.characterPosition;
      const moveDistance = CHARACTER_SPEED * deltaTime;

      let dx = 0;
      let dy = 0;

      if (heldKeysRef.current.has("left")) {
        dx -= moveDistance;
        store.setCharacterDirection("left");
      }
      if (heldKeysRef.current.has("right")) {
        dx += moveDistance;
        store.setCharacterDirection("right");
      }
      if (heldKeysRef.current.has("up")) {
        dy += moveDistance;
      }
      if (heldKeysRef.current.has("down")) {
        dy -= moveDistance;
      }

      if (dx !== 0 || dy !== 0) {
        const newX = pos.x + dx;
        const newY = pos.y + dy;
        const clamped = clampToWalkableArea(newX, newY);
        store.setCharacterPosition(clamped);
        // Ensure character is in walking state while moving
        store.setCharacterState("walking");
      }

      keyboardAnimationRef.current = requestAnimationFrame(
        animateKeyboardMovement,
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keyboard movement if terminal screen is open
      if (terminalScreenAction) return;

      // Don't handle keyboard movement if terminal is open UNLESS the game window is active
      if (terminalOpen && !gameWindowActive) return;

      // Ignore if typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Handle escape to stop movement
      if (event.key === "Escape") {
        stopMovement();
        heldKeysRef.current.clear();
        useGameStore.getState().setCharacterState("idle");
        return;
      }

      const direction = keyToDirection[event.key];
      if (direction) {
        event.preventDefault();

        // Stop any click-based movement when using keyboard
        stopMovement();

        // Add key to held keys
        if (!heldKeysRef.current.has(direction)) {
          heldKeysRef.current.add(direction);

          // Set character to walking state
          useGameStore.getState().setCharacterState("walking");

          // Start animation loop if not already running
          if (!keyboardAnimationRef.current) {
            lastKeyboardTimeRef.current = 0;
            keyboardAnimationRef.current = requestAnimationFrame(
              animateKeyboardMovement,
            );
          }
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const direction = keyToDirection[event.key];
      if (direction) {
        heldKeysRef.current.delete(direction);
        // If no more keys are held, set to idle
        if (heldKeysRef.current.size === 0) {
          useGameStore.getState().setCharacterState("idle");
        }
      }
    };

    // Also clear keys when window loses focus
    const handleBlur = () => {
      heldKeysRef.current.clear();
      useGameStore.getState().setCharacterState("idle");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      if (keyboardAnimationRef.current) {
        cancelAnimationFrame(keyboardAnimationRef.current);
      }
    };
  }, [terminalScreenAction, terminalOpen, gameWindowActive, stopMovement]);

  return {
    characterPosition,
    targetPosition,
    handleSceneClick,
  };
}
