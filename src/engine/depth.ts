/**
 * Paint order (docs/art-spec.md, "Layers, depth, and slots"): things without
 * a floor line are on the wall and always behind; the rest sort by floor
 * line. An object is drawn over Daniele while his feet are above its
 * `baselineY` (behind it), and under him otherwise.
 */
export interface Paintable {
  /** Floor line in native px, or null for the wall layer. */
  y: number | null;
  /** True for Daniele: he wins a tie with an object on the same line. */
  actor?: boolean;
}

export function paintOrder<T extends Paintable>(items: T[]): T[] {
  const wall = items.filter((i) => i.y === null);
  const floor = items
    .filter((i) => i.y !== null)
    .sort(
      (a, b) =>
        (a.y ?? 0) - (b.y ?? 0) ||
        Number(a.actor ?? false) - Number(b.actor ?? false),
    );
  return [...wall, ...floor];
}
