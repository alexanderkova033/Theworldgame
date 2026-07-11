// Research: a branching tech tree with the exact same shape as the Law tree
// (domain/laws) — three branches, three tiers, prerequisite + quota gating,
// mutually-exclusive tier 2/3 forks, and a vote-style pass chance. The two
// differences: quotas are always measured in researchPoints (so the tree's
// own pace is the gate, not the country's condition), and the pass chance is
// nudged by educationLevel instead of popularity. See researchRules.ts.
export type ResearchCategory = "industry" | "agriculture" | "administration";

export type ResearchQuotaStat = "treasury" | "population" | "food" | "industry" | "stability" | "popularity" | "researchPoints";

export interface ResearchQuota {
  stat: ResearchQuotaStat;
  threshold: number;
}

export interface ResearchEffects {
  // Ongoing, folded into the same multiplier composition as law/nation
  // effects in simulateDay.
  incomeMultiplier?: number;
  industryMultiplier?: number;
  // One-time, applied once when the vote actually passes.
  treasuryDelta?: number;
  foodDelta?: number;
  stabilityDelta?: number;
  populationDelta?: number;
  popularityDelta?: number;
}

export interface ResearchNode {
  id: string;
  category: ResearchCategory;
  tier: 1 | 2 | 3;
  quota: ResearchQuota;
  name: string;
  description: string;
  benefit: string;
  cost: string;
  effects: ResearchEffects;
  passChance: number; // 0..1 base chance before the education/rival nudges — see researchRules.ts
  icon: string; // a StatIconType name — kept as a plain string here so domain/ doesn't depend on presentation/
}
