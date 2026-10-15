// Step 4 of the day: farms and processed grain and fish against what the
// people eat.
import type { GameState } from "../../domain/country/types";
import { produceFood, updateFood } from "../../domain/food/foodRules";
import type { LabourSituation } from "../../domain/labour/labourRules";
import { book, log, type Day } from "./dayContext";

export interface Harvest {
  food: number; // the stock at the end of the day
  isShortage: boolean;
}

export function feedThePeople(day: Day, working: GameState, labour: LabourSituation, processedFood: number): Harvest {
  const { newFoodStock, isShortage } = updateFood(working.stats, labour.staffed.farms, day.season, processedFood, day.mods);
  const farmFood = produceFood(labour.staffed.farms, day.season, day.mods);
  // What was actually eaten: in a shortage, less than people needed.
  const eaten = working.stats.food + farmFood + processedFood - newFoodStock;
  book(day, "ledger", "food", { farms: farmFood, processing: processedFood, eating: -eaten });
  if (isShortage) {
    log(day, { date: day.start.date, message: "Food shortage! The population is going hungry.", severity: "warning", topic: "hunger" });
  }
  return { food: newFoodStock, isShortage };
}
