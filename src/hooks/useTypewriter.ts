import { useCallback, useRef, useReducer, useEffect } from "react";

/**
 * Get the typewriter speed from environment variable or use default.
 * Set VITE_TYPEWRITER_SPEED=0 to disable typewriter animation (instant text).
 * This is useful for E2E tests to avoid timing issues.
 */
function getTypewriterSpeed(optionSpeed?: number): number {
  const envSpeed = import.meta.env.VITE_TYPEWRITER_SPEED;
  if (envSpeed !== undefined) {
    const parsed = parseInt(envSpeed, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return optionSpeed ?? 40; // Default: 40 characters per second
}

interface UseTypewriterOptions {
  /** Characters per second (default: 40, set to 0 for instant) */
  speed?: number;
  /** Callback fired for each character typed */
  onType?: () => void;
  /** Callback fired when typing completes */
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  /** Currently displayed text */
  displayedText: string;
  /** Whether typing is in progress */
  isTyping: boolean;
  /** Skip to show full text immediately */
  skip: () => void;
  /** Reset and start typing new text */
  reset: (newText: string) => void;
  /** Stop typing immediately without completing */
  stop: () => void;
}

interface TypewriterState {
  displayedText: string;
  isTyping: boolean;
  targetText: string;
  charIndex: number;
}

type TypewriterAction =
  | { type: "RESET"; payload: string }
  | { type: "TYPE_CHAR"; payload: string }
  | { type: "COMPLETE" }
  | { type: "SKIP" };

function typewriterReducer(
  state: TypewriterState,
  action: TypewriterAction,
): TypewriterState {
  switch (action.type) {
    case "RESET":
      return {
        displayedText: "",
        isTyping: action.payload.length > 0,
        targetText: action.payload,
        charIndex: 0,
      };
    case "TYPE_CHAR":
      return {
        ...state,
        displayedText: state.displayedText + action.payload,
        charIndex: state.charIndex + 1,
      };
    case "COMPLETE":
      return {
        ...state,
        isTyping: false,
      };
    case "SKIP":
      return {
        ...state,
        displayedText: state.targetText,
        isTyping: false,
        charIndex: state.targetText.length,
      };
    default:
      return state;
  }
}

function createInitialState(text: string): TypewriterState {
  return {
    displayedText: "",
    isTyping: text.length > 0,
    targetText: text,
    charIndex: 0,
  };
}

/**
 * Typewriter effect hook for adventure game dialog
 * Types out text character by character with configurable speed.
 *
 * Set VITE_TYPEWRITER_SPEED=0 in environment to disable animation (instant text).
 * This is useful for E2E tests to avoid timing issues.
 */
export function useTypewriter(
  text: string,
  options: UseTypewriterOptions = {},
): UseTypewriterReturn {
  const { speed: optionSpeed, onType, onComplete } = options;
  const speed = getTypewriterSpeed(optionSpeed);

  // If speed is 0, show text instantly (useful for E2E tests)
  const isInstant = speed === 0;

  const [state, dispatch] = useReducer(
    typewriterReducer,
    text,
    createInitialState,
  );

  // Use refs for interval and callbacks
  const intervalRef = useRef<number | null>(null);
  const onTypeRef = useRef(onType);
  const onCompleteRef = useRef(onComplete);
  const prevTextRef = useRef(text);

  // Keep callback refs updated in effect
  useEffect(() => {
    onTypeRef.current = onType;
    onCompleteRef.current = onComplete;
  });

  // Clear any existing interval
  const clearTypingInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reset when text prop changes
  useEffect(() => {
    if (prevTextRef.current !== text) {
      prevTextRef.current = text;
      clearTypingInterval();
      dispatch({ type: "RESET", payload: text });
    }
  }, [text, clearTypingInterval]);

  // Handle typing animation
  useEffect(() => {
    if (!state.isTyping || !state.targetText) {
      return;
    }

    // If instant mode, skip directly to full text
    if (isInstant) {
      dispatch({ type: "SKIP" });
      onCompleteRef.current?.();
      return;
    }

    const delay = 1000 / speed;
    const targetLength = state.targetText.length;
    const targetText = state.targetText;

    // Use a mutable ref to track current character index
    let currentCharIndex = state.charIndex;

    intervalRef.current = window.setInterval(() => {
      if (currentCharIndex < targetLength) {
        const nextChar = targetText[currentCharIndex];
        currentCharIndex++;
        dispatch({ type: "TYPE_CHAR", payload: nextChar });
        onTypeRef.current?.();
      } else {
        clearTypingInterval();
        dispatch({ type: "COMPLETE" });
        onCompleteRef.current?.();
      }
    }, delay);

    return clearTypingInterval;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isTyping, state.targetText, speed, isInstant, clearTypingInterval]);

  // Skip to full text
  const skip = useCallback(() => {
    clearTypingInterval();
    dispatch({ type: "SKIP" });
    onCompleteRef.current?.();
  }, [clearTypingInterval]);

  // Reset with new text
  const reset = useCallback(
    (newText: string) => {
      clearTypingInterval();
      dispatch({ type: "RESET", payload: newText });
    },
    [clearTypingInterval],
  );

  // Stop typing immediately without completing (for cleanup)
  const stop = useCallback(() => {
    clearTypingInterval();
    dispatch({ type: "COMPLETE" });
  }, [clearTypingInterval]);

  return {
    displayedText: state.displayedText,
    isTyping: state.isTyping,
    skip,
    reset,
    stop,
  };
}
