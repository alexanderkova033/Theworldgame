import {
  LAW_DAYS_BY_TIER,
  OWN_PARTY_BACKING_BONUS,
  OWN_PARTY_REBEL_PENALTY,
  RIVAL_OPPOSE_PASS_CHANCE_PENALTY,
  RIVAL_SUPPORT_PASS_CHANCE_BONUS,
} from "../constants";
import type { GameState } from "../country/types";
import { getParty, getRivalParty } from "../parties/partyRules";
import { getPartyStance, type PartyStance } from "../parties/rivalRules";
import { chosenIds, hasParentDone, isClosedOff, isOpenToParty } from "../policy/treeRules";
import { LAW_NODES } from "./lawData";
import type { LawEnactCost, LawNode } from "./types";

export function getLawNode(lawId: string): LawNode | undefined {
  return LAW_NODES.find((law) => law.id === lawId);
}

export type LawNodeStatus =
  | "enacted" // this exact node was voted through and has taken effect
  | "in-progress" // voted through, still being drafted into force — see GameState.activeLaw
  | "foreclosed" // closed off for good: see domain/policy/treeRules.ts
  | "locked-party" // only for a party of another ideology; not shown
  | "locked-prerequisite" // the tier above it in this branch isn't enacted yet
  | "locked-cross" // a required node in the Research tree isn't enacted yet
  | "locked-quota" // prerequisite is met, but the stat quota isn't yet
  | "available"; // ready for a vote (may still be unaffordable — see canEnactLaw)

export function getLawNodeStatus(state: GameState, node: LawNode): LawNodeStatus {
  if (state.enactedLawIds.includes(node.id)) return "enacted";
  if (state.activeLaw?.nodeId === node.id) return "in-progress";

  if (!isOpenToParty(node, getParty(state.partyId).ideology)) return "locked-party";
  const chosen = chosenIds(state);
  if (isClosedOff(node.id, chosen)) return "foreclosed";
  if (!hasParentDone(node, chosen)) return "locked-prerequisite";

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
// don't: a ±20-point swing at the extremes of the popularity scale. Then
// both parties' stances on this exact law (see rivalRules.ts): a rival that
// opposes it campaigns against the vote and one that supports it lends
// cover; your own benches vote more solidly for a law they believe in, and
// some of them rebel against one they don't.
export function getEffectivePassChance(state: GameState, node: LawNode): number {
  const popularityNudge = (state.stats.popularity - 50) / 250;
  const nudge = (stance: PartyStance, against: number, for_: number) => (stance === "opposes" ? -against : stance === "supports" ? for_ : 0);
  const rivalNudge = nudge(getRivalStance(state, node), RIVAL_OPPOSE_PASS_CHANCE_PENALTY, RIVAL_SUPPORT_PASS_CHANCE_BONUS);
  const ownNudge = nudge(getOwnStance(state, node), OWN_PARTY_REBEL_PENALTY, OWN_PARTY_BACKING_BONUS);
  return Math.min(0.98, Math.max(0.05, node.passChance + popularityNudge + rivalNudge + ownNudge));
}

export function getRivalStance(state: GameState, node: LawNode): PartyStance {
  return getPartyStance(getRivalParty(state.partyId).ideology, node.effects);
}

// A party-only law is its own party's cause by definition.
export function getOwnStance(state: GameState, node: LawNode): PartyStance {
  if (node.ideology) return "supports";
  return getPartyStance(getParty(state.partyId).ideology, node.effects);
}

export function getQuotaProgress(state: GameState, node: LawNode): { current: number; threshold: number; ratio: number } {
  const current = state.stats[node.quota.stat];
  const threshold = node.quota.threshold;
  return { current, threshold, ratio: Math.min(1, Math.max(0, current / threshold)) };
}
