import type { CountrySceneId } from "../../engine/types";

/**
 * A tiny pixel landmark for each country, so every section button shows
 * where its section lives (docs/expansion-plan.md, "How visitors know where
 * each section is"): Big Ben for London, an Alp for Zurich, and a lemon for
 * Sorrento. Each is 9x9, one character per pixel, coloured by `colors`
 * (`.` is transparent).
 */
const STONE = "#d9a441";
const ROCK = "#8fa6bf";
const LEMON = "#f2cf3a";
const LEAF = "#6fae4a";
const WHITE = "#f4f1e8";

const BADGES: Record<
  CountrySceneId,
  { rows: string[]; colors: Record<string, string> }
> = {
  london: {
    colors: { "#": STONE, o: WHITE },
    rows: [
      "....#....",
      "...###...",
      "..#####..",
      "..#ooo#..",
      "..#o#o#..",
      "..#ooo#..",
      "..#####..",
      "..#.#.#..",
      ".#######.",
    ],
  },
  zurich: {
    colors: { "#": ROCK, o: WHITE },
    rows: [
      ".........",
      "....o....",
      "...ooo...",
      "..oo#oo..",
      "..#####..",
      ".#######.",
      ".#######.",
      "#########",
      "#########",
    ],
  },
  sorrento: {
    colors: { "#": LEMON, o: WHITE, l: LEAF },
    rows: [
      "......ll.",
      ".....l...",
      "..#####..",
      ".##o####.",
      "#########",
      "#########",
      ".#######.",
      "..#####..",
      ".........",
    ],
  },
};

interface CountryBadgeProps {
  country: CountrySceneId;
  className?: string;
}

export function CountryBadge({ country, className }: CountryBadgeProps) {
  const { rows, colors } = BADGES[country];
  return (
    <svg
      className={className}
      width={rows[0].length}
      height={rows.length}
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      data-country={country}
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c in colors ? (
            <rect
              key={`${x},${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={colors[c]}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
