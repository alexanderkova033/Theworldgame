// Use case: a building is short of its material, so buy the shortfall on
// the market and place the order in one go. The market sells in batches,
// so it buys batch by batch until the stock covers the down payment. If the
// money can't cover both the goods and the building, nothing happens.
import type { GameState } from "../../domain/country/types";
import { upfrontCost, type BuildAction } from "./createBuildAction";
import { buyGood, canBuyGood } from "./marketActions";

export interface BuyAndBuildPlan {
  good: BuildAction["config"]["resourceType"];
  amount: number; // how much is bought (whole batches, so maybe a little over)
  goodsCost: number; // Crowns spent on the market
  after: GameState; // the country once bought and ordered
}

// What buying the shortfall and building would cost, or null when there's
// no shortfall to buy, or it can't be done (no money, no room, locked).
export function planBuyAndBuild(state: GameState, action: BuildAction, provinceId: string): BuyAndBuildPlan | null {
  const { resourceType: good, resourceCost } = action.config;
  const needed = upfrontCost(resourceCost);
  if (state.resources[good] >= needed) return null;

  let bought = state;
  while (bought.resources[good] < needed && canBuyGood(bought, good)) bought = buyGood(bought, good);
  if (bought.resources[good] < needed || !action.canBuild(bought, provinceId)) return null;

  return {
    good,
    amount: bought.resources[good] - state.resources[good],
    goodsCost: state.stats.treasury - bought.stats.treasury,
    after: action(bought, provinceId),
  };
}

export function buyAndBuild(state: GameState, action: BuildAction, provinceId: string): GameState {
  return planBuyAndBuild(state, action, provinceId)?.after ?? state;
}
