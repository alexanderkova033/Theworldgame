import type { GameDate } from "../country/types";

// A province risen against the government (see uprisingRules.ts). It holds
// its own workplaces until rebel strength is worn down to nothing.
export interface Uprising {
  since: GameDate;
  strength: number; // 0-100: how hard it is to end
  militia: number; // companies sent in to put it down
  lastTerms: GameDate | null; // when the rebels last sent their terms
  fullSince: GameDate | null; // at full strength since this day; held long enough, it breaks away
}

// A province asking for something by letter (see demandRules.ts): its
// workers wanting a pay rise, or rebels sending their terms.
export type DemandKind = "payRise" | "rebelTerms";

export interface Demand {
  kind: DemandKind;
  provinceId: string;
}

// How a demand is answered. A pay rise is granted or refused; rebels'
// terms are met with an amnesty, a year without taxes, or refused.
export type DemandAnswer = "grant" | "refuse" | "amnesty" | "taxRelief";
