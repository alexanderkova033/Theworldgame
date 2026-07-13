import { DEMAND_STEP, FOOD_TRADE_BATCH_SIZE, FOOD_TRADE_UNIT, TRADE_BATCH_SIZE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { deductResource } from "../../domain/resources/resourceRules";
import { getDynamicTradeRate, getTradeRate } from "../../domain/resources/tradeRules";
import type { ResourceBundle } from "../../domain/resources/types";
import type { TradeableType } from "../../domain/trade/types";

export type { TradeableType };

function isFood(type: TradeableType): type is "food" {
  return type === "food";
}

// Bank trade: give `rate * TRADE_BATCH_SIZE * multiplier` of one resource,
// receive `TRADE_BATCH_SIZE * multiplier` of another (or the food-scaled
// equivalent of either) — `multiplier` is the player's chosen batch size
// (see TradePanel's 1x/5x/10x selector), defaulting to 1 for every existing
// call site. `rate` floats with the dynamic market for crafted-resource
// pairs (see tradeRules.ts); a food-involved trade uses the flat port/no-port
// rate only, since food doesn't participate in that demand tracking. The
// give amount is always rounded up so the bank never rounds in the player's favor.
export function getGiveAmount(state: GameState, give: TradeableType, receive: TradeableType, multiplier = 1): number {
  const nation = getNation(state.nationId);

  if (isFood(give) || isFood(receive)) {
    const baseRate = getTradeRate(nation);
    if (isFood(receive)) return Math.ceil((baseRate * FOOD_TRADE_BATCH_SIZE * multiplier) / FOOD_TRADE_UNIT);
    return Math.ceil(baseRate * TRADE_BATCH_SIZE * multiplier * FOOD_TRADE_UNIT);
  }

  const rate = getDynamicTradeRate(nation, state.resourceDemand, give, receive);
  return Math.ceil(rate * TRADE_BATCH_SIZE * multiplier);
}

function getReceiveAmount(receive: TradeableType, multiplier = 1): number {
  return (isFood(receive) ? FOOD_TRADE_BATCH_SIZE : TRADE_BATCH_SIZE) * multiplier;
}

function getBalance(state: GameState, type: TradeableType): number {
  return isFood(type) ? state.stats.food : state.resources[type];
}

export function canTrade(state: GameState, give: TradeableType, receive: TradeableType, multiplier = 1): boolean {
  if (give === receive) return false;
  return getBalance(state, give) >= getGiveAmount(state, give, receive, multiplier);
}

export function tradeResources(state: GameState, give: TradeableType, receive: TradeableType, multiplier = 1): GameState {
  if (!canTrade(state, give, receive, multiplier)) return state;

  const giveAmount = getGiveAmount(state, give, receive, multiplier);
  const receiveAmount = getReceiveAmount(receive, multiplier);
  const demandStep = DEMAND_STEP * multiplier;

  let resources: ResourceBundle = state.resources;
  let food = state.stats.food;
  let resourceDemand = state.resourceDemand;

  if (isFood(give)) {
    food -= giveAmount;
  } else {
    resources = deductResource(resources, give, giveAmount);
    resourceDemand = { ...resourceDemand, [give]: resourceDemand[give] - demandStep };
  }

  if (isFood(receive)) {
    food += receiveAmount;
  } else {
    resources = { ...resources, [receive]: resources[receive] + receiveAmount };
    resourceDemand = { ...resourceDemand, [receive]: resourceDemand[receive] + demandStep };
  }

  return { ...state, resources, resourceDemand, stats: { ...state.stats, food } };
}
