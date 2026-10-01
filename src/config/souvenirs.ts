import type { ObjectInspection } from "../engine/types";
import limoncello from "../assets/remaster/inspections/souvenir-limoncello.webp";
import knife from "../assets/remaster/inspections/souvenir-knife.webp";
import cheese from "../assets/remaster/inspections/souvenir-cheese.webp";
import telephone from "../assets/remaster/inspections/souvenir-telephone.webp";

/** Optional airport discoveries. Keep the painted cards blank and the copy editable. */
export const SOUVENIRS = {
  limoncello: {
    title: "Limoncello",
    subtitle: "A taste of Sorrento",
    paragraphs: [
      "Sunshine in a bottle. Sadly, not accepted as a substitute for boarding.",
    ],
    art: limoncello,
    artAlt:
      "An enormous Sorrento lemon balances over a tiny limoncello bottle on a majolica stand at an airport gift counter.",
    paperInsets: { top: 17, right: 8, bottom: 23, left: 56 },
  },
  knife: {
    title: "Swiss Army knife",
    subtitle: "Ready for almost anything",
    paragraphs: [
      "A blade, a corkscrew, and absolutely no attachment for finding your gate.",
      "Best admired here. Airport security has enough hobbies.",
    ],
    art: knife,
    artAlt:
      "A red Swiss Army knife unfolds an umbrella and espresso holder at a Swiss airport gift counter, with a passenger jet outside.",
    paperInsets: { top: 17, right: 8, bottom: 23, left: 55 },
  },
  cheese: {
    title: "Swiss cheese",
    subtitle: "A well-rounded souvenir",
    paragraphs: [
      "A whole wheel of Swiss cheese. The holes count as extra baggage allowance. Probably.",
    ],
    art: cheese,
    artAlt:
      "A Swiss cheese wheel becomes rolling luggage with a red cross strap, beside a cheese-wedge travel pouch in an Alpine airport.",
    paperInsets: { top: 16, right: 8, bottom: 25, left: 55 },
  },
  telephone: {
    title: "London calling",
    subtitle: "The pocket-sized edition",
    paragraphs: [
      "All the charm of a London telephone box, without the queue or the mysterious smell.",
      "Calls cost two very small coins.",
    ],
    art: telephone,
    artAlt:
      "A closed miniature London phone booth shelters under its own umbrella and raincloud in a gift box at an airport souvenir stand.",
    paperInsets: { top: 23, right: 8, bottom: 24, left: 56 },
  },
} satisfies Record<string, ObjectInspection>;
