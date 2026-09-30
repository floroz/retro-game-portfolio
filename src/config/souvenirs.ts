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
      "A golden limoncello bottle with a lemon label on a wooden duty-free counter.",
    paperTop: 34,
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
      "An open red Swiss Army pocketknife with a silver blade and corkscrew.",
    paperTop: 34,
  },
  cheese: {
    title: "Swiss cheese",
    subtitle: "A well-rounded souvenir",
    paragraphs: [
      "A whole wheel of Swiss cheese. The holes count as extra baggage allowance. Probably.",
    ],
    art: cheese,
    artAlt:
      "A golden Swiss cheese wheel with a cut face showing its characteristic holes.",
    paperTop: 34,
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
      "A red London telephone-box miniature with a domed roof and pale blue window panes.",
    paperTop: 34,
  },
} satisfies Record<string, ObjectInspection>;
