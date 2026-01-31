import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Hook to detect if the user is on a mobile device
 * Uses both viewport width and touch capability for detection
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // Initial check during SSR/first render
    if (typeof window === "undefined") return false;

    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isNarrow = window.innerWidth < MOBILE_BREAKPOINT;

    // Consider mobile if narrow viewport OR touch device with narrow viewport
    // This avoids false positives on touch-enabled laptops
    return isNarrow || (hasTouch && window.innerWidth < 1024);
  });

  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isNarrow = window.innerWidth < MOBILE_BREAKPOINT;

      // Consider mobile if narrow viewport OR touch device with narrow viewport
      setIsMobile(isNarrow || (hasTouch && window.innerWidth < 1024));
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}
