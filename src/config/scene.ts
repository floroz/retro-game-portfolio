import type { SceneConfig, InteractiveObjectConfig } from "../types/game";
import type { HotspotConfig } from "../components/game/Hotspot";

/**
 * Scene dimensions - 1.6:1 aspect ratio (classic SCUMM-inspired)
 * Total viewport: 1280x800
 * Scene area: 1280x640 (top)
 * Toolbar area: 1280x160 (bottom)
 */
export const VIEWPORT = {
  width: 1280,
  height: 800,
  sceneHeight: 640,
  toolbarHeight: 160,
} as const;

/**
 * Walkable floor area bounds
 * Y values are "bottom" positions (distance from bottom of scene)
 * Lower Y = closer to viewer = larger character
 * Higher Y = farther from viewer = smaller character
 *
 * Based on background.png scaled to fit 1280x640:
 * - The floor/wall boundary is at ~200px from bottom
 * - Character sprite is ~100px wide, positioned by center-bottom
 */
export const WALKABLE_AREA = {
  minY: 15, // Front of floor (closest to viewer, near bottom edge)
  maxY: 200, // Back of floor (where floor meets the wall)
  minX: 50, // Left edge (closer to the wall)
  maxX: 1100, // Right edge (accounting for character sprite width)
} as const;

/**
 * Maximum time (in seconds) for character to reach any destination
 * Used to calculate dynamic speed for button-triggered movement
 */
export const MAX_TRAVEL_TIME = 1.5;

/**
 * Hotspot configuration for image-based background
 * Positions are percentages relative to scene dimensions (1280x640)
 * These overlay the interactive areas in background.png
 *
 * Background image layout (left to right):
 * - About frame: ~2-10% from left
 * - Skills vending machine: ~12-22% from left
 * - Contact (banner + phone): ~32-42% from left
 * - Experience door: ~52-65% from left
 * - Resume board: ~78-98% from left
 */
export const HOTSPOTS: HotspotConfig[] = [
  {
    id: "about",
    left: 1,
    top: 25,
    width: 9,
    height: 25,
    action: "about",
    label: "About Me",
  },
  {
    id: "skills",
    left: 12,
    top: 29,
    width: 12,
    height: 40,
    action: "skills",
    label: "Skills",
  },
  {
    id: "contact",
    left: 36,
    top: 33,
    width: 7,
    height: 15,
    action: "contact",
    label: "Contact",
  },
  {
    id: "experience",
    left: 46,
    top: 18,
    width: 10,
    height: 45,
    action: "experience",
    label: "Experience",
  },
  {
    id: "resume",
    left: 72,
    top: 21,
    width: 19,
    height: 25,
    action: "resume",
    label: "CV / Resume",
  },
];

/**
 * Interactive objects configuration (legacy - kept for reference)
 * Positions are based on visual placement in the scaled background image
 * interactionPoint is where the character walks to when interacting
 * All interactionPoints must be within WALKABLE_AREA bounds
 */
export const OBJECTS: InteractiveObjectConfig[] = [
  {
    id: "about",
    position: { x: 70, y: 260 },
    size: { width: 100, height: 180 },
    action: "about",
    label: "About Sign",
    interactionPoint: { x: 140, y: 120 },
  },
  {
    id: "skills",
    position: { x: 200, y: 260 },
    size: { width: 120, height: 300 },
    action: "skills",
    label: "Vending Machine",
    interactionPoint: { x: 280, y: 100 },
  },
  {
    id: "contact",
    position: { x: 480, y: 260 },
    size: { width: 140, height: 240 },
    action: "contact",
    label: "Contact",
    interactionPoint: { x: 520, y: 120 },
  },
  {
    id: "experience",
    position: { x: 720, y: 260 },
    size: { width: 150, height: 320 },
    action: "experience",
    label: "Experience Door",
    interactionPoint: { x: 720, y: 120 },
  },
  {
    id: "resume",
    position: { x: 1020, y: 260 },
    size: { width: 220, height: 280 },
    action: "resume",
    label: "Resume Board",
    interactionPoint: { x: 1000, y: 120 },
  },
];

/**
 * Full scene configuration
 */
export const SCENE_CONFIG: SceneConfig = {
  width: VIEWPORT.width,
  height: VIEWPORT.sceneHeight,
  characterStart: { x: 640, y: 80 }, // Center of scene, on the floor
  walkableArea: WALKABLE_AREA,
  objects: OBJECTS,
};

/**
 * Character movement speed (pixels per second)
 * Base speed for free movement
 */
export const CHARACTER_SPEED = 350;

/**
 * Character movement speed when moving to an interactive object (2x faster)
 */
export const CHARACTER_INTERACTION_SPEED = 500;

/**
 * Calculate scale based on Y position for depth illusion
 * Higher Y (closer to floor line at wall) = farther away = smaller
 * Lower Y (closer to screen bottom) = nearer = larger
 */
export function getScaleForY(bottomY: number): number {
  const { minY, maxY } = WALKABLE_AREA;
  const minScale = 0.7; // Character at back of room (near wall)
  const maxScale = 1.0; // Character at front of room (near viewer)

  // Clamp Y to valid range to prevent any out-of-bounds issues
  const clampedY = Math.max(minY, Math.min(maxY, bottomY));

  // Avoid division by zero
  const range = maxY - minY;
  if (range <= 0) return maxScale;

  // Linear interpolation: higher Y = smaller scale (farther from viewer)
  const t = (clampedY - minY) / range;
  const scale = maxScale - t * (maxScale - minScale);

  // Ensure scale is always within valid bounds
  return Math.max(minScale, Math.min(maxScale, scale));
}

/**
 * Calculate z-index based on Y position
 * Character should always be in the foreground (above background elements)
 * Returns a high z-index that varies slightly based on depth for proper layering
 */
export function getZIndexForY(): number {
  // Character always stays at a high z-index to remain visible
  // The background is static, so we don't need depth-based z-index sorting
  return 100;
}

/**
 * Clamp position to walkable area
 */
export function clampToWalkableArea(
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: Math.max(WALKABLE_AREA.minX, Math.min(WALKABLE_AREA.maxX, x)),
    y: Math.max(WALKABLE_AREA.minY, Math.min(WALKABLE_AREA.maxY, y)),
  };
}

/**
 * Check if a position is within the walkable area
 */
export function isInWalkableArea(x: number, y: number): boolean {
  return (
    x >= WALKABLE_AREA.minX &&
    x <= WALKABLE_AREA.maxX &&
    y >= WALKABLE_AREA.minY &&
    y <= WALKABLE_AREA.maxY
  );
}
