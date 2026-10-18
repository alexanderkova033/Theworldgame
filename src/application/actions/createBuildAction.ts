// Every build action (buildFarm, buildFactory, buildRoad, ...) shares the
// same shape: spend treasury, spend a matching resource, respect a
// per-province cap, queue a project. This factory captures that shape once
// so each action file is just its numbers, not a repeated implementation.
import { canAfford } from "../../domain/economy/economyRules";
import { generateId } from "../../domain/country/id";
import { canAffordResource, deductResource } from "../../domain/resources/resourceRules";
import type { GameState } from "../../domain/country/types";
import type { Project, ProjectType } from "../../domain/construction/types";
import { getModifiers } from "../../domain/policy/policyRules";
import { isBuildingUnlocked } from "../../domain/research/researchRules";
import type { ResourceType } from "../../domain/resources/types";
import { recordAction } from "./recordAction";
import { isFeatureOpen, type Feature } from "../../domain/chapters/chapterData";

export interface BuildActionConfig {
  type: ProjectType;
  label: string;
  cost: number;
  buildDays: number;
  resourceType: ResourceType;
  resourceCost: number;
  maxPerProvince: number;
  // Most buildings are available from turn one; a few (Granary, Cannery) are
  // gated behind a research node naming them in unlocksBuildingType — see
  // domain/research/researchRules.ts. Checked here, not just in the UI, so
  // the rule holds even if a caller skips ActionsPanel's own gating.
  requiresResearch?: boolean;
  // A building that belongs to a system still shut (see domain/chapters).
  feature?: Feature;
}

// A build action is a function, but also carries its own affordability
// check and cap so the UI can ask "would this work?" without duplicating
// the rules — see ActionsPanel.tsx.
export interface BuildAction {
  (state: GameState, provinceId: string): GameState;
  canBuild: (state: GameState, provinceId: string) => boolean;
  maxPerProvince: number;
  config: BuildActionConfig; // its label and prices, for UI that lists build options (see ProvinceCard)
}

// Completed buildings of this type in the province, plus any already queued
// — queuing a 4th farm when 3 are already built-or-building is blocked the
// same as if all 3 were finished, so treasury/resources never get spent on
// a project that could never legally complete.
export function countBuildingsInProvince(state: GameState, type: ProjectType, provinceId: string): number {
  const completed = state.placedBuildings.filter((b) => b.type === type && b.provinceId === provinceId).length;
  const inProgress = state.projects.filter((p) => p.type === type && p.provinceId === provinceId).length;
  return completed + inProgress;
}

// Cost is split 60/40: 60% is charged the moment construction starts, the
// rest is drained in equal daily installments for the rest of the build (see
// Project.treasuryCostPerDay/resourceCostPerDay and simulateDay.ts step 1).
// Weighted toward the upfront share (rather than an even split) so starting
// a project is a real commitment you feel immediately, not a rounding error
// against a comfortable treasury — canBuild only has to check this upfront
// share, but that also means starting a project commits you to an ongoing
// cost you might not be able to fully afford if you overbuild.
export function upfrontCost(cost: number): number {
  return Math.round(cost * 0.6);
}

// What a building costs in money today, after laws and the party's creed
// (see domain/policy). Materials aren't affected.
export function getBuildCost(state: GameState, baseCost: number): number {
  return Math.round(baseCost * getModifiers(state).buildCostMultiplier);
}

export function createBuildAction(config: BuildActionConfig): BuildAction {
  function canBuild(state: GameState, provinceId: string): boolean {
    return (
      (!config.feature || isFeatureOpen(state, config.feature)) &&
      (!config.requiresResearch || isBuildingUnlocked(state.enactedResearchIds, config.type)) &&
      canAfford(state.stats, upfrontCost(getBuildCost(state, config.cost))) &&
      canAffordResource(state.resources, config.resourceType, upfrontCost(config.resourceCost)) &&
      countBuildingsInProvince(state, config.type, provinceId) < config.maxPerProvince &&
      // Only in a province the country holds, and not where rebels hold the
      // ground (see domain/uprising).
      state.provinces[provinceId] !== undefined &&
      !state.provinces[provinceId].uprising
    );
  }

  function build(state: GameState, provinceId: string): GameState {
    if (!canBuild(state, provinceId)) return state;

    const cost = getBuildCost(state, config.cost);
    const treasuryUpfront = upfrontCost(cost);
    const resourceUpfront = upfrontCost(config.resourceCost);

    const project: Project = {
      id: generateId("project"),
      type: config.type,
      label: config.label,
      totalDays: config.buildDays,
      daysRemaining: config.buildDays,
      provinceId,
      treasuryCostPerDay: (cost - treasuryUpfront) / config.buildDays,
      resourceType: config.resourceType,
      resourceCostPerDay: (config.resourceCost - resourceUpfront) / config.buildDays,
      isStalled: false,
    };

    const next: GameState = {
      ...state,
      stats: { ...state.stats, treasury: state.stats.treasury - treasuryUpfront },
      resources: deductResource(state.resources, config.resourceType, resourceUpfront),
      projects: [...state.projects, project],
    };
    return recordAction(state, next, { treasury: "construction" });
  }

  const action = build as BuildAction;
  action.canBuild = canBuild;
  action.maxPerProvince = config.maxPerProvince;
  action.config = config;
  return action;
}
