// Step 2 of the day: the land produces, granaries and canneries process,
// homes burn fuel, the market moves, and debt compounds.
import { isFirstDayOfMonth } from "../../domain/country/calendar";
import type { GameState } from "../../domain/country/types";
import { produceProcessedFood } from "../../domain/food/foodRules";
import { burnHeatingFuel, getHeatingDemand } from "../../domain/housing/housingRules";
import type { LabourSituation } from "../../domain/labour/labourRules";
import { accrueInterest, isDebtDangerous } from "../../domain/loans/loanRules";
import { updateMarket } from "../../domain/market/marketRules";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import { addResources, calculateDailyProduction } from "../../domain/resources/resourceRules";
import { log, type Day } from "./dayContext";
import { getOwnedProvinceIds } from "../../domain/provinces/provinceRules";

export interface Goods {
  resources: GameState["resources"]; // after processing and heating
  market: GameState["market"];
  processedFood: number; // food made from grain and fish today
  unheatedShare: number; // share of homes left cold
  debt: number; // after today's interest
}

export function produceGoods(day: Day, working: GameState, labour: LabourSituation): Goods {
  const date = day.start.date;

  // 2a. Raw resources: every owned province produces its terrain's resource.
  const ownedTerrains = getOwnedProvinceIds(working).map((provinceId) => MAP_GEOMETRY.provinces.find((p) => p.id === provinceId)!.terrain);
  const producedResources = addResources(working.resources, calculateDailyProduction(ownedTerrains, day.season));
  const market = updateMarket(working.market, day.season, isFirstDayOfMonth(date));

  // 2b. Granaries and canneries turn today's grain and fish into food,
  // capped by both how many are staffed and what's actually in stock. Runs
  // after raw production lands, so a province's own grain that same day can
  // be processed, and before the food step folds the result into the stock.
  const { foodProduced: processedFood, grainConsumed, fishConsumed } = produceProcessedFood(
    labour.staffed.granaries,
    labour.staffed.canneries,
    producedResources,
  );
  const processedResources: typeof producedResources = {
    ...producedResources,
    grain: producedResources.grain - grainConsumed,
    fish: producedResources.fish - fishConsumed,
  };

  // 2c. Winter heating: every working home burns coal, then firewood.
  // Whatever can't be heated hits stability and population later today.
  // Logged once when the fuel first runs out, and again at the start of
  // each winter month it's still out.
  const heating = burnHeatingFuel(processedResources, getHeatingDemand(working, day.season));
  const wasHeatedYesterday = working.resources.coal + working.resources.wood >= getHeatingDemand(working, day.season);
  if (heating.unheatedShare > 0 && (wasHeatedYesterday || isFirstDayOfMonth(date))) {
    log(day, { date, message: "No coal or wood left to heat homes, and people are freezing.", severity: "danger", topic: "cold" });
  }

  // 2d. Debt compounds daily, whether or not it's touched (see
  // domain/loans). Crossing into dangerous territory, and only that
  // crossing, gets its own warning.
  const debt = accrueInterest(working.debt);
  if (!working.isGameOver && isDebtDangerous(debt) && !isDebtDangerous(working.debt)) {
    log(day, { date, message: "Debt has grown dangerous. The interest alone is now dragging down stability and support.", severity: "warning", topic: "money" });
  }

  return { resources: heating.resources, market, processedFood, unheatedShare: heating.unheatedShare, debt };
}
