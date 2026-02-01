import { useEffect, useCallback } from "react";
import type { DialogOption } from "../../types/game";
import styles from "./DialogOptions.module.scss";

interface DialogOptionsProps {
  options: DialogOption[];
  selectedIndex: number;
  onSelect: (option: DialogOption) => void;
  onNavigate: (direction: "up" | "down") => void;
  onHover: (index: number) => void;
  disabled?: boolean;
}

/**
 * Selectable dialog options list with keyboard navigation
 */
export function DialogOptions({
  options,
  selectedIndex,
  onSelect,
  onNavigate,
  onHover,
  disabled = false,
}: DialogOptionsProps) {
  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          onNavigate("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          onNavigate("down");
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (options[selectedIndex]) {
            onSelect(options[selectedIndex]);
          }
          break;
      }
    },
    [disabled, onNavigate, onSelect, options, selectedIndex],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (options.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.options}
      data-e2e="dialog-options"
      role="listbox"
      aria-label="Dialog options"
    >
      {options.map((option, index) => (
        <button
          key={option.id}
          className={`${styles.item} ${
            index === selectedIndex ? styles.selected : ""
          }`}
          onClick={() => !disabled && onSelect(option)}
          onMouseEnter={() => !disabled && onHover(index)}
          role="option"
          aria-selected={index === selectedIndex}
          disabled={disabled}
          tabIndex={-1}
        >
          <span className={styles.marker}>
            {index === selectedIndex ? "▸" : " "}
          </span>
          <span className={styles.label}>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
