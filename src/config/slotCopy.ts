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
  frontend: "The house pour: smooth, well typed, accessible glassware.",
  backend: "Strong enough to hold up a distributed system.",
  ai: "It writes its own tasting notes.",
  cloud: "Served in containers. Scales to any round.",
  data: "Aged in Postgres casks, with a Kafka chaser.",
  testing: "Checked twice. Flaky pints are sent back.",
  leadership: "A round for the team, new starter included.",
};

const FOLD_NAMES: Record<SlotKind, string> = {
  tap: "spare keg",
  "photo-frame": "shoebox of old badges",
  magnet: "pile of magnets",
};

export const SLOT_COPY = {
  /** No skill list: lists belong in the Skills screen, not the scene. */
  tap(group: string, label: string) {
    const joke = TAP_JOKES[group] ?? "A guest ale. Ask the barman about it.";
    return `${label} on tap. ${joke}`;
  },

  job(job: JobLike) {
    return `${job.company}, ${job.period}. I look younger in this one.`;
  },

  foldName(kind: SlotKind) {
    return FOLD_NAMES[kind];
  },

  fold(kind: SlotKind, names: string[]) {
    const where = kind === "tap" ? "Skills" : "Experience";
    return `A ${FOLD_NAMES[kind]}: ${names.length} more in there. The full story is in ${where}.`;
  },
};
