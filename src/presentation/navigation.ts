// Where the player goes to deal with something. The application layer only
// names problems (an advisor alert's kind); this file alone decides which
// window and section answers each one, so the tab layout can change
// without touching the rules.
import type { AdvisorAlert, AdvisorAlertKind, AdvisorObjective, ObjectiveKind } from "../application/getAdvisorOutlook";

export type PanelKey = "politics" | "economy" | "trade" | "reports" | "laws" | "research" | "ventures";

// The Economy window's sections.
export type EconomySection = "build" | "people" | "staff" | "budget";

export interface Destination {
  panel: PanelKey;
  section?: EconomySection;
}

// Opens a window, optionally straight at one of its sections.
export type OpenPanel = (panel: PanelKey, section?: EconomySection) => void;

const ALERTS: Record<AdvisorAlertKind, Destination> = {
  unrest: { panel: "politics" },
  provinceUnrest: { panel: "economy", section: "people" },
  coal: { panel: "trade" },
  food: { panel: "economy", section: "build" },
  money: { panel: "economy", section: "budget" },
  farmWorkers: { panel: "economy", section: "people" },
  factoryWorkers: { panel: "economy", section: "people" },
  homeless: { panel: "economy", section: "people" },
  broken: { panel: "economy", section: "build" },
  debt: { panel: "trade" },
  election: { panel: "politics" },
  stalled: { panel: "economy", section: "build" },
  research: { panel: "research" },
};

const OBJECTIVES: Record<ObjectiveKind, Destination> = {
  winter: { panel: "trade" },
  farm: { panel: "economy", section: "build" },
  homes: { panel: "economy", section: "build" },
  election: { panel: "politics" },
};

export function alertDestination(alert: AdvisorAlert): Destination {
  // Food about to run out can't wait for a farm: buy some.
  if (alert.kind === "food" && alert.critical) return { panel: "trade" };
  return ALERTS[alert.kind];
}

export function objectiveDestination(objective: AdvisorObjective): Destination {
  return OBJECTIVES[objective.kind];
}
