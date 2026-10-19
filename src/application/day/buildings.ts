// Step 1 of the day: everything being built or worked on moves forward,
// and buildings wear out.
import { advanceProject, isProjectComplete } from "../../domain/construction/constructionRules";
import type { GameState } from "../../domain/country/types";
import { getDifficulty } from "../../domain/difficulty/difficultyData";
import { getIslandExpeditionData } from "../../domain/expeditions/expeditionData";
import { advanceExpedition, isExpeditionComplete } from "../../domain/expeditions/expeditionRules";
import { advanceRepairs, rollBreakdowns } from "../../domain/maintenance/maintenanceRules";
import { pickRiotZone } from "../../domain/provinces/provinceOrder";
import { syncProvinces } from "../../domain/provinces/provincePopulation";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { rollRiotDamage } from "../../domain/unrest/unrestRules";
import { getPoliceBreakdownReduction } from "../../domain/workforce/workforceRules";
import { ONE_OFF } from "../actions/recordAction";
import { advancePolicies } from "../advancePolicies";
import { applyExpeditionCompletion } from "../applyExpeditionCompletion";
import { applySettlementArrival } from "../applySettlementArrival";
import { runTheRace } from "./race";
import { applyProjectCompletion } from "../applyProjectCompletion";
import { book, bookChange, log, type Day } from "./dayContext";

const BUILDING_NAMES: Record<string, string> = {
  farm: "Farm",
  factory: "Factory",
  road: "Road",
  education: "School",
  granary: "Granary",
  cannery: "Cannery",
  housing: "Homes",
};

export function advanceBuildings(day: Day): GameState {
  const state = day.start;

  // 1. Advance every active project. Each one pays its daily installment if
  // the treasury/stockpile can cover it (checked against a running balance,
  // so earlier-started projects get first claim on a tight budget); if it
  // can't, the project doesn't just wait — it stalls and slips slightly
  // backward (see constructionRules.ts) until funding recovers enough to
  // pay for another day's work. A stall/resume only logs once, on the day
  // it actually changes, not every day it stays that way.
  let runningTreasury = state.stats.treasury;
  let runningResources = state.resources;
  const advancedProjects = state.projects.map((project) => {
    const canAffordTreasury = runningTreasury >= project.treasuryCostPerDay;
    const canAffordResource = !project.resourceType || runningResources[project.resourceType] >= project.resourceCostPerDay;
    const canAffordToday = canAffordTreasury && canAffordResource;

    if (canAffordToday) {
      runningTreasury -= project.treasuryCostPerDay;
      if (project.resourceType) {
        runningResources = { ...runningResources, [project.resourceType]: runningResources[project.resourceType] - project.resourceCostPerDay };
      }
    }

    const advanced = advanceProject(project, day.efficiency, canAffordToday);
    if (advanced.isStalled && !project.isStalled) {
      log(day, { date: state.date, message: `${project.label} construction has stalled: there isn't enough to pay for it.`, severity: "warning", topic: "stall" });
    } else if (!advanced.isStalled && project.isStalled) {
      log(day, { date: state.date, message: `${project.label} construction resumes.`, severity: "info", topic: "stall" });
    }
    return advanced;
  });

  const completedProjects = advancedProjects.filter(isProjectComplete);
  const remainingProjects = advancedProjects.filter((p) => !isProjectComplete(p));
  book(day, "ledger", "treasury", { construction: runningTreasury - state.stats.treasury });

  let working: GameState = {
    ...state,
    projects: remainingProjects,
    stats: { ...state.stats, treasury: runningTreasury },
    resources: runningResources,
  };
  for (const project of completedProjects) {
    working = applyProjectCompletion(working, project);
    log(day, { date: state.date, message: `${project.label} construction complete.`, severity: "info", topic: "built" });
  }

  // 1b. Advance every active venture; apply completed ones the same way.
  const advancedExpeditions = working.expeditions.map(advanceExpedition);
  const completedExpeditions = advancedExpeditions.filter(isExpeditionComplete);
  const remainingExpeditions = advancedExpeditions.filter((e) => !isExpeditionComplete(e));

  working = { ...working, expeditions: remainingExpeditions };
  const statsBeforeVentures = working.stats;
  for (const expedition of completedExpeditions) {
    working = applyExpeditionCompletion(working, expedition);
    const islandName = getIslandExpeditionData(expedition.islandId)?.islandName ?? "The venture";
    const flavor = getIslandExpeditionData(expedition.islandId)?.reward.flavor ?? "";
    log(day, { date: state.date, message: `Venture to ${islandName} complete. ${flavor}`, severity: "info", topic: "venture" });
  }

  // 1b'. Settler ships sail on; one that lands makes its island a province.
  const sailing = working.settlements.map((s) => ({ ...s, daysRemaining: s.daysRemaining - 1 }));
  working = { ...working, settlements: sailing.filter((s) => s.daysRemaining > 0) };
  for (const landed of sailing.filter((s) => s.daysRemaining <= 0)) {
    // A ship to a colony already held only brings more people.
    const first = !working.settledIslandIds.includes(landed.islandId);
    working = applySettlementArrival(working, landed.islandId, landed.terms);
    log(day, {
      date: state.date,
      message: first
        ? `Settlers land on ${getProvinceName(landed.islandId)}, with the makings of their first homes and a farm. It is one of your provinces now.`
        : `More settlers land on ${getProvinceName(landed.islandId)}.`,
      severity: "info",
      topic: "venture",
    });
  }

  // 1b''. The race for the islands: a neighbour's ship may land, or set out.
  working = runTheRace(day, working);

  // 1c. A law being drafted and a research step in the lab each move one day
  // closer to taking effect (see advancePolicies.ts). Completion logs its
  // own event onto working.events; lift those into today's log here, since
  // the day's events come from the day's own log, not working.events.
  bookChange(day, "ledger", statsBeforeVentures, working.stats, { treasury: "events", stability: "events" });
  const eventCountBeforePolicies = working.events.length;
  const statsBeforePolicies = working.stats;
  working = advancePolicies(working);
  day.events.unshift(...working.events.slice(0, working.events.length - eventCountBeforePolicies));
  bookChange(day, "ledger", statsBeforePolicies, working.stats, ONE_OFF);
  // A law or research step that moved people moved them in every province.
  working = syncProvinces(working);

  // 1d. Repairs in progress tick down; then any working building might
  // break (police deter some of it). Broken buildings stop producing until
  // repaired — everything after this reads getWorkingCounts, not the raw counts.
  const repairs = advanceRepairs(working.placedBuildings);
  for (const building of repairs.repaired) {
    log(day, {
      date: state.date,
      message: `${BUILDING_NAMES[building.type]} in ${getProvinceName(building.provinceId)} is repaired and back in service.`,
      severity: "info",
      topic: "repaired",
    });
  }
  const breakdowns = rollBreakdowns(repairs.placedBuildings, getPoliceBreakdownReduction(working.workforce.police), day.mods.breakdownMultiplier * getDifficulty(state.difficulty).breakdownMultiplier);
  for (const building of breakdowns.broken) {
    log(day, {
      date: state.date,
      message: `${BUILDING_NAMES[building.type]} in ${getProvinceName(building.provinceId)} has broken down.`,
      severity: "warning",
      topic: "breakdown",
    });
  }
  working = { ...working, placedBuildings: breakdowns.placedBuildings };
  // Rioting mobs wreck buildings too, through the same repair system —
  // anywhere when the whole country riots, or in a province rioting alone.
  const riotZone = pickRiotZone(working.provinces, working.unrestStage);
  if (riotZone) {
    const riot = rollRiotDamage(working.placedBuildings, working.workforce.police, riotZone.provinceId, riotZone.chanceScale);
    if (riot.wrecked) {
      working = { ...working, placedBuildings: riot.placedBuildings };
      log(day, {
        date: state.date,
        message: `Rioters in ${getProvinceName(riot.wrecked.provinceId)}: a ${BUILDING_NAMES[riot.wrecked.type]} has broken down.`,
        severity: "danger",
        topic: "breakdown",
      });
    }
  }
  return working;
}
