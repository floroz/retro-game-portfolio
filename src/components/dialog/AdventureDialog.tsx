import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "../../store/gameStore";
import { DIALOG_TREE } from "../../config/dialogTrees";
import { useTypewriter } from "../../hooks/useTypewriter";
import { useDialogSound } from "../../hooks/useDialogSound";
import { DialogPortrait } from "./DialogPortrait";
import { DialogOptions } from "./DialogOptions";
import type { DialogOption } from "../../types/game";
import styles from "./AdventureDialog.module.scss";

interface AdventureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contained?: boolean; // NEW: whether dialog is contained within game window
}

/**
 * Adventure game style dialog box
 * Features typewriter text, portrait, and selectable options
 * The dialog container stays stable - only content changes between nodes
 * Can be contained within game window or cover full viewport
 */
export function AdventureDialog({
  isOpen,
  onClose,
  contained = false,
}: AdventureDialogProps) {
  const { dialogNode, selectDialogOption } = useGameStore();

  // Track the dialogNode that this selection belongs to
  // When dialogNode changes, we reset the index by storing the new node
  const [selectionState, setSelectionState] = useState({
    nodeId: dialogNode,
    selectedIndex: 0,
  });

  // If dialogNode changed, reset the selection
  const selectedOptionIndex =
    selectionState.nodeId === dialogNode ? selectionState.selectedIndex : 0;

  const { playTypingSound, playSelectSound, playConfirmSound } =
    useDialogSound();

  // Get current dialog node
  const currentNode = DIALOG_TREE[dialogNode];
  const options = currentNode?.options;

  // Typewriter effect for dialog text
  // Only pass text to typewriter when dialog is open to prevent premature typing
  const {
    displayedText,
    isTyping,
    skip: skipTypewriter,
    stop: stopTypewriter,
  } = useTypewriter(isOpen && currentNode ? currentNode.text : "", {
    speed: 40,
    onType: playTypingSound,
  });

  // Handle close - stop typewriter to prevent lingering sounds
  const handleClose = useCallback(() => {
    stopTypewriter();
    onClose();
  }, [stopTypewriter, onClose]);

  // Update selection for current node
  const setSelectedIndex = useCallback(
    (index: number) => {
      setSelectionState({ nodeId: dialogNode, selectedIndex: index });
    },
    [dialogNode],
  );

  // Handle option navigation via keyboard
  const handleNavigate = useCallback(
    (direction: "up" | "down") => {
      if (!options || isTyping) return;

      playSelectSound();

      const optionsLength = options.length;
      const newIndex =
        direction === "up"
          ? selectedOptionIndex > 0
            ? selectedOptionIndex - 1
            : optionsLength - 1
          : selectedOptionIndex < optionsLength - 1
            ? selectedOptionIndex + 1
            : 0;

      setSelectedIndex(newIndex);
    },
    [options, isTyping, playSelectSound, selectedOptionIndex, setSelectedIndex],
  );

  // Handle option hover
  const handleHover = useCallback(
    (index: number) => {
      if (isTyping) return;
      setSelectedIndex(index);
      playSelectSound();
    },
    [isTyping, playSelectSound, setSelectedIndex],
  );

  // Handle option selection
  const handleSelectOption = useCallback(
    (option: DialogOption) => {
      if (isTyping) {
        skipTypewriter();
        return;
      }

      playConfirmSound();
      selectDialogOption(option.nextNode);
    },
    [isTyping, skipTypewriter, playConfirmSound, selectDialogOption],
  );

  // Handle ESC key to close and Enter/Space to skip typewriter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }

      // Skip typewriter on any key if typing
      if (isTyping && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        skipTypewriter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isTyping, skipTypewriter, handleClose]);

  // Stop typewriter when component unmounts
  useEffect(() => {
    return () => {
      stopTypewriter();
    };
  }, [stopTypewriter]);

  // If dialog is open but no valid node exists, close it to prevent empty display
  useEffect(() => {
    if (isOpen && !currentNode && dialogNode) {
      onClose();
    }
  }, [isOpen, currentNode, dialogNode, onClose]);

  if (!isOpen || !currentNode) {
    return null;
  }

  const speakerName =
    currentNode.speaker === "daniele" ? "DANIELE" : "NARRATOR";

  // Use contained styles when in windowed mode
  const overlayClass = contained ? styles.overlayContained : styles.overlay;

  return (
    <div
      className={overlayClass}
      data-e2e="adventure-dialog-overlay"
      onClick={handleClose}
    >
      <div
        className={styles.dialog}
        data-e2e="adventure-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-speaker"
      >
        {/* Header */}
        <div className={styles.header}>
          <span id="dialog-speaker" className={styles.speaker}>
            {speakerName}
          </span>
        </div>

        {/* Content area with portrait and text */}
        <div className={styles.content}>
          <DialogPortrait size="medium" />

          <div className={styles.textArea}>
            <p className={styles.text}>
              {displayedText}
              {isTyping && (
                <span
                  className={styles.cursor}
                  data-e2e="adventure-dialog-cursor"
                >
                  ▌
                </span>
              )}
            </p>

            {/* Options (show after typing completes) */}
            {!isTyping && currentNode.options && (
              <DialogOptions
                options={currentNode.options}
                selectedIndex={selectedOptionIndex}
                onSelect={handleSelectOption}
                onNavigate={handleNavigate}
                onHover={handleHover}
                disabled={isTyping}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {isTyping ? (
            <span className={styles.hint} data-e2e="dialog-typing">
              Press ENTER to skip...
            </span>
          ) : (
            <span className={styles.hint} data-e2e="dialog-typing-complete">
              ↑↓ Navigate • ENTER Select • ESC Close
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
