// Use case: which laws and technologies would help with what's going wrong
// right now. The advisor already knows the country's problems (coal running
// out, people without homes, a lost election ahead); this matches each one
// to the effects that ease it, so the trees can point at the cure.
import { isHelpful, isMultiplier, type EffectKey, type ModifierKey, type PolicyEffects } from "../domain/policy/modifiers";
import type { AdvisorAlert, AdvisorAlertKind } from "./getAdvisorOutlook";

const EASED_BY: Partial<Record<AdvisorAlertKind, EffectKey[]>> = {
  unrest: ["stabilityPerDay", "stabilityDelta", "hardshipMultiplier"],
  provinceUnrest: ["stabilityPerDay", "stabilityDelta", "hardshipMultiplier"],
  coal: ["heatingMultiplier"],
  food: ["farmYieldMultiplier", "winterFarmMultiplier", "foodConsumptionMultiplier", "foodDelta"],
  money: ["incomeMultiplier", "treasuryDelta", "wageMultiplier"],
  debt: ["incomeMultiplier", "treasuryDelta"],
  farmWorkers: ["farmJobsMultiplier"],
  factoryWorkers: ["factoryJobsMultiplier"],
  homeless: ["housingCapacityMultiplier"],
  broken: ["breakdownMultiplier", "repairCostMultiplier"],
  election: ["supportTarget", "popularityDelta", "hardshipMultiplier"],
};

export interface TreeHint {
  kind: AdvisorAlertKind;
  text: string; // the advisor's own short line: "Coal: 12 days"
}

function eases(key: EffectKey, value: number): boolean {
  if (key === "treasuryDelta" || key === "foodDelta" || key === "stabilityDelta" || key === "populationDelta" || key === "popularityDelta") return value > 0;
  return isHelpful(key as ModifierKey, value) && value !== (isMultiplier(key as ModifierKey) ? 1 : 0);
}

// Every current problem these effects would ease, most urgent first.
export function getHelpedAlerts(effects: PolicyEffects, alerts: AdvisorAlert[]): TreeHint[] {
  return alerts
    .filter((alert) => (EASED_BY[alert.kind] ?? []).some((key) => effects[key] !== undefined && eases(key, effects[key]!)))
    .map((alert) => ({ kind: alert.kind, text: alert.text }));
}

// Every current problem any of these would ease (a whole path, say), each
// named once, most urgent first.
export function getHelpedAlertsByAny(list: PolicyEffects[], alerts: AdvisorAlert[]): TreeHint[] {
  const helped = new Set(list.flatMap((effects) => getHelpedAlerts(effects, alerts).map((hint) => hint.kind)));
  return alerts.filter((alert) => helped.has(alert.kind)).map((alert) => ({ kind: alert.kind, text: alert.text }));
}
