import { useEffect, useRef } from "react";
import { DIALOG_TREE } from "../config/dialogTrees";
import { getEngine } from "../engine/runtime";
import { useGameStore } from "../store/gameStore";

/**
 * Runs the conversation in the scene, as MI3 does: Daniele says each line
 * over his head, in the bitmap serif, talking while he says it, and holds
 * it there. Once he's done, or the visitor skips ahead, the line's choices
 * come up in the trunk's place (toolbar/Dialogue.tsx).
 *
 * When the conversation ends, Daniele greets the visitor with the Hall's
 * entry line, once: the intro conversation has to be out of the way first.
 */
export function useConversation() {
  const dialogOpen = useGameStore((s) => s.dialogOpen);
  const dialogNode = useGameStore((s) => s.dialogNode);
  const introSeen = useRef(false);

  useEffect(() => {
    const engine = getEngine();
    if (!dialogOpen) {
      if (introSeen.current) engine.greet();
      return;
    }
    introSeen.current = true;
    const node = DIALOG_TREE[dialogNode];
    if (!node) return;
    const { setDialogReady, closeDialog } = useGameStore.getState();
    engine.converse(
      node.text,
      () => setDialogReady(true),
      () => closeDialog(),
    );
    // Whatever ends the line takes it down: the next line, or the end.
    return () => engine.endConversation();
  }, [dialogOpen, dialogNode]);
}
