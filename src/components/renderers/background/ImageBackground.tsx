import styles from "./ImageBackground.module.scss";
import backgroundImage from "../../../assets/background.png";

/**
 * Image-based background component
 * Displays the custom pixel art background as a single image
 */
export function ImageBackground() {
  return (
    <div className={styles.imageBackground} aria-hidden="true">
      <img
        src={backgroundImage}
        alt=""
        className={styles.image}
        draggable={false}
      />
    </div>
  );
}
