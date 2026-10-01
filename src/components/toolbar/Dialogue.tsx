import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { paintLettering } from "../../engine/lettering";
import styles from "./Toolbar.module.scss";
import { useGameStore } from "../../store/gameStore";
import { DIALOG_TREE } from "../../config/dialogTrees";
import { getEngine } from "../../engine/runtime";
import { useDialogSound } from "../../hooks/useDialogSound";
import type { DialogOption } from "../../types/game";
import { choiceRows, panelPct } from "./layout";
import { CANVAS_PANEL_H, CANVAS_PANEL_W, paintChoices } from "./paint";

/** Where a node with no options of its own leads: on, or out. */
const fallbackOptions = (autoAdvance?: string): DialogOption[] => [
  {
    id: "continue",
    label: "Continue...",
    nextNode: autoAdvance ?? "__close__",
  },
];

/**
 * The trunk's lid while Daniele talks with the visitor: as in MI3, the
 * dialogue choices take the place of the verbs. Daniele's line is spoken
 * over his head in the scene (Scene.tsx, `useConversation`); once he's said
 * it, its choices are set here as lines of clear text on a leather page, one
 * colour normally and a brighter one under the pointer or the keyboard.
 *
 * Keys: Up and Down move, Enter or Space chooses, 1 to 4 choose outright,
 * Enter or Space while Daniele is still talking skips ahead, and Escape
 * leaves. The choices are real buttons too, in Tab order.
 */
export function Dialogue() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dialogNode = useGameStore((s) => s.dialogNode);
  const ready = useGameStore((s) => s.dialogReady);
  const selectDialogOption = useGameStore((s) => s.selectDialogOption);
  const closeDialog = useGameStore((s) => s.closeDialog);
  const { playSelectSound, playConfirmSound } = useDialogSound();

  const node = DIALOG_TREE[dialogNode];
  const options = useMemo(
    () =>
      ready && node
        ? node.options?.length
          ? node.options
          : fallbackOptions(node.autoAdvance)
        : [],
    [ready, node],
  );

  // The pointer's and the keyboard's choice, for the node they belong to.
  const [point, setPoint] = useState<{
    node: string;
    hover: number | null;
    focus: number | null;
  }>({ node: dialogNode, hover: null, focus: null });
  const here = point.node === dialogNode;
  const hover = here ? point.hover : null;
  const focus = here ? point.focus : null;
  const active = hover ?? focus;

  const choose = useCallback(
    (option: DialogOption) => {
      playConfirmSound();
      selectDialogOption(option.nextNode);
    },
    [playConfirmSound, selectDialogOption],
  );

  const move = useCallback(
    (index: number) => {
      playSelectSound();
      rowRefs.current[index]?.focus();
    },
    [playSelectSound],
  );

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      paintChoices(
        ctx,
        { labels: options.map((o) => o.label), active },
        paintLettering,
      );
    }
  }, [options, active]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog();
        return;
      }
      const confirm = e.key === "Enter" || e.key === " ";
      // A held key that opened the conversation must not skip its first line.
      if (confirm && e.repeat) {
        e.preventDefault();
        return;
      }
      if (!ready) {
        if (confirm) {
          e.preventDefault();
          getEngine().skipLine();
        }
        return;
      }
      const n = options.length;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        // The focused button is authoritative for keyboard navigation. A
        // stationary pointer or a pending React focus update may light another row.
        const focusedIndex =
          e.target instanceof HTMLButtonElement
            ? rowRefs.current.indexOf(e.target)
            : -1;
        const current = focusedIndex >= 0 ? focusedIndex : active;
        const next =
          current === null ? (step > 0 ? 0 : n - 1) : (current + step + n) % n;
        move(next);
      } else if (confirm) {
        // A focused choice is a button, which activates itself.
        if (
          e.target instanceof HTMLButtonElement &&
          rowRefs.current.includes(e.target)
        ) {
          return;
        }
        e.preventDefault();
        if (active !== null) choose(options[active]);
        else if (n === 1) choose(options[0]);
        else move(0);
      } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) {
        e.preventDefault();
        choose(options[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [ready, options, active, closeDialog, choose, move]);

  const rows = choiceRows(options.length);

  return (
    <div
      data-e2e="adventure-dialog"
      className={styles.dialogue}
      onClick={() => {
        // A click on the page while Daniele talks moves him along.
        if (!ready) getEngine().skipLine();
      }}
    >
      <canvas
        ref={canvasRef}
        className={styles.art}
        width={CANVAS_PANEL_W}
        height={CANVAS_PANEL_H}
        aria-hidden="true"
      />

      {/* Daniele's line is drawn in the scene; this copy is for screen
          readers and tests */}
      <p
        className={styles.sentence}
        data-e2e="dialogue-line"
        aria-live="polite"
      >
        {node ? `Daniele: ${node.text}` : ""}
      </p>

      {ready && (
        <div
          role="group"
          aria-label="Say"
          className={styles.choices}
          data-e2e="dialog-options"
        >
          {options.map((option, i) => (
            <button
              key={option.id}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              type="button"
              className={styles.choice}
              style={panelPct(rows[i])}
              data-e2e="dialog-option"
              onClick={(e) => {
                e.stopPropagation();
                choose(option);
              }}
              onMouseEnter={() => {
                setPoint({ node: dialogNode, hover: i, focus });
                playSelectSound();
              }}
              onMouseLeave={() =>
                setPoint({ node: dialogNode, hover: null, focus })
              }
              onFocus={() =>
                setPoint({ node: dialogNode, hover: null, focus: i })
              }
              onBlur={() => setPoint({ node: dialogNode, hover, focus: null })}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
