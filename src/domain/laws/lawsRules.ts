import { LAW_DAYS_BY_TIER, RIVAL_OPPOSE_PASS_CHANCE_PENALTY, RIVAL_SUPPORT_PASS_CHANCE_BONUS } from "../constants";
import type { GameState } from "../country/types";
import { getRivalParty } from "../parties/partyRules";
import { getPartyStance } from "../parties/rivalRules";
import { LAW_NODES } from "./lawData";
import type { LawEnactCost, LawNode } from "./types";

export function getLawNode(lawId: string): LawNode | undefined {
  return LAW_NODES.find((law) => law.id === lawId);
}

// Ongoing multipliers from every enacted law, composed together the same way
// road efficiency and the research bonus already are in simulateDay.
export function getActiveLawEffects(enactedLawIds: string[]): { incomeMultiplier: number; industryMultiplier: number } {
  let incomeMultiplier = 1;
  let industryMultiplier = 1;
  for (const lawId of enactedLawIds) {
    const law = getLawNode(lawId);
    if (!law) continue;
    incomeMultiplier *= law.effects.incomeMultiplier ?? 1;
    industryMultiplier *= law.effects.industryMultiplier ?? 1;
  }
  return { incomeMultiplier, industryMultiplier };
}

export type LawNodeStatus =
  | "enacted" // this exact node was voted through and has taken effect
  | "in-progress" // voted through, still being drafted into force — see GameState.activeLaw
  | "foreclosed" // a sibling at the same tier was enacted instead — permanent
  | "locked-prerequisite" // the tier above it in this branch isn't enacted yet
  | "locked-cross" // a required node in the Research tree isn't enacted yet
  | "locked-quota" // prerequisite is met, but the stat quota isn't yet
  | "available"; // ready for a vote (may still be unaffordable — see canEnactLaw)

export function getLawNodeStatus(state: GameState, node: LawNode): LawNodeStatus {
  if (state.enactedLawIds.includes(node.id)) return "enacted";
  if (state.activeLaw?.nodeId === node.id) return "in-progress";

  const siblingEnacted = LAW_NODES.some(
    (n) => n.category === node.category && n.tier === node.tier && n.id !== node.id && state.enactedLawIds.includes(n.id),
  );
  if (siblingEnacted) return "foreclosed";

  if (node.tier > 1) {
    const prerequisiteMet = LAW_NODES.some(
      (n) => n.category === node.category && n.tier === node.tier - 1 && state.enactedLawIds.includes(n.id),
    );
    if (!prerequisiteMet) return "locked-prerequisite";
  }

  if (node.crossRequirement && !state.enactedResearchIds.includes(node.crossRequirement.nodeId)) return "locked-cross";

  if (state.stats[node.quota.stat] < node.quota.threshold) return "locked-quota";

  return "available";
}

export function canAffordLawEnactCost(state: GameState, cost: LawEnactCost): boolean {
  if (state.stats.treasury < cost.treasury) return false;
  if (state.stats.politicalPower < cost.politicalPower) return false;
  if (cost.resourceType && (cost.resourceAmount ?? 0) > state.resources[cost.resourceType]) return false;
  return true;
}

export function canEnactLaw(state: GameState, lawId: string): boolean {
  const node = getLawNode(lawId);
  if (!node) return false;
  // One law in the drafting room at a time — see GameState.activeLaw.
  return getLawNodeStatus(state, node) === "available" && !state.activeLaw && canAffordLawEnactCost(state, node.enactCost);
}

// How long a passed law takes to come into force.
export function getLawDays(node: LawNode): number {
  return LAW_DAYS_BY_TIER[node.tier];
}

// Popular parties get the benefit of the doubt in a vote; unpopular ones
// don't — a ±20-point swing at the extremes of the popularity scale. The
// rival party's simulated stance on this exact law (see rivalRules.ts) nudges
// it further: a rival who opposes it campaigns against the vote, one who
// supports it lends some bipartisan cover.
export function getEffectivePassChance(state: GameState, node: LawNode): number {
  const popularityNudge = (state.stats.popularity - 50) / 250;
  const rival = getRivalParty(state.partyId);
  const stance = getPartyStance(rival.ideology, node.effects);
  const rivalNudge = stance === "opposes" ? -RIVAL_OPPOSE_PASS_CHANCE_PENALTY : stance === "supports" ? RIVAL_SUPPORT_PASS_CHANCE_BONUS : 0;
  return Math.min(0.98, Math.max(0.05, node.passChance + popularityNudge + rivalNudge));
}

export function getRivalStance(state: GameState, node: LawNode) {
  const rival = getRivalParty(state.partyId);
  return getPartyStance(rival.ideology, node.effects);
}

export function getQuotaProgress(state: GameState, node: LawNode): { current: number; threshold: number; ratio: number } {
  const current = state.stats[node.quota.stat];
  const threshold = node.quota.threshold;
  return { current, threshold, ratio: Math.min(1, Math.max(0, current / threshold)) };
}
