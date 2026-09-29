/**
 * Travel map (docs/expansion-plan.md, "Moving between scenes"): a sepia map
 * of Western Europe, flown over by a small plane between the Hall and each
 * country. Coordinates are native px (320x160), top-left origin.
 *
 * Markers sit on the real cities: London on the Thames, Zurich north of the
 * Alps, Sorrento on the Tyrrhenian coast south of Naples. The engine draws
 * the city's name centred 12 px above each marker (its sections go in the
 * toolbar's status line), so the bands above them
 * are kept free of mountains. The Hall has no marker: flights start from
 * southern France, roughly equidistant from all three.
 *
 * Routes are quadratic bezier control points, bowed gently north like a
 * flight path (a fifth of the trip's length; London-Sorrento a little more,
 * to clear Zurich). Each pair of countries shares
 * one arc, so a trip and its reverse fly the same line.
 */
import type { TravelMapData, Vec } from "../../engine/types";
import travelMapBg from "../../assets/scenes/travel-map/bg.png";
import mapPlane from "../../assets/shared/map-plane.png";
import mapMarker from "../../assets/shared/map-marker.png";

const LONDON_ZURICH: Vec = [123, 37];
// Bowed further than the rest, so the line and the plane clear Zurich's marker.
const LONDON_SORRENTO: Vec = [176, 30];
const ZURICH_SORRENTO: Vec = [190, 86];

export const TRAVEL_MAP: TravelMapData = {
  id: "travel-map",
  background: travelMapBg,
  markers: {
    london: [75, 37],
    zurich: [157, 70],
    sorrento: [202, 120],
  },
  hall: [112, 86],
  routes: {
    "hall-london": [103, 54],
    "hall-zurich": [131, 69],
    "hall-sorrento": [164, 85],
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
