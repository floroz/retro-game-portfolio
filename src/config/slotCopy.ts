/**
 * "Look at" lines for slot items, written so any future job or skill group
 * gets a sensible line without touching the art (see src/engine/slots.ts).
 */
import type { SlotKind } from "../engine/types";

interface JobLike {
  company: string;
  role: string;
  period: string;
}

const TAP_JOKES: Record<string, string> = {
  frontend:
    "The house pour. Smooth, well typed, and served with accessible glassware.",
  backend:
    "Brewed in Go and Node. Strong enough to hold up a distributed system.",
  ai: "Experimental. The barman swears it writes its own tasting notes.",
  cloud: "Served in containers. Scales to any size of round.",
  data: "Aged in Postgres casks, with a Kafka chaser.",
  testing:
    "Every pint is checked twice before it leaves the bar. Flaky pints are sent back.",
  leadership: "A pint for the whole team, and one for the new starter.",
};

const listOf = (items: readonly string[], max = 3) => {
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  return more > 0 ? `${shown.join(", ")} and ${more} more` : shown.join(", ");
};

const FOLD_NAMES: Record<SlotKind, string> = {
  tap: "spare keg",
  "photo-frame": "shoebox of old badges",
  magnet: "pile of magnets",
};

export const SLOT_COPY = {
  tap(group: string, label: string, skills: readonly string[]) {
    const joke = TAP_JOKES[group] ?? "A guest ale. Ask the barman about it.";
    return `The ${label} tap: ${listOf(skills)}. ${joke}`;
  },

  job(job: JobLike) {
    return `${job.company}: ${job.role}, ${job.period}. I look younger in this one.`;
  },

  foldName(kind: SlotKind) {
    return FOLD_NAMES[kind];
  },

  fold(kind: SlotKind, names: string[]) {
    return `A ${FOLD_NAMES[kind]}: ${listOf(names, 4)}. The full story is in Experience.`;
  },
};
