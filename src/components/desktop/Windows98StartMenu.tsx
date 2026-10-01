import { useEffect, useRef } from "react";
import { Windows98Icon } from "./Windows98Icon";
import gameIcon from "../../assets/retro-daniele-icon.png";
import promptIcon from "../../assets/prompt.png";
import styles from "./Windows98StartMenu.module.scss";

interface Windows98StartMenuProps {
  onClose: () => void;
  onGame: () => void;
  onTerminal: () => void;
  onResume: () => void;
  onContact: () => void;
  onExperience: () => void;
  onAbout: () => void;
  onShowDesktop: () => void;
}

export function Windows98StartMenu(props: Windows98StartMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);

  const items = [
    {
      label: "Play the adventure",
      image: gameIcon,
      action: props.onGame,
      primary: true,
    },
    { label: "MS-DOS Prompt", image: promptIcon, action: props.onTerminal },
    {
      label: "My Resume",
      kind: "document",
      action: props.onResume,
      divider: true,
    },
    { label: "Work Experience", kind: "computer", action: props.onExperience },
    { label: "Contact", kind: "mail", action: props.onContact },
    {
      label: "About this computer",
      kind: "computer",
      action: props.onAbout,
      divider: true,
    },
    {
      label: "Show Desktop",
      kind: "desktop",
      action: props.onShowDesktop,
      divider: true,
    },
  ] as const;

  return (
    <div
      ref={menuRef}
      id="windows98-start-menu"
      role="menu"
      aria-label="Start menu"
      className={styles.menu}
      onKeyDown={(event) => {
        const buttons = Array.from(
          menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
        );
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    buttons.length) %
                  buttons.length;
          buttons[next]?.focus();
        }
        if (event.key === "Escape") {
          event.stopPropagation();
          props.onClose();
        }
      }}
    >
      <div className={styles.brand} aria-hidden="true">
        <span>
          Windows<b>98</b>
        </span>
      </div>
      <div className={styles.items}>
        {items.map((item) => (
          <button
            type="button"
            role="menuitem"
            key={item.label}
            className={`${styles.item} ${"divider" in item ? styles.divider : ""} ${"primary" in item ? styles.primary : ""}`}
            onClick={() => {
              props.onClose();
              item.action();
            }}
          >
            <span className={styles.icon}>
              {"image" in item ? (
                <img src={item.image} alt="" />
              ) : (
                <Windows98Icon kind={item.kind} />
              )}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
