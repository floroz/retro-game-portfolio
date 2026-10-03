# Airport arrivals and departures board

Approved on 2026-10-03 after the user chose the classic twin split-flap concept and reviewed a working prototype. The frame belongs to the airport wall above Duty Free. Destinations, gate numbers and 24-hour times are live canvas lettering. One row updates every five seconds.

Built-in imagegen edit prompt:

Extract ONLY the joined classic twin split-flap board from the supplied approved concept: charcoal worn metal housing, screws, bevels and small warm yellow ARRIVALS and DEPARTURES headers. Remove the golden wall and red DUTY FREE shop completely, transparent background around the board. Preserve the approved shape, straight frontal view, hand-painted 1990s LucasArts-style texture, proportion of the two panels, frame, colours, centre divider and hardware. Board wide and low, ratio approximately 3.3:1. Tight transparent margins.

Erase all data lettering and all column labels under the yellow headers: remove FROM, TO, GATE, TIME, all cities, all numbers and all times. Keep ONLY ARRIVALS and DEPARTURES as exact dark uppercase heading words on yellow. Beneath each yellow header retain a dark blank narrow column-label band and a rectangular blank matte-black timetable surface. Completely empty data surfaces with no letters, numbers, random marks or baked flap tile grid; runtime code will paint all cells. Both blank surfaces should be wide aligned rectangular areas, equal height, with room for three rows. Preserve the approved narrow metal frames and natural painted texture. No extra objects, wall, fascia, floor or cast shadow outside the silhouette. This is the actual board sprite, not a presentation mockup.

The earlier concept sheet is historical generation context, kept outside the repository. The current full-quality source is `assets-src/approved/hall-flight-board.webp`. Run `npx tsx scripts/assets/flight-board.ts` to reproduce both exports, using the existing Hall palette for the density-2 original.
