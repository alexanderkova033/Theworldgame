// Use case: when food or money runs out if nothing changes — projected day
// by day, season by season (a winter harvest is about half a spring one),
// up to FORECAST_DAYS ahead. Read-only, built from the same numbers the
// day's production summary already holds.
import { FORECAST_DAYS } from "../domain/constants";
import { advanceDay, getSeason } from "../domain/country/calendar";
import type { GameDate, GameState } from "../domain/country/types";
import { produceFood } from "../domain/food/foodRules";
import { getLabourSituation } from "../domain/labour/labourRules";
import { getModifiers } from "../domain/policy/policyRules";
import type { DailyProductionSummary } from "./getDailyProductionSummary";

export interface RunOut {
  days: number; // from today
  date: GameDate;
}

export interface Forecasts {
  food: RunOut | null; // null: lasts past the forecast window
  treasury: RunOut | null;
}

export function getForecasts(state: GameState, production: DailyProductionSummary): Forecasts {
  const staffedFarms = getLabourSituation(state).staffed.farms;
  const mods = getModifiers(state);
  // Projects keep drawing their instalments until they're built.
  const instalments = state.projects.map((p) => ({ perDay: p.treasuryCostPerDay, days: Math.ceil(p.daysRemaining) }));

  let food = state.stats.food;
  let treasury = state.stats.treasury;
  let foodOut: RunOut | null = null;
  let treasuryOut: RunOut | null = null; // stays null if the treasury is already in the red
  let date = state.date;
  for (let day = 1; day <= FORECAST_DAYS && (!foodOut || !treasuryOut); day++) {
    date = advanceDay(date);
    if (!foodOut) {
      food += produceFood(staffedFarms, getSeason(date), mods) + production.processedFood - production.foodConsumed;
      if (food < 0) foodOut = { days: day, date };
    }
    if (!treasuryOut && state.stats.treasury >= 0) {
      treasury += production.totalIncome - instalments.reduce((sum, p) => sum + (day <= p.days ? p.perDay : 0), 0);
      if (treasury < 0) treasuryOut = { days: day, date };
    }
  }
  return { food: foodOut, treasury: treasuryOut };
}
