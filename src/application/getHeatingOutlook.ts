// Use case: how the country's heating stands — coal and wood in stock against what
// the homes will burn through this winter (or the next one) — for the
// People panel and the winter fuel chip in the top bar.
import { DAYS_PER_MONTH } from "../domain/constants";
import { getSeason } from "../domain/country/calendar";
import type { GameState } from "../domain/country/types";
import { getHeatingDemand } from "../domain/housing/housingRules";

export interface HeatingOutlook {
  isWinter: boolean;
  fuelPerDay: number; // what the homes burn each winter day
  fuel: number; // coal + wood in stock (firewood burns once the coal is gone)
  winterDaysLeft: number; // days of winter still to heat — this winter's remainder, or all of the next one
  daysUntilWinter: number; // 0 during winter
  fuelNeeded: number; // fuel for those winter days
  daysOfFuel: number; // how long the stock lasts at the winter rate
}

const WINTER_DAYS = 3 * DAYS_PER_MONTH;

export function getHeatingOutlook(state: GameState): HeatingOutlook {
  const { month, day } = state.date;
  const isWinter = getSeason(state.date) === "winter";
  const fuelPerDay = getHeatingDemand(state, "winter");
  const fuel = state.resources.coal + state.resources.wood;

  const restOfMonth = DAYS_PER_MONTH - day + 1;
  const winterDaysLeft = !isWinter
    ? WINTER_DAYS
    : month === 12
      ? restOfMonth + 2 * DAYS_PER_MONTH
      : month === 1
        ? restOfMonth + DAYS_PER_MONTH
        : restOfMonth;
  const daysUntilWinter = isWinter ? 0 : (12 - month) * DAYS_PER_MONTH + restOfMonth;

  return {
    isWinter,
    fuelPerDay,
    fuel,
    winterDaysLeft,
    daysUntilWinter,
    fuelNeeded: fuelPerDay * winterDaysLeft,
    daysOfFuel: fuelPerDay > 0 ? fuel / fuelPerDay : Infinity,
  };
}
