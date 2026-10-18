import type { GameDate } from "../country/types";

// A province risen against the government (see uprisingRules.ts). It holds
// its own workplaces until rebel strength is worn down to nothing.
export interface Uprising {
  since: GameDate;
  strength: number; // 0-100: how hard it is to end
  militia: number; // companies sent in to put it down
}
