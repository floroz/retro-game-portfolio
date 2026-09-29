/**
 * PLACEHOLDER travel-map data, written by E1 against F1's placeholder art.
 * Task B5 replaces this whole file; keep the export name (`TRAVEL_MAP`) and
 * the `TravelMapData` type. The markers match the placeholder dots.
 */
import type { TravelMapData } from "../../engine/types";
import travelMapBg from "../../assets/scenes/travel-map/bg.png";

export const TRAVEL_MAP: TravelMapData = {
  id: "travel-map",
  background: travelMapBg,
  markers: {
    london: [84, 64],
    zurich: [170, 82],
    sorrento: [214, 130],
  },
  hall: [132, 100],
};
