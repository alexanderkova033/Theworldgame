// Laws: a branching tree, Frostpunk's "Book of Laws" crossed with a HOI4
// focus tree. Each of three branches (labor/sustenance/order) is three tiers
// deep. A node "opens up" once its quota (a stat threshold) is crossed AND —
// for tier 2+ — a node one tier up in the same branch is already enacted.
// Siblings at the same (category, tier) are mutually exclusive: enacting one
// permanently forecloses the other. Enacting isn't guaranteed — it's a vote,
// with a pass chance nudged by how popular your party currently is.
export type LawCategory = "labor" | "sustenance" | "order";

// The stat a node's quota is measured against.
export type QuotaStat = "treasury" | "population" | "food" | "industry" | "stability" | "popularity";

export interface LawQuota {
  stat: QuotaStat;
  threshold: number;
}

export interface LawEffects {
  // Ongoing, applied every day for as long as the law is in effect (folded
  // into the same multiplier composition roads/research already use).
  incomeMultiplier?: number;
  industryMultiplier?: number;
  // One-time, applied once when the vote actually passes.
  treasuryDelta?: number;
  foodDelta?: number;
  stabilityDelta?: number;
  populationDelta?: number;
  popularityDelta?: number;
}

export interface LawNode {
  id: string;
  category: LawCategory;
  tier: 1 | 2 | 3; // depth in the branch; tier 1 is the root, always reachable once its quota is met
  quota: LawQuota;
  name: string;
  description: string;
  benefit: string;
  cost: string;
  effects: LawEffects;
  passChance: number; // 0..1 base chance of a "yes" vote before the popularity nudge — see lawsRules.ts
  icon: string; // a StatIconType name — kept as a plain string here so domain/ doesn't depend on presentation/
}
