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
 */
export function CharacterCSS({
  direction = "right",
  state = "idle",
}: CharacterCSSProps) {
  const isWalking = state === "walking";
  const sprite = isWalking ? danieleMoving : danieleStatic;

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

  const spriteClassNames = [
    styles.sprite,
    isWalking ? styles.spriteMoving : styles.spriteStatic,
  ]
    .filter(Boolean)
    .join(" ");

  // Inline style ensures transform is applied immediately, preventing flash
  // when the image source changes before CSS class is applied
  const spriteStyle = isWalking ? undefined : { transform: "scale(0.65)" };

  return (
    <div className={classNames} aria-label="Portfolio character">
      <img
        src={sprite}
        alt="Daniele"
        className={spriteClassNames}
        style={spriteStyle}
        draggable={false}
      />
    </div>
  );
}
