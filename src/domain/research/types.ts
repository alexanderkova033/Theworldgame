// Research: a branching tech tree with the same branch/tier/fork/vote shape
// as the Law tree (domain/laws), but a genuinely different gate. Laws are
// gated by the country's actual condition (a stat quota — see LawQuota) and
// funded by treasury. Research has no quota at all: every node just costs a
// chunk of accumulated research points to enact (see enactCost.researchPoints
// below), spent like a currency the moment the vote passes — the same role
// treasury plays for Laws, just a different pool. Pass chance is nudged by
// educationLevel instead of popularity. See researchRules.ts.
import type { ProjectType } from "../construction/types";
import type { ResourceType } from "../resources/types";

export type ResearchCategory = "industry" | "agriculture" | "administration";

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

// What it actually costs to put a node to a vote in the first place —
// distinct from `effects.treasuryDelta`, which is the node's own one-time
// fiscal effect once enacted. All three deducted only on a successful vote —
// see application/actions/enactResearch.ts. `researchPoints` is required
// (every node spends some), treasury/resource costs scale it further.
export interface ResearchEnactCost {
  treasury: number;
  researchPoints: number;
  resourceType?: ResourceType;
  resourceAmount?: number;
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
  enactCost: ResearchEnactCost;
  crossRequirement?: ResearchCrossRequirement;
  effects: ResearchEffects;
  passChance: number; // 0..1 base chance before the education/rival nudges — see researchRules.ts
  icon: string; // a StatIconType name — kept as a plain string here so domain/ doesn't depend on presentation/

  // A handful of nodes unlock a building instead of (or alongside) a stat
  // effect — Granary/Cannery, gated here rather than available from day one,
  // since converting Grain/Fish into Food is a meaningful enough capability
  // to be worth a real tree choice. Unlike ResearchEffects, this isn't scaled
  // by the vote's rolled outcome tier — a passed vote unlocks the building
  // outright, no half-measures.
  unlocksBuildingType?: ProjectType;
}

// A research node passing its vote doesn't guarantee the listed effects
// happen exactly as written — the scientist might get lucky or might not.
// Rolled once when a node passes and stored (see GameState.researchOutcomes)
// so the same scaled result applies every day after, not just on the day it
// was adopted.
export type ResearchOutcomeTier = "breakthrough" | "expected" | "underwhelming";
