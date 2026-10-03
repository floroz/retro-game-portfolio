import type { SplitFlapBoard } from "../../engine/types";

/** Ambient flights belong to the airport scenery, distinct from playable gates. */
export const HALL_FLIGHT_BOARD: SplitFlapBoard = {
  everyMs: 5000,
  foldMs: 190,
  staggerMs: 24,
  updateOrder: [0, 4, 1, 5, 2, 3],
  panels: [
    {
      area: { x: 5.5, y: 12.2, w: 33.5, h: 11.5 },
      originLabel: "FROM",
      rows: [
        {
          initial: { city: "PARIS", gate: "12", time: "09:20" },
          alternate: { city: "LISBON", gate: "16", time: "09:35" },
        },
        {
          initial: { city: "ROME", gate: "17", time: "09:45" },
          alternate: { city: "OSLO", gate: "19", time: "10:05" },
        },
        {
          initial: { city: "MADRID", gate: "24", time: "10:10" },
          alternate: { city: "DUBLIN", gate: "27", time: "10:25" },
        },
      ],
    },
    {
      area: { x: 42.5, y: 12.2, w: 33.5, h: 11.5 },
      originLabel: "TO",
      rows: [
        {
          initial: { city: "BERLIN", gate: "14", time: "10:30" },
          alternate: { city: "PRAGUE", gate: "18", time: "10:45" },
        },
        {
          initial: { city: "ATHENS", gate: "22", time: "10:55" },
          alternate: { city: "MILAN", gate: "26", time: "11:15" },
        },
        {
          initial: { city: "VIENNA", gate: "31", time: "11:20" },
          alternate: { city: "GENEVA", gate: "34", time: "11:40" },
        },
      ],
    },
  ],
};
