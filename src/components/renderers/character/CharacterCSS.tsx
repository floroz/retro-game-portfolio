import { useEffect } from "react";
import styles from "./CharacterCSS.module.scss";
import danieleStatic from "../../../assets/daniele-static.png";
import danieleMoving from "../../../assets/daniele-moving.png";

interface CharacterCSSProps {
  direction?: "left" | "right";
  state?: "idle" | "walking" | "interacting";
}

// Preload both images to prevent flash on first swap
function preloadImages() {
  const images = [danieleStatic, danieleMoving];
  images.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

/**
 * Daniele character using PNG sprite images
 * Uses daniele-static.png for idle, daniele-moving-1.png for walking
 * Flips horizontally when facing left
 *
 * IMPORTANT: Both images are kept in the DOM at all times to prevent
 * any flashing during state transitions. We toggle visibility instead
 * of swapping src attributes.
 */
export function CharacterCSS({
  direction = "right",
  state = "idle",
}: CharacterCSSProps) {
  const isWalking = state === "walking";

  // Preload images on mount to prevent flash when switching sprites
  useEffect(() => {
    preloadImages();
  }, []);

  const classNames = [
    styles.character,
    direction === "left" && styles.left,
    styles[state],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} aria-label="Portfolio character">
      {/* Static sprite - visible when idle */}
      <img
        src={danieleStatic}
        alt="Daniele"
        className={`${styles.sprite} ${styles.spriteStatic} ${!isWalking ? styles.visible : styles.hidden}`}
        draggable={false}
      />
      {/* Moving sprite - visible when walking */}
      <img
        src={danieleMoving}
        alt="Daniele"
        className={`${styles.sprite} ${styles.spriteMoving} ${isWalking ? styles.visible : styles.hidden}`}
        draggable={false}
      />
    </div>
  );
}
