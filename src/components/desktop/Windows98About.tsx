import { PROFILE } from "../../config/profile";
import { Win95Window } from "./Win95Window";
import { Windows98Icon } from "./Windows98Icon";
import styles from "./Windows98About.module.scss";

export function Windows98About({
  onClose,
  onFocus,
  isActive,
  zIndex,
}: {
  onClose: () => void;
  onFocus: () => void;
  isActive: boolean;
  zIndex: number;
}) {
  return (
    <Win95Window
      title="System Properties"
      initialWidth={420}
      initialHeight={350}
      initialX="center"
      initialY="center"
      minWidth={340}
      minHeight={300}
      onClose={onClose}
      onFocus={onFocus}
      isActive={isActive}
      zIndex={zIndex}
      contentClassName={styles.content}
      showMinimizeButton={false}
    >
      <div className={styles.tab}>General</div>
      <div className={styles.panel}>
        <div className={styles.computer}>
          <Windows98Icon kind="computer" />
        </div>
        <div className={styles.details}>
          <p>System:</p>
          <p>
            <strong>Windows 98</strong>
            <br />
            Portfolio Edition
            <br />
            Adventure remastered
          </p>
          <p>Registered to:</p>
          <p>
            {PROFILE.name}
            <br />
            {PROFILE.location}
          </p>
          <p>
            Computer:
            <br />
            Powered by curiosity
            <br />
            Unlimited memory for side quests
          </p>
        </div>
      </div>
      <div className={styles.footer}>
        <button type="button" onClick={onClose}>
          OK
        </button>
      </div>
    </Win95Window>
  );
}
