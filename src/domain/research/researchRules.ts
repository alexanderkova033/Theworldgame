// Research has no shared pool of points and no vote. Each area — industry,
// agriculture, administration — works toward one node of your choosing at
// its own daily rate (getResearchRates): a small base trickle, plus every
// working building in that field, plus every scientist hired into it, all
// sharpened by schools. Picking the direction is the only decision; funding
// it means building things and paying scientists.
import {
  EDUCATION_RESEARCH_BONUS,
  RESEARCH_BASE_RATE_PER_AREA,
  RESEARCH_COST_BY_TIER,
  RESEARCH_PER_FACTORY,
  RESEARCH_PER_FARM,
  RESEARCH_PER_FOOD_PROCESSOR,
  RESEARCH_PER_ROAD,
  RESEARCH_PER_SCHOOL,
  RESEARCH_PER_SCIENTIST,
} from "../constants";
import type { ProjectType } from "../construction/types";
import type { GameState } from "../country/types";
import { getWorkingCounts } from "../maintenance/maintenanceRules";
import { RESEARCH_NODES } from "./researchData";
import type { ResearchCategory, ResearchEffects, ResearchNode, ResearchOutcomeTier } from "./types";

export function getResearchNode(id: string): ResearchNode | undefined {
  return RESEARCH_NODES.find((n) => n.id === id);
}

// Points of work a node needs before it's done.
export function getResearchCost(node: ResearchNode): number {
  return RESEARCH_COST_BY_TIER[node.tier];
}

export interface ResearchRateBreakdown {
  base: number;
  buildings: number;
  scientists: number;
  educationMultiplier: number;
  total: number;
}

// Where one area's daily progress comes from — the panel shows these parts
// so it's clear what building more or hiring more actually buys.
export function getResearchRateBreakdown(state: GameState, category: ResearchCategory): ResearchRateBreakdown {
  const working = getWorkingCounts(state);
  const buildings =
    category === "industry"
      ? working.factories * RESEARCH_PER_FACTORY + working.roads * RESEARCH_PER_ROAD
      : category === "agriculture"
        ? working.farms * RESEARCH_PER_FARM + (working.granaries + working.canneries) * RESEARCH_PER_FOOD_PROCESSOR
        : working.schools * RESEARCH_PER_SCHOOL;
  const scientists = state.workforce.scientists[category] * RESEARCH_PER_SCIENTIST;
  const educationMultiplier = 1 + working.schools * EDUCATION_RESEARCH_BONUS;
  return {
    base: RESEARCH_BASE_RATE_PER_AREA,
    buildings,
    scientists,
    educationMultiplier,
    total: (RESEARCH_BASE_RATE_PER_AREA + buildings + scientists) * educationMultiplier,
  };
}

export function getResearchRates(state: GameState): Record<ResearchCategory, number> {
  return {
    industry: getResearchRateBreakdown(state, "industry").total,
    agriculture: getResearchRateBreakdown(state, "agriculture").total,
    administration: getResearchRateBreakdown(state, "administration").total,
  };
}

// Granary/Cannery (and any future research-gated building) are buildable
// once the node that names them in unlocksBuildingType has completed — see
// ActionsPanel.tsx.
export function isBuildingUnlocked(enactedResearchIds: string[], type: ProjectType): boolean {
  return RESEARCH_NODES.some((n) => n.unlocksBuildingType === type && enactedResearchIds.includes(n.id));
}

// "You don't know if the scientist will actually make something good" — a
// finished node still rolls how well it actually panned out. Weighted toward
// "expected" so most results feel like what the node promised, with real
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

// Ongoing multipliers from every completed research node, composed the
// same way getActiveLawEffects folds enacted laws together — each node's own
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
  | "enacted" // completed
  | "in-progress" // its area's current direction
  | "foreclosed"
  | "locked-prerequisite"
  | "locked-cross" // a required node in the Law tree isn't enacted yet
  | "available"; // can be chosen as its area's direction

export function getResearchNodeStatus(state: GameState, node: ResearchNode): ResearchNodeStatus {
  if (state.enactedResearchIds.includes(node.id)) return "enacted";
  if (state.researchFocus[node.category] === node.id) return "in-progress";

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

  return "available";
}

// Choosing a direction is free — switching away from a half-done node keeps
// its progress (GameState.researchProgress) for if you come back to it.
export function canFocusResearch(state: GameState, id: string): boolean {
  const node = getResearchNode(id);
  return node !== undefined && getResearchNodeStatus(state, node) === "available";
}

export function getResearchProgressRatio(state: GameState, node: ResearchNode): number {
  return Math.min(1, (state.researchProgress[node.id] ?? 0) / getResearchCost(node));
}

// Whole days left at today's rate for that area, or null if it's stalled.
export function getResearchDaysLeft(state: GameState, node: ResearchNode): number | null {
  const rate = getResearchRateBreakdown(state, node.category).total;
  if (rate <= 0) return null;
  const remaining = getResearchCost(node) - (state.researchProgress[node.id] ?? 0);
  return Math.max(0, Math.ceil(remaining / rate));
}
