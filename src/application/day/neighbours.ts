// Step 8b of the day, on the first of each month: the neighbours live a
// month and their computer rulers choose what to build (see
// domain/neighbours). Quiet: only the Neighbours page shows what they did.
import { isFirstDayOfMonth } from "../../domain/country/calendar";
import type { GameDate, GameState } from "../../domain/country/types";
import { chooseBuilding, liveMonth } from "../../domain/neighbours/neighbourRules";

export function runNeighbours(working: GameState, date: GameDate): GameState["neighbours"] {
  if (!isFirstDayOfMonth(date)) return working.neighbours;
  return Object.fromEntries(
    Object.entries(working.neighbours).map(([nationId, before]) => {
      const lived = liveMonth(before, nationId, date);
      const { neighbour, deed } = chooseBuilding(lived, nationId);
      return [nationId, { ...neighbour, lastDeed: deed }];
    }),
  );
}
