import { DEMAND_STEP, FOOD_TRADE_BATCH_SIZE, FOOD_TRADE_UNIT, TRADE_BATCH_SIZE } from "../../domain/constants";
import { getNation } from "../../domain/nations/nationRules";
import { deductResource } from "../../domain/resources/resourceRules";
import { getDynamicTradeRate, getTradeRate } from "../../domain/resources/tradeRules";
import type { ResourceBundle, ResourceType } from "../../domain/resources/types";
import type { GameState } from "../../domain/country/types";

// Food can be given or received alongside the 4 crafted resources — see
// FOOD_TRADE_UNIT/FOOD_TRADE_BATCH_SIZE for why it uses its own scale
// instead of joining the small-integer resource batches.
export type TradeableType = ResourceType | "food";

function isFood(type: TradeableType): type is "food" {
  return type === "food";
}

// Bank trade: give `rate * TRADE_BATCH_SIZE` of one resource, receive
// `TRADE_BATCH_SIZE` of another (or the food-scaled equivalent of either).
// `rate` floats with the dynamic market for crafted-resource pairs (see
// tradeRules.ts); a food-involved trade uses the flat port/no-port rate
// only, since food doesn't participate in that demand tracking. The give
// amount is always rounded up so the bank never rounds in the player's favor.
export function getGiveAmount(state: GameState, give: TradeableType, receive: TradeableType): number {
  const nation = getNation(state.nationId);

  if (isFood(give) || isFood(receive)) {
    const baseRate = getTradeRate(nation);
    if (isFood(receive)) return Math.ceil((baseRate * FOOD_TRADE_BATCH_SIZE) / FOOD_TRADE_UNIT);
    return Math.ceil(baseRate * TRADE_BATCH_SIZE * FOOD_TRADE_UNIT);
  }

  const rate = getDynamicTradeRate(nation, state.resourceDemand, give, receive);
  return Math.ceil(rate * TRADE_BATCH_SIZE);
}

function getReceiveAmount(receive: TradeableType): number {
  return isFood(receive) ? FOOD_TRADE_BATCH_SIZE : TRADE_BATCH_SIZE;
}

function getBalance(state: GameState, type: TradeableType): number {
  return isFood(type) ? state.stats.food : state.resources[type];
}

export function canTrade(state: GameState, give: TradeableType, receive: TradeableType): boolean {
  if (give === receive) return false;
  return getBalance(state, give) >= getGiveAmount(state, give, receive);
}

export function tradeResources(state: GameState, give: TradeableType, receive: TradeableType): GameState {
  if (!canTrade(state, give, receive)) return state;

  const giveAmount = getGiveAmount(state, give, receive);
  const receiveAmount = getReceiveAmount(receive);

  let resources: ResourceBundle = state.resources;
  let food = state.stats.food;
  let resourceDemand = state.resourceDemand;

  if (isFood(give)) {
    food -= giveAmount;
  } else {
    resources = deductResource(resources, give, giveAmount);
    resourceDemand = { ...resourceDemand, [give]: resourceDemand[give] - DEMAND_STEP };
  }

  if (isFood(receive)) {
    food += receiveAmount;
  } else {
    resources = { ...resources, [receive]: resources[receive] + receiveAmount };
    resourceDemand = { ...resourceDemand, [receive]: resourceDemand[receive] + DEMAND_STEP };
  }

  return { ...state, resources, resourceDemand, stats: { ...state.stats, food } };
}
