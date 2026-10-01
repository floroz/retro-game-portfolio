/**
 * Slot rows: the art supplies one generic sprite, `profile.ts` supplies the
 * entries. Adding a job or a skill group is a data change only.
 */
import { PROFILE } from "../config/profile";
import { SLOT_COPY } from "../config/slotCopy";
import type { JobCountry, SlotRow, SlotSource } from "./types";

export interface SlotEntry {
  /** Stable key, e.g. "job:snyk" or "skills:frontend". */
  key: string;
  /** Short caption and hover name. */
  name: string;
  /** Right-click line. */
  look: string;
}

export interface SlotItem {
  /** `${row.id}:${index}` */
  id: string;
  rowId: string;
  /** Sprite id in the slots folder, e.g. "slot-tap" or "slot-tap-more". */
  sprite: string;
  x: number;
  y: number;
  name: string;
  look: string;
  /** True for the "and more" object holding the oldest entries. */
  fold: boolean;
}

type Job = (typeof PROFILE.workExperience)[number];
type SkillGroup = keyof typeof PROFILE.skills;

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function jobEntry(job: Job): SlotEntry {
  return {
    key: `job:${slug(job.company)}`,
    name: job.company,
    look: SLOT_COPY.job(job),
  };
}

/** Entries for a source, newest (or first) first. */
export function entriesFor(source: SlotSource): SlotEntry[] {
  if (source === "skills:groups") {
    return (Object.keys(PROFILE.skills) as SkillGroup[]).map((group) => {
      const label = PROFILE.skillGroupLabels[group];
      return {
        key: `skills:${group}`,
        name: label,
        look: SLOT_COPY.tap(group, label),
      };
    });
  }
  const country = source.slice("jobs:".length) as JobCountry;
  return PROFILE.workExperience
    .filter((job) => job.country === country)
    .map(jobEntry);
}

/**
 * One item per entry, in position order. When the entries outnumber the
 * positions, the last position holds the fold object with the oldest ones.
 */
export function fillSlotRow(
  row: SlotRow,
  entries: SlotEntry[] = entriesFor(row.source),
): SlotItem[] {
  const capacity = row.positions.length;
  const overflow = entries.length > capacity;
  const shown = overflow ? entries.slice(0, capacity - 1) : entries;
  const items: SlotItem[] = shown.map((entry, i) => ({
    id: `${row.id}:${i}`,
    rowId: row.id,
    sprite: `slot-${row.kind}`,
    x: row.positions[i][0],
    y: row.positions[i][1],
    name: entry.name,
    look: entry.look,
    fold: false,
  }));
  if (overflow && capacity > 0) {
    const folded = entries.slice(capacity - 1);
    const [x, y] = row.positions[capacity - 1];
    items.push({
      id: `${row.id}:${capacity - 1}`,
      rowId: row.id,
      sprite: row.fold,
      x,
      y,
      name: SLOT_COPY.foldName(row.kind),
      look: SLOT_COPY.fold(
        row.kind,
        folded.map((e) => e.name),
      ),
      fold: true,
    });
  }
  return items;
}
