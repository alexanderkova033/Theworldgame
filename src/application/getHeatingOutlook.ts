// Use case: how the country's heating stands: coal and wood in stock, at what
// each is worth in heat, against what the homes will burn through this winter
// (or the next one). For the People panel and the winter fuel chip in the top bar.
import { ADVISOR_WINTER_PREP_DAYS, DAYS_PER_MONTH } from "../domain/constants";
import { getSeason } from "../domain/country/calendar";
import type { GameState } from "../domain/country/types";
import { getHeatInStock, getHeatingDemand } from "../domain/housing/housingRules";

export interface HeatingOutlook {
  isWinter: boolean;
  fuelPerDay: number; // coal the homes burn each winter day
  fuel: number; // the stock's heat, in coal (firewood burns once the coal is gone)
  winterDaysLeft: number; // days of winter still to heat — this winter's remainder, or all of the next one
  daysUntilWinter: number; // 0 during winter
  fuelNeeded: number; // coal for those winter days
  daysOfFuel: number; // how long the stock lasts at the winter rate
  coalDays: number; // ...of which on the coal
  woodDays: number; // ...and on the wood, once the coal is gone
}

const WINTER_DAYS = 3 * DAYS_PER_MONTH;

// Autumn's warning: inside its window, the stock and the coal the land will dig
// before winter ends still won't last it. Land that digs enough is never warned.
export function isWinterFuelShort(heating: HeatingOutlook, coalPerDay: number): boolean {
  if (heating.isWinter || heating.daysUntilWinter > ADVISOR_WINTER_PREP_DAYS) return false;
  return heating.fuel + Math.max(0, coalPerDay) * (heating.daysUntilWinter + heating.winterDaysLeft) < heating.fuelNeeded;
}

export function getHeatingOutlook(state: GameState): HeatingOutlook {
  const { month, day } = state.date;
  const isWinter = getSeason(state.date) === "winter";
  const fuelPerDay = getHeatingDemand(state, "winter");
  const fuel = getHeatInStock(state.resources);

  const restOfMonth = DAYS_PER_MONTH - day + 1;
  const winterDaysLeft = !isWinter
    ? WINTER_DAYS
    : month === 12
      ? restOfMonth + 2 * DAYS_PER_MONTH
      : month === 1
        ? restOfMonth + DAYS_PER_MONTH
        : restOfMonth;
  const daysUntilWinter = isWinter ? 0 : (11 - month) * DAYS_PER_MONTH + restOfMonth;

  return {
    isWinter,
    fuelPerDay,
    fuel,
    winterDaysLeft,
    daysUntilWinter,
    fuelNeeded: fuelPerDay * winterDaysLeft,
    daysOfFuel: fuelPerDay > 0 ? fuel / fuelPerDay : Infinity,
    coalDays: fuelPerDay > 0 ? state.resources.coal / fuelPerDay : Infinity,
    woodDays: fuelPerDay > 0 ? (fuel - state.resources.coal) / fuelPerDay : Infinity,
  };
}
