/**
 * Regenerate master.gpl from master.hex, and print each group's colours with
 * the closest pair in OKLab, to spot colours too similar to be worth an index.
 *
 *   npm run assets:palette
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PALETTE_PATH, fail, loadPalette, oklabDistance, toGpl } from "./lib";

function main() {
  const palette = loadPalette();
  writeFileSync(resolve(PALETTE_PATH, "../master.gpl"), toGpl(palette));
  const groups = [...new Set(palette.colours.map((c) => c.group))];
  for (const group of groups) {
    const own = palette.colours.filter((c) => c.group === group);
    const others = palette.colours.filter(
      (c) => c.group === "core" || c.group === group,
    );
    const closest = own.map((c) => {
      const near = others
        .filter((o) => o !== c)
        .map((o) => ({ o, d: oklabDistance(c.lab, o.lab) }))
        .sort((a, b) => a.d - b.d)[0];
      return `${c.index} ${c.hex} (nearest ${near.o.index} ${near.d.toFixed(3)})`;
    });
    console.log(`${group} (${own.length}):\n  ${closest.join("\n  ")}`);
  }
  console.log(
    `\nWrote master.gpl for palette ${palette.version}, ${palette.colours.length} colours.`,
  );
}

try {
  main();
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}
