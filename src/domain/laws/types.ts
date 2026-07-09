// Laws: irreversible policy choices, Frostpunk's "Book of Laws" style. Laws
// come in categories of mutually-exclusive options — enacting one locks out
// the others in its category, permanently, for the rest of the game.
export type LawCategory = "labor" | "sustenance" | "order";

export interface LawEffects {
  // Ongoing, applied every day for as long as the law is in effect (folded
  // into the same multiplier composition roads/research already use).
  incomeMultiplier?: number;
  industryMultiplier?: number;
  // One-time, applied once at the moment the law is enacted.
  treasuryDelta?: number;
  foodDelta?: number;
  stabilityDelta?: number;
  populationDelta?: number;
}

export interface LawDefinition {
  id: string;
  category: LawCategory;
  name: string;
  description: string;
  benefit: string;
  cost: string;
  effects: LawEffects;
}
