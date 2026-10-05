import { useEffect, useState } from "react";
import { loadAdventureFont } from "../engine/lettering";

/** Static canvases must repaint after the face loads (or use the fallback). */
export function useAdventureFont() {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let active = true;
    void loadAdventureFont().then(() => {
      if (active) setSettled(true);
    });
    return () => {
      active = false;
    };
  }, []);
  return settled;
}
