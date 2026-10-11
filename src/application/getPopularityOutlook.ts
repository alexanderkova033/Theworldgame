// Use case: where public opinion is heading and why, without advancing the
// day — the same inputs simulateDay step 8 feeds getPopularityTarget, read
// from the current state, so the Politics tab can show the reasons.
import { getSeason } from "../domain/country/calendar";
import type { GameState } from "../domain/country/types";
import { getLabourSituation } from "../domain/labour/labourRules";
import { burnHeatingFuel, getHeatingDemand, getNationalHomelessShare } from "../domain/housing/housingRules";
import { getPopularityDrivers, getPopularityTarget, type PopularityConditions, type PopularityDriver } from "../domain/politics/politicsRules";

export interface PopularityOutlook {
  target: number;
  drivers: PopularityDriver[];
}

export function getPopularityOutlook(state: GameState): PopularityOutlook {
  const conditions: PopularityConditions = {
    taxRate: state.taxRate,
    isFoodShortage: state.stats.food <= 0,
    homelessShare: getNationalHomelessShare(state),
    unheatedShare: burnHeatingFuel(state.resources, getHeatingDemand(state, getSeason(state.date))).unheatedShare,
    unemploymentShare: getLabourSituation(state).unemploymentShare,
    stability: state.stats.stability,
  };
  return { target: getPopularityTarget(conditions), drivers: getPopularityDrivers(conditions) };
}
