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
  RESEARCH_PER_HOME,
  RESEARCH_PER_ROAD,
  RESEARCH_PER_SCHOOL,
  RESEARCH_PER_SCIENTIST,
} from "../constants";
import type { ProjectType } from "../construction/types";
import type { GameState } from "../country/types";
import { getWorkingCounts } from "../maintenance/maintenanceRules";
import { getParty } from "../parties/partyRules";
import { getModifiers } from "../policy/policyRules";
import { chosenIds, hasParentDone, isClosedOff, isOpenToParty } from "../policy/treeRules";
import { RESEARCH_NODES } from "./researchData";
import type { ResearchCategory, ResearchEffects, ResearchNode } from "./types";

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
        : category === "administration"
          ? working.schools * RESEARCH_PER_SCHOOL
          : working.homes * RESEARCH_PER_HOME;
  const scientists = state.workforce.scientists[category] * RESEARCH_PER_SCIENTIST;
  // Schools, and anything in force that speeds research up or slows it down.
  const educationMultiplier = (1 + working.schools * EDUCATION_RESEARCH_BONUS) * getModifiers(state).researchMultiplier;
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
    housing: getResearchRateBreakdown(state, "housing").total,
  };
}

// Granary/Cannery (and any future research-gated building) are buildable
// once the node that names them in unlocksBuildingType has completed — see
// ActionsPanel.tsx.
export function isBuildingUnlocked(enactedResearchIds: string[], type: ProjectType): boolean {
  return RESEARCH_NODES.some((n) => n.unlocksBuildingType === type && enactedResearchIds.includes(n.id));
}

export { getResearchOutcomeFactor, getResearchOutcomeFlavor, rollResearchOutcome } from "./researchOutcomes";

// A node's one-time effects scaled by how well it turned out (its ongoing
// ones are scaled the same way in domain/policy/policyRules.ts).
export function scaleOneTimeEffects(effects: ResearchEffects, factor: number): ResearchEffects {
  const round = (v: number | undefined) => (v === undefined ? undefined : Math.round(v * factor));
  return {
    treasuryDelta: round(effects.treasuryDelta),
    foodDelta: round(effects.foodDelta),
    stabilityDelta: round(effects.stabilityDelta),
    populationDelta: round(effects.populationDelta),
    popularityDelta: round(effects.popularityDelta),
  };
}

export type ResearchNodeStatus =
  | "enacted" // completed
  | "in-progress" // its area's current direction
  | "foreclosed" // closed off for good: see domain/policy/treeRules.ts
  | "locked-party" // only for a party of another ideology; not shown
  | "locked-prerequisite"
  | "locked-cross" // a required node in the Law tree isn't enacted yet
  | "available"; // can be chosen as its area's direction

export function getResearchNodeStatus(state: GameState, node: ResearchNode): ResearchNodeStatus {
  if (state.enactedResearchIds.includes(node.id)) return "enacted";
  if (state.researchFocus[node.category] === node.id) return "in-progress";

  if (!isOpenToParty(node, getParty(state.partyId).ideology)) return "locked-party";
  const chosen = chosenIds(state);
  if (isClosedOff(node.id, chosen)) return "foreclosed";
  if (!hasParentDone(node, chosen)) return "locked-prerequisite";

  if (node.crossRequirement && !state.enactedLawIds.includes(node.crossRequirement.nodeId)) return "locked-cross";

  return "available";
}

// The step that follows a finished one, when there is no choice to make:
// exactly one step it leads to is open now. After a branch's root (three
// paths) or at a fork (two ways), there's a choice, so this is undefined.
export function getOnlyNextStep(state: GameState, finishedId: string): ResearchNode | undefined {
  const next = RESEARCH_NODES.filter((n) => n.requires?.includes(finishedId) && getResearchNodeStatus(state, n) === "available");
  return next.length === 1 ? next[0] : undefined;
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
