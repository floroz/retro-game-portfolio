/**
 * Section icons, 14x14 pixel art. The toolbar and any engine text draw the
 * same icon: text writes one as
 * `{skills}` and so on (font.ts draws it inline on the art grid), and
 * the toolbar draws it as an SVG (PixelIcon). Each icon is a header line,
 * `{<section>} <width>`, then its rows, `#` for ink and `.` for paper.
 */
import type { SectionId } from "./types";

const ICON_GLYPHS = `
{experience} 14
....######....
....######....
....##..##....
....##..##....
.############.
##############
##....##....##
##....##....##
##############
##############
##..........##
##..........##
##############
.############.

{skills} 14
........##..##
........##..##
........######
.......#######
......######..
.....######...
....######....
...######.....
..######......
.######.......
######........
#####.........
.###..........
..#...........

{about} 14
....######....
...########...
..##########..
..##########..
..##########..
...########...
....######....
..............
..............
...########...
..##########..
.############.
##############
##############

{contact} 14
####..........
#####.........
######........
######........
.#####........
..####........
...####.......
....####......
.....####.....
......#####...
.......#######
........######
.........#####
..........####

{resume} 14
##########....
##########....
##......####..
##......#####.
##..........##
##..........##
##..######..##
##..######..##
##..........##
##..........##
##..######..##
##..######..##
##############
##############
`;

/** Rows of every icon, keyed by its token, e.g. `{skills}`. */
const ICONS: ReadonlyMap<string, readonly string[]> = new Map(
  ICON_GLYPHS.trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const [header, ...rows] = block.split("\n");
      return [header.split(" ")[0], rows] as const;
    }),
);

/** Matches a section icon token at the start of the search (sticky). */
export const ICON_TOKEN = /\{(experience|skills|about|contact|resume)\}/y;

/** The token that draws a section's icon, e.g. `{skills}`. */
function iconToken(section: SectionId): string {
  return `{${section}}`;
}

/** Pixel rows of a section's icon, "#" for ink. */
export function iconRows(section: SectionId): readonly string[] {
  return ICONS.get(iconToken(section)) ?? [];
}
