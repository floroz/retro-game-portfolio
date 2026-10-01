import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { Win95LoadingWidget } from "../Win95LoadingWidget";

function setup() {
  vi.useFakeTimers();
  const props = {
    onCancel: vi.fn(),
    onComplete: vi.fn(),
    onFocus: vi.fn(),
    isActive: true,
    zIndex: 100,
  };
  return { ...render(<Win95LoadingWidget {...props} />), props };
}

describe("Windows 98 launch dialog", () => {
  test("reports progress and completes exactly once", () => {
    const { props } = setup();
    const progress = screen.getByRole("progressbar");
    expect(progress.getAttribute("aria-valuenow")).toBe("0");
    act(() => vi.advanceTimersByTime(750));
    expect(Number(progress.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
    expect(props.onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(850));
    expect(progress.getAttribute("aria-valuenow")).toBe(
      progress.getAttribute("aria-valuemax"),
    );
    expect(props.onComplete).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(5000));
    expect(props.onComplete).toHaveBeenCalledOnce();
  });

  test.each(["Cancel", "Cancel loading"])(
    "%s cancels without a delayed launch after unmount",
    (name) => {
      const { props, unmount } = setup();
      act(() => vi.advanceTimersByTime(500));
      fireEvent.click(screen.getByRole("button", { name }));
      expect(props.onCancel).toHaveBeenCalledOnce();
      unmount();
      act(() => vi.advanceTimersByTime(5000));
      expect(props.onComplete).not.toHaveBeenCalled();
    },
  );

  test("uses the current completion callback without restarting progress", () => {
    const { props, rerender } = setup();
    act(() => vi.advanceTimersByTime(1000));
    const latest = vi.fn();
    rerender(<Win95LoadingWidget {...props} onComplete={latest} />);
    act(() => vi.advanceTimersByTime(600));
    expect(latest).toHaveBeenCalledOnce();
    expect(props.onComplete).not.toHaveBeenCalled();
  });
});
