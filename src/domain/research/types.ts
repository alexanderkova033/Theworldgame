// Research: a branching tech tree with the same branch/tier/fork shape as
// the Law tree (domain/laws), but no vote and no up-front price. You only
// choose the *direction* — which node each area (industry/agriculture/
// administration) works toward — and that area makes progress every day,
// funded by the buildings in its field and the scientists hired into it
// (see researchRules.ts and domain/workforce).
import type { ProjectType } from "../construction/types";
import type { PolicyEffects, PolicyLinks, TreeTier } from "../policy/modifiers";

export type ResearchCategory = "industry" | "agriculture" | "administration" | "housing";

// Ongoing modifiers plus one-time deltas, the same shape laws use.
export type ResearchEffects = PolicyEffects;

// A handful of advanced nodes also require a specific node from the *Law*
// tree to already be enacted. No `tree` discriminator, since a ResearchNode
// can only ever cross-reference the Law tree (the only other one).
export interface ResearchCrossRequirement {
  nodeId: string;
}

export interface ResearchNode extends PolicyLinks {
  id: string;
  category: ResearchCategory;
  tier: TreeTier; // depth in its branch, which is also its row on the tree; tier 7 holds the capstones
  name: string;
  description: string;
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
