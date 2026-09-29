import { iconRows } from "../../engine/icons";
import type { SectionId } from "../../engine/types";

interface PixelIconProps {
  section: SectionId;
  /**
   * Screen px per icon pixel. The icons are drawn at the engine's canvas
   * resolution, 14x14, so 1 keeps the toolbar's 14 px icons.
   */
  scale?: number;
  className?: string;
}

/**
 * A section icon from the engine (icons.ts), so the toolbar, the gate
 * signs, and the departures board all show the same icon.
 */
export function PixelIcon({ section, scale = 1, className }: PixelIconProps) {
  const rows = iconRows(section);
  const w = rows[0]?.length ?? 0;
  const h = rows.length;
  return (
    <svg
      className={className}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "#" ? (
            <rect
              key={`${x},${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill="currentColor"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
