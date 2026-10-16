// Where the player goes to deal with something. The application layer only
// names problems (an advisor alert's kind); this file alone decides which
// window and section answers each one, so the tab layout can change
// without touching the rules.
//
// Every thing lives in exactly one window:
//   Build     buildings · people (homes, jobs, heating, food)
//   Money     budget (taxes, loans) · market
//   Politics  support (the chamber, what moves it, rallies) · voters (groups, courting, parties) · unrest (police, crackdowns) · neighbours
//   Laws, Research, Reports, and Ventures (opened from an island on the map)
import type { AdvisorAlert, AdvisorAlertKind, AdvisorObjective, ObjectiveKind } from "../application/getAdvisorOutlook";
import type { GameState } from "../domain/country/types";

export type PanelKey = "build" | "money" | "politics" | "laws" | "research" | "reports" | "ventures";

export type BuildSection = "buildings" | "people";
export type MoneySection = "budget" | "market";
export type PoliticsSection = "support" | "voters" | "unrest" | "neighbours";
export type Section = BuildSection | MoneySection | PoliticsSection;

export interface Sections {
  build: BuildSection;
  money: MoneySection;
  politics: PoliticsSection;
}

export interface Destination {
  panel: PanelKey;
  section?: Section;
}

// Opens a window, optionally straight at one of its sections.
export type OpenPanel = (panel: PanelKey, section?: Section) => void;

export const FIRST_SECTIONS: Sections = { build: "buildings", money: "budget", politics: "support" };

// Politics opens on unrest while there are strikes or riots, else on support.
export function politicsSectionFor(state: GameState): PoliticsSection {
  return state.unrestStage === "strikes" || state.unrestStage === "riots" ? "unrest" : "support";
}

export const MARKET: Destination = { panel: "money", section: "market" };
export const BUDGET: Destination = { panel: "money", section: "budget" };
export const BUILDINGS: Destination = { panel: "build", section: "buildings" };
export const PEOPLE: Destination = { panel: "build", section: "people" };
export const SUPPORT: Destination = { panel: "politics", section: "support" };
export const UNREST: Destination = { panel: "politics", section: "unrest" };

const ALERTS: Record<AdvisorAlertKind, Destination> = {
  unrest: UNREST,
  provinceUnrest: PEOPLE,
  coal: MARKET,
  food: BUILDINGS,
  money: BUDGET,
  farmWorkers: PEOPLE,
  factoryWorkers: PEOPLE,
  homeless: PEOPLE,
  broken: BUILDINGS,
  debt: BUDGET,
  election: SUPPORT,
  stalled: BUILDINGS,
  research: { panel: "research" },
};

const OBJECTIVES: Record<ObjectiveKind, Destination> = {
  winter: MARKET,
  farm: BUILDINGS,
  homes: BUILDINGS,
  election: SUPPORT,
};

export function alertDestination(alert: AdvisorAlert): Destination {
  // Food about to run out can't wait for a farm: buy some.
  if (alert.kind === "food" && alert.critical) return MARKET;
  return ALERTS[alert.kind];
}

export function objectiveDestination(objective: AdvisorObjective): Destination {
  return OBJECTIVES[objective.kind];
}
