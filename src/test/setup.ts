import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.useRealTimers();
});

// Mock environment variables for tests
vi.stubEnv("VITE_TYPEWRITER_SPEED", "0"); // Instant typewriter for tests
