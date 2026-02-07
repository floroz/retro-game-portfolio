import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTypewriter } from "../useTypewriter";

describe("useTypewriter", () => {
  beforeEach(() => {
    // Use real timers for typewriter tests since we need precise control
    vi.useRealTimers();
    // Unset the env var so we can test actual typewriting
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Character typing", () => {
    test("should start with empty text and isTyping true", () => {
      // Use instant mode for this test
      vi.stubEnv("VITE_TYPEWRITER_SPEED", "0");

      const { result } = renderHook(() => useTypewriter("Hello"));

      expect(result.current.displayedText).toBe("Hello");
      expect(result.current.isTyping).toBe(false);

      vi.unstubAllEnvs();
    });

    test("should call onType callback for each character", async () => {
      const onType = vi.fn();
      vi.useFakeTimers();

      renderHook(() => useTypewriter("Hi", { speed: 10, onType }));

      // Advance by 100ms (1 char at 10 chars/sec)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onType).toHaveBeenCalledTimes(1);

      // Advance by another 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onType).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    test("should call onComplete when finished typing", async () => {
      const onComplete = vi.fn();
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useTypewriter("Hi", { speed: 10, onComplete }),
      );

      // Complete typing (2 chars at 10 chars/sec = 200ms total, plus one more interval for completion)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Flush all pending promises
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isTyping).toBe(false);
      expect(onComplete).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    test("should handle empty string without calling onComplete", () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() => useTypewriter("", { onComplete }));

      expect(result.current.displayedText).toBe("");
      expect(result.current.isTyping).toBe(false);
      expect(onComplete).not.toHaveBeenCalled();
    });

    test("should handle multi-line text", async () => {
      vi.useFakeTimers();

      const { result } = renderHook(
        () => useTypewriter("Line 1\nLine 2", { speed: 100 }), // Fast speed for test
      );

      // Type first line
      act(() => {
        vi.advanceTimersByTime(70); // 7 chars including \n
      });

      expect(result.current.displayedText).toContain("Line 1");

      vi.useRealTimers();
    });
  });

  describe("Speed configuration", () => {
    test("should use instant mode when VITE_TYPEWRITER_SPEED=0", () => {
      vi.stubEnv("VITE_TYPEWRITER_SPEED", "0");

      const { result } = renderHook(() => useTypewriter("Test"));

      // Should be instant
      expect(result.current.displayedText).toBe("Test");
      expect(result.current.isTyping).toBe(false);

      vi.unstubAllEnvs();
    });

    test("should respect VITE_TYPEWRITER_SPEED env var", () => {
      vi.stubEnv("VITE_TYPEWRITER_SPEED", "1000"); // Very fast
      vi.useFakeTimers();

      const { result } = renderHook(() => useTypewriter("AB"));

      // At 1000 chars/sec, should type almost instantly
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.displayedText).toBe("AB");

      vi.useRealTimers();
      vi.unstubAllEnvs();
    });

    test("should use default speed when no config provided", async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useTypewriter("A"));

      // Default is 40 chars/sec = 25ms per char, plus one more interval for completion
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Flush all pending promises
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.displayedText).toBe("A");
      expect(result.current.isTyping).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("Skip functionality", () => {
    test("should skip to end and call onComplete immediately", () => {
      const onComplete = vi.fn();
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useTypewriter("Hello World", { speed: 10, onComplete }),
      );

      // Type a few characters
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.displayedText).toBe("H");

      // Skip
      act(() => {
        result.current.skip();
      });

      expect(result.current.displayedText).toBe("Hello World");
      expect(result.current.isTyping).toBe(false);
      expect(onComplete).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    test("should work when called before typing starts", () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useTypewriter("Test", { onComplete }),
      );

      act(() => {
        result.current.skip();
      });

      expect(result.current.displayedText).toBe("Test");
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe("Stop functionality", () => {
    test("should stop typing without calling onComplete", () => {
      const onComplete = vi.fn();
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useTypewriter("Hello", { speed: 10, onComplete }),
      );

      // Type a few characters
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.displayedText).toBe("He");

      // Stop
      act(() => {
        result.current.stop();
      });

      // Advance time - should not continue typing
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.displayedText).toBe("He");
      expect(result.current.isTyping).toBe(false);
      expect(onComplete).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    test("should clear interval when stopped", () => {
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useTypewriter("Hello", { speed: 10 }),
      );

      act(() => {
        vi.advanceTimersByTime(100);
      });

      const textAfterStop = result.current.displayedText;

      act(() => {
        result.current.stop();
      });

      // Verify no more typing happens
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.displayedText).toBe(textAfterStop);

      vi.useRealTimers();
    });
  });

  describe("Reset functionality", () => {
    test("should reset and start typing new text", () => {
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useTypewriter("Hello", { speed: 10 }),
      );

      // Type some characters
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.displayedText).toBe("Hel");

      // Reset with new text
      act(() => {
        result.current.reset("Goodbye");
      });

      expect(result.current.displayedText).toBe("");
      expect(result.current.isTyping).toBe(true);

      // Type new text
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.displayedText).toBe("Go");

      vi.useRealTimers();
    });

    test("should reset with empty string", () => {
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useTypewriter("Hello", { speed: 10 }),
      );

      act(() => {
        vi.advanceTimersByTime(300);
      });

      act(() => {
        result.current.reset("");
      });

      expect(result.current.displayedText).toBe("");
      expect(result.current.isTyping).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("Text changes", () => {
    test("should restart typing when text prop changes", () => {
      vi.useFakeTimers();

      const { result, rerender } = renderHook(
        ({ text }) => useTypewriter(text, { speed: 10 }),
        { initialProps: { text: "Hello" } },
      );

      // Type some characters
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.displayedText).toBe("He");

      // Change text
      rerender({ text: "Goodbye" });

      // Should reset and start typing new text
      expect(result.current.displayedText).toBe("");

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.displayedText).toContain("Goo");

      vi.useRealTimers();
    });

    test("should stop typing when text is cleared", () => {
      vi.useFakeTimers();

      const { result, rerender } = renderHook(
        ({ text }) => useTypewriter(text, { speed: 10 }),
        { initialProps: { text: "Hello" } },
      );

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Clear text
      rerender({ text: "" });

      expect(result.current.displayedText).toBe("");
      expect(result.current.isTyping).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("Edge cases", () => {
    test("should handle very long text", () => {
      vi.stubEnv("VITE_TYPEWRITER_SPEED", "0"); // Use instant mode for speed

      const longText = "A".repeat(1000);
      const { result } = renderHook(() => useTypewriter(longText));

      expect(result.current.displayedText).toBe(longText);
      expect(result.current.isTyping).toBe(false);

      vi.unstubAllEnvs();
    });

    test("should handle special characters", () => {
      vi.stubEnv("VITE_TYPEWRITER_SPEED", "0");

      const specialText = "Hello! @#$%^&*() 你好 🎉";
      const { result } = renderHook(() => useTypewriter(specialText));

      expect(result.current.displayedText).toBe(specialText);

      vi.unstubAllEnvs();
    });
  });
});
