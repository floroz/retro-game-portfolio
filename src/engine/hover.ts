/**
 * Status-line text for hovering, and default "look at" lines. Hovering a
 * primary object names its section; hovering a gate names its country and
 * sections (docs/expansion-plan.md, "How visitors know where each section is").
 */
import {
  COUNTRIES,
  SECTIONS,
  isCountryScene,
  sectionList,
} from "../config/sections";
import type { Interactable } from "./SceneEngine";

export function hoverText(target: Interactable): string {
  switch (target.kind) {
    case "object": {
      const { object } = target;
      if (object.inspection) return `Inspect ${object.name}`;
      return object.action
        ? `Open ${SECTIONS[object.action].label}: ${object.name}`
        : `Look at ${object.name}`;
    }
    case "slot":
      return `Look at ${target.item.name}`;
    case "exit": {
      const { exit } = target;
      if (isCountryScene(exit.to)) {
        return `Fly to ${COUNTRIES[exit.to].name}: ${sectionList(exit.to)}`;
      }
      return `Go to ${exit.name ?? "the airport"}`;
    }
  }
}

export function lookText(target: Interactable): string {
  switch (target.kind) {
    case "object":
      return target.object.look;
    case "slot":
      return target.item.look;
    case "exit": {
      const { exit } = target;
      if (exit.look) return exit.look;
      if (isCountryScene(exit.to)) {
        const c = COUNTRIES[exit.to];
        return `Gate ${c.gate}, for ${c.name}. ${sectionList(exit.to)}, that way.`;
      }
      return "The way back to the airport. All roads lead through it.";
    }
  }
}
