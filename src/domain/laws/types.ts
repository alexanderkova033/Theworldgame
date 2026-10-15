import type { PolicyEffects, PolicyLinks, TreeTier } from "../policy/modifiers";
import type { ResourceType } from "../resources/types";

// Laws: a branching tree, Frostpunk's "Book of Laws" crossed with a HOI4
// focus tree. Each of three branches (labor/sustenance/order) is four tiers
// deep. A node "opens up" once its quota (a stat threshold) is crossed AND —
// for tier 2+ — a node one tier up in the same branch is already enacted.
// Siblings at the same (category, tier) are mutually exclusive: enacting one
// permanently forecloses the other. Enacting isn't guaranteed — it's a vote,
// with a pass chance nudged by how popular your party currently is — and
// even a "yes" costs real treasury (and sometimes a resource), deducted only
// once the vote actually passes — see enactCost below.
export type LawCategory = "labor" | "sustenance" | "order" | "revenue";

// The stat a node's quota is measured against.
export type QuotaStat = "treasury" | "population" | "food" | "industry" | "stability" | "popularity";

export interface LawQuota {
  stat: QuotaStat;
  threshold: number;
}

// Ongoing modifiers plus one-time deltas, the same shape research uses.
export type LawEffects = PolicyEffects;

// What it actually costs to put a node to a vote in the first place —
// distinct from `effects.treasuryDelta`, which is the law's own one-time
// fiscal effect once enacted. This is deducted only on a successful vote
// (see application/actions/enactLaw.ts) — a failed vote's only consequence
// stays the existing popularity penalty, no double punishment for bad luck.
export interface LawEnactCost {
  treasury: number;
  politicalPower: number; // tier-scaled, see LAW_POLITICAL_POWER_BY_TIER in constants.ts
  resourceType?: ResourceType;
  resourceAmount?: number;
}

// A handful of advanced nodes also require a specific node from the
// *Research* tree to already be enacted — the two trees aren't fully
// isolated from each other. There's no `tree` discriminator since a LawNode
// can only ever cross-reference the Research tree (the only other one).
export interface LawCrossRequirement {
  nodeId: string;
}

export interface LawNode extends PolicyLinks {
  id: string;
  category: LawCategory;
  tier: TreeTier; // depth in the branch, which is also its row on the tree; tier 7 holds the capstones
  quota: LawQuota;
  name: string;
  description: string;
  enactCost: LawEnactCost;
  crossRequirement?: LawCrossRequirement;
  effects: LawEffects;
  passChance: number; // 0..1 base chance of a "yes" vote before the popularity nudge — see lawsRules.ts
  icon: string; // a StatIconType name — kept as a plain string here so domain/ doesn't depend on presentation/
}
