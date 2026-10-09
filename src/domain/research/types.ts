// Research: a branching tech tree with the same branch/tier/fork shape as
// the Law tree (domain/laws), but no vote and no up-front price. You only
// choose the *direction* — which node each area (industry/agriculture/
// administration) works toward — and that area makes progress every day,
// funded by the buildings in its field and the scientists hired into it
// (see researchRules.ts and domain/workforce).
import type { ProjectType } from "../construction/types";

export type ResearchCategory = "industry" | "agriculture" | "administration" | "housing";

export interface ResearchEffects {
  // Ongoing, folded into the same multiplier composition as law/nation
  // effects in simulateDay.
  incomeMultiplier?: number;
  industryMultiplier?: number;
  housingCapacityMultiplier?: number; // people per home
  heatingMultiplier?: number; // fuel burned per home in winter
  // One-time, applied once when the node completes.
  treasuryDelta?: number;
  foodDelta?: number;
  stabilityDelta?: number;
  populationDelta?: number;
  popularityDelta?: number;
}

// A handful of advanced nodes also require a specific node from the *Law*
// tree to already be enacted. No `tree` discriminator, since a ResearchNode
// can only ever cross-reference the Law tree (the only other one).
export interface ResearchCrossRequirement {
  nodeId: string;
}

export interface ResearchNode {
  id: string;
  category: ResearchCategory;
  tier: 1 | 2 | 3 | 4; // tier 4 is a capstone, unlocked only after a tier-3 pick in the same branch
  name: string;
  description: string;
  benefit: string;
  cost: string;
  crossRequirement?: ResearchCrossRequirement;
  effects: ResearchEffects;
  icon: string; // a StatIconType name — kept as a plain string here so domain/ doesn't depend on presentation/

  // A handful of nodes unlock a building instead of (or alongside) a stat
  // effect — Granary/Cannery, gated here rather than available from day one,
  // since converting Grain/Fish into Food is a meaningful enough capability
  // to be worth a real tree choice. Unlike ResearchEffects, this isn't scaled
  // by the vote's rolled outcome tier — a passed vote unlocks the building
  // outright, no half-measures.
  unlocksBuildingType?: ProjectType;
}

// Finishing a research node doesn't guarantee the listed effects
// happen exactly as written — the scientist might get lucky or might not.
// Rolled once when a node completes and stored (see GameState.researchOutcomes)
// so the same scaled result applies every day after, not just on the day it
// was adopted.
export type ResearchOutcomeTier = "breakthrough" | "expected" | "underwhelming";
