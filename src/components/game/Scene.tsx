import styles from "./Scene.module.scss";

// Hooks
import { useCharacterMovement } from "../../hooks/useCharacterMovement";
import { useSceneClick } from "../../hooks/useSceneClick";
import { useGameStore } from "../../store/gameStore";
import { getScaleForY, getZIndexForY, HOTSPOTS } from "../../config/scene";

// Components
import { SoundToggleButton } from "../shared/SoundToggleButton";

// Character
import { CharacterCSS } from "../renderers/character/CharacterCSS";

// Background - Image-based
import { ImageBackground } from "../renderers/background/ImageBackground";

// Hotspot overlay
import { Hotspot } from "./Hotspot";

/**
 * Main scene composition - Image-based background with hotspot overlays
 * Uses custom pixel art background with interactive hotspot areas
 */
export function Scene() {
  // Character state from store
  const { characterPosition, characterDirection, characterState } =
    useGameStore();

  // Movement handling
  const { handleSceneClick } = useCharacterMovement();

  // Object interaction
  const { handleObjectClick, handleObjectHover, hoveredObject } =
    useSceneClick();

  const characterScale = getScaleForY(characterPosition.y);
  const characterZIndex = getZIndexForY();

  return (
    <>
      {/* Sound toggle positioned outside scene in top-right corner */}
      <div className={styles.soundToggleWrapper}>
        <SoundToggleButton />
      </div>

      <div className={styles.scene} data-e2e="scene" onClick={handleSceneClick}>
        {/* Background layer - custom artwork */}
        <ImageBackground />

        {/* Interactive hotspot overlays */}
        <div className={styles.hotspots}>
          {HOTSPOTS.map((hotspot) => (
            <Hotspot
              key={hotspot.id}
              config={hotspot}
              isHovered={hoveredObject === hotspot.id}
              onClick={handleObjectClick}
              onHover={handleObjectHover}
            />
          ))}
        </div>

        {/* Character layer - positioned with X/Y and scale for depth */}
        <div
          className={styles.character}
          style={{
            left: `${characterPosition.x}px`,
            bottom: `${characterPosition.y}px`,
            transform: `scale(${characterScale})`,
            zIndex: characterZIndex,
          }}
        >
          <CharacterCSS direction={characterDirection} state={characterState} />
        </div>
      </div>
    </>
  );
}
