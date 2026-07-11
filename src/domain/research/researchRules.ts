// Research points accumulate passively every day, boosted by education
// investment. They gate starting research projects (see domain/construction)
// and every node in the research tree below.
import { EDUCATION_PASS_CHANCE_CAP, EDUCATION_PASS_CHANCE_PER_LEVEL, RESEARCH_BASE_RATE, RESEARCH_PER_EDUCATION_LEVEL, RIVAL_OPPOSE_PASS_CHANCE_PENALTY, RIVAL_SUPPORT_PASS_CHANCE_BONUS } from "../constants";
import type { GameState } from "../country/types";
import { getRivalParty } from "../parties/partyRules";
import { getPartyStance } from "../parties/rivalRules";
import { RESEARCH_NODES } from "./researchData";
import type { ResearchNode } from "./types";

export function calculateDailyResearch(educationLevel: number): number {
  return RESEARCH_BASE_RATE + educationLevel * RESEARCH_PER_EDUCATION_LEVEL;
}

export function getResearchNode(id: string): ResearchNode | undefined {
  return RESEARCH_NODES.find((n) => n.id === id);
}

// Ongoing multipliers from every enacted research node, composed the same
// way getActiveLawEffects folds enacted laws together.
export function getActiveResearchEffects(enactedResearchIds: string[]): { incomeMultiplier: number; industryMultiplier: number } {
  let incomeMultiplier = 1;
  let industryMultiplier = 1;
  for (const id of enactedResearchIds) {
    const node = getResearchNode(id);
    if (!node) continue;
    incomeMultiplier *= node.effects.incomeMultiplier ?? 1;
    industryMultiplier *= node.effects.industryMultiplier ?? 1;
  }
  return { incomeMultiplier, industryMultiplier };
}

export type ResearchNodeStatus =
  | "enacted"
  | "foreclosed"
  | "locked-prerequisite"
  | "locked-quota"
  | "available";

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

  if (state.stats[node.quota.stat] < node.quota.threshold) return "locked-quota";

  return "available";
}

export function canEnactResearch(state: GameState, id: string): boolean {
  const node = getResearchNode(id);
  if (!node) return false;
  return getResearchNodeStatus(state, node) === "available";
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
