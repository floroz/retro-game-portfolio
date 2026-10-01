/** Four equal stages, with two complete sips in every stage. */
export const CYCLE_SECONDS = 30;
const SIP_SLOT = CYCLE_SECONDS / 8;
const smooth = (n: number) => n * n * (3 - 2 * n);

export function coffeeLift(
  elapsed: number,
  manualTime: number | null = null,
): number {
  const time = manualTime ?? elapsed % SIP_SLOT;
  const rest = (manualTime === null ? SIP_SLOT : 2.8) - 2.3;
  if (time < rest) return 0;
  if (time < rest + 0.65) return smooth((time - rest) / 0.65);
  if (time < rest + 1.65) return 1;
  if (time < rest + 2.3) return 1 - smooth((time - rest - 1.65) / 0.65);
  return 0;
}

/** Each vessel clears the window before the next starts in the other direction. */
export function vesselAt(elapsed: number): {
  kind: "ferry" | "boat" | "gap";
  x: number;
} {
  const time = elapsed % 34;
  if (time < 14) return { kind: "ferry", x: 306 + (514 * time) / 14 };
  if (time >= 15 && time < 33)
    return { kind: "boat", x: 812 - (512 * (time - 15)) / 18 };
  return { kind: "gap", x: 0 };
}
