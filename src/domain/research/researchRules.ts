// Research points accumulate passively every day, boosted by education
// investment. They gate starting research projects (see domain/construction)
// and every node in the research tree below.
import { EDUCATION_PASS_CHANCE_CAP, EDUCATION_PASS_CHANCE_PER_LEVEL, RESEARCH_BASE_RATE, RESEARCH_PER_EDUCATION_LEVEL, RIVAL_OPPOSE_PASS_CHANCE_PENALTY, RIVAL_SUPPORT_PASS_CHANCE_BONUS } from "../constants";
import type { ProjectType } from "../construction/types";
import type { GameState } from "../country/types";
import { getRivalParty } from "../parties/partyRules";
import { getPartyStance } from "../parties/rivalRules";
import { RESEARCH_NODES } from "./researchData";
import type { ResearchEffects, ResearchEnactCost, ResearchNode, ResearchOutcomeTier } from "./types";

export function calculateDailyResearch(educationLevel: number): number {
  return RESEARCH_BASE_RATE + educationLevel * RESEARCH_PER_EDUCATION_LEVEL;
}

export function getResearchNode(id: string): ResearchNode | undefined {
  return RESEARCH_NODES.find((n) => n.id === id);
}

// Granary/Cannery (and any future research-gated building) are buildable
// once the node that names them in unlocksBuildingType has actually passed
// its vote — see ActionsPanel.tsx.
export function isBuildingUnlocked(enactedResearchIds: string[], type: ProjectType): boolean {
  return RESEARCH_NODES.some((n) => n.unlocksBuildingType === type && enactedResearchIds.includes(n.id));
}

// "You don't know if the scientist will actually make something good" — a
// passed vote still rolls how well it actually panned out. Weighted toward
// "expected" so most adoptions feel like what the node promised, with real
// upside and downside tails on either end.
const RESEARCH_OUTCOME_TABLE: Array<{ tier: ResearchOutcomeTier; weight: number; factor: number; flavor: string }> = [
  { tier: "breakthrough", weight: 0.2, factor: 1.5, flavor: "a genuine breakthrough — the results exceed every projection" },
  { tier: "expected", weight: 0.6, factor: 1, flavor: "solid, as-projected progress" },
  { tier: "underwhelming", weight: 0.2, factor: 0.5, flavor: "underwhelming results — half-measures, not the hoped-for leap" },
];

export function rollResearchOutcome(): { tier: ResearchOutcomeTier; factor: number; flavor: string } {
  const roll = Math.random();
  let cumulative = 0;
  for (const entry of RESEARCH_OUTCOME_TABLE) {
    cumulative += entry.weight;
    if (roll < cumulative) return entry;
  }
  return RESEARCH_OUTCOME_TABLE[RESEARCH_OUTCOME_TABLE.length - 1];
}

export function getResearchOutcomeFactor(tier: ResearchOutcomeTier | undefined): number {
  return RESEARCH_OUTCOME_TABLE.find((entry) => entry.tier === tier)?.factor ?? 1;
}

export function getResearchOutcomeFlavor(tier: ResearchOutcomeTier | undefined): string | undefined {
  return RESEARCH_OUTCOME_TABLE.find((entry) => entry.tier === tier)?.flavor;
}

// Scales a node's effects by an outcome factor: multiplier fields scale
// their *deviation from 1* (a 1.5x breakthrough on +8% industry is +12%,
// not +12x), one-time deltas scale directly.
export function scaleResearchEffects(effects: ResearchEffects, factor: number): ResearchEffects {
  const scaled: ResearchEffects = {};
  if (effects.incomeMultiplier !== undefined) scaled.incomeMultiplier = 1 + (effects.incomeMultiplier - 1) * factor;
  if (effects.industryMultiplier !== undefined) scaled.industryMultiplier = 1 + (effects.industryMultiplier - 1) * factor;
  if (effects.treasuryDelta !== undefined) scaled.treasuryDelta = Math.round(effects.treasuryDelta * factor);
  if (effects.foodDelta !== undefined) scaled.foodDelta = Math.round(effects.foodDelta * factor);
  if (effects.stabilityDelta !== undefined) scaled.stabilityDelta = Math.round(effects.stabilityDelta * factor);
  if (effects.populationDelta !== undefined) scaled.populationDelta = Math.round(effects.populationDelta * factor);
  if (effects.popularityDelta !== undefined) scaled.popularityDelta = Math.round(effects.popularityDelta * factor);
  return scaled;
}

// Ongoing multipliers from every enacted research node, composed the same
// way getActiveLawEffects folds enacted laws together — each node's own
// rolled outcome (see rollResearchOutcome) scales its contribution.
export function getActiveResearchEffects(
  enactedResearchIds: string[],
  researchOutcomes: Record<string, ResearchOutcomeTier>,
): { incomeMultiplier: number; industryMultiplier: number } {
  let incomeMultiplier = 1;
  let industryMultiplier = 1;
  for (const id of enactedResearchIds) {
    const node = getResearchNode(id);
    if (!node) continue;
    const scaled = scaleResearchEffects(node.effects, getResearchOutcomeFactor(researchOutcomes[id]));
    incomeMultiplier *= scaled.incomeMultiplier ?? 1;
    industryMultiplier *= scaled.industryMultiplier ?? 1;
  }
  return { incomeMultiplier, industryMultiplier };
}

export type ResearchNodeStatus =
  | "enacted"
  | "foreclosed"
  | "locked-prerequisite"
  | "locked-cross" // a required node in the Law tree isn't enacted yet
  | "locked-quota"
  | "available"; // ready for a vote (may still be unaffordable — see canEnactResearch)

export function getResearchNodeStatus(state: GameState, node: ResearchNode): ResearchNodeStatus {
  if (state.enactedResearchIds.includes(node.id)) return "enacted";

  const siblingEnacted = RESEARCH_NODES.some(
    (n) => n.category === node.category && n.tier === node.tier && n.id !== node.id && state.enactedResearchIds.includes(n.id),
  );
  if (siblingEnacted) return "foreclosed";

  if (node.tier > 1) {
    const prerequisiteMet = RESEARCH_NODES.some(
      (n) => n.category === node.category && n.tier === node.tier - 1 && state.enactedResearchIds.includes(n.id),
    );
    if (!prerequisiteMet) return "locked-prerequisite";
  }

  if (node.crossRequirement && !state.enactedLawIds.includes(node.crossRequirement.nodeId)) return "locked-cross";

  if (state.stats[node.quota.stat] < node.quota.threshold) return "locked-quota";

  return "available";
}

export function canAffordResearchEnactCost(state: GameState, cost: ResearchEnactCost): boolean {
  if (state.stats.treasury < cost.treasury) return false;
  if (cost.resourceType && (cost.resourceAmount ?? 0) > state.resources[cost.resourceType]) return false;
  return true;
}

export function canEnactResearch(state: GameState, id: string): boolean {
  const node = getResearchNode(id);
  if (!node) return false;
  return getResearchNodeStatus(state, node) === "available" && canAffordResearchEnactCost(state, node.enactCost);
}

// A better-educated population runs more successful trials (a capped bonus,
// so it never guarantees a pass), and the rival party's stance on this exact
// node swings the vote too — see domain/parties/rivalRules.ts.
export function getEffectivePassChance(state: GameState, node: ResearchNode): number {
  const educationNudge = Math.min(EDUCATION_PASS_CHANCE_CAP, state.educationLevel * EDUCATION_PASS_CHANCE_PER_LEVEL);
  const rival = getRivalParty(state.partyId);
  const stance = getPartyStance(rival.ideology, node.effects);
  const rivalNudge = stance === "opposes" ? -RIVAL_OPPOSE_PASS_CHANCE_PENALTY : stance === "supports" ? RIVAL_SUPPORT_PASS_CHANCE_BONUS : 0;
  return Math.min(0.98, Math.max(0.05, node.passChance + educationNudge + rivalNudge));
}

export function getRivalStance(state: GameState, node: ResearchNode) {
  const rival = getRivalParty(state.partyId);
  return getPartyStance(rival.ideology, node.effects);
}

export function getQuotaProgress(state: GameState, node: ResearchNode): { current: number; threshold: number; ratio: number } {
  const current = state.stats[node.quota.stat];
  const threshold = node.quota.threshold;
  return { current, threshold, ratio: Math.min(1, Math.max(0, current / threshold)) };
}
