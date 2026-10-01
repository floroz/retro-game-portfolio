/**
 * Travel map (docs/expansion-plan.md, "Moving between scenes"): a sepia map
 * of Western Europe, flown over by a small plane between the Hall and each
 * country. Coordinates are logical px (320x160), top-left origin; the
 * painted background is 640x320 at density 2.
 *
 * Markers sit on the real cities of the HD painted map (HB5, candidate 03):
 * London south-east England, just west of the Thames estuary; Zurich north
 * of the Alps; Sorrento on the Italian west coast south of Naples. Each has
 * at least 4 logical px of land around it. The engine draws the city's name
 * centred 12 px above each marker (its sections go in the toolbar's status
 * line). The Hall is no city: its first flight starts from central France,
 * roughly equidistant from all three, under a small airfield symbol and
 * `hallLabel` so the plane never takes off from an unmarked spot. Later
 * flights leave from the last country visited.
 *
 * Routes are quadratic bezier control points, bowed gently north like a
 * flight path (a fifth of the trip's length; London-Sorrento less, and
 * still a clear 18 px from Zurich's marker). Each pair of countries shares
 * one arc, so a trip and its reverse fly the same line.
 */
import type { TravelMapData, Vec } from "../../engine/types";
import travelMapBg from "../../assets/scenes/travel-map/bg.png";
import mapPlane from "../../assets/shared/map-plane.png";
import mapMarker from "../../assets/shared/map-marker.png";

const LONDON_ZURICH: Vec = [119, 28];
// Bowed less than the rest, so the line and the plane clear Zurich's marker.
const LONDON_SORRENTO: Vec = [143, 63];
const ZURICH_SORRENTO: Vec = [192, 77];

export const TRAVEL_MAP: TravelMapData = {
  id: "travel-map",
  background: travelMapBg,
  markers: {
    london: [70, 33],
    zurich: [158, 58],
    sorrento: [204, 114],
  },
  hall: [110, 76],
  hallLabel: "Departures",
  routes: {
    "hall-london": [99, 47],
    "hall-zurich": [130, 57],
    "hall-sorrento": [165, 76],
    "london-zurich": LONDON_ZURICH,
    "zurich-london": LONDON_ZURICH,
    "london-sorrento": LONDON_SORRENTO,
    "sorrento-london": LONDON_SORRENTO,
    "zurich-sorrento": ZURICH_SORRENTO,
    "sorrento-zurich": ZURICH_SORRENTO,
  },
  plane: { strip: mapPlane, headings: 8 },
  marker: mapMarker,
};
