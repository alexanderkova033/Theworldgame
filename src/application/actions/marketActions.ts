import { DEMAND_STEP, RESOURCE_MARKET_BATCH_SIZE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { canAfford } from "../../domain/economy/economyRules";
import { getNation } from "../../domain/nations/nationRules";
import { canAffordResource, deductResource } from "../../domain/resources/resourceRules";
import { getResourceBuyPrice, getResourceSellPrice } from "../../domain/resources/tradeRules";
import type { ResourceType } from "../../domain/resources/types";

// `multiplier` is the player's chosen batch size (see TradePanel's 1x/5x/10x
// selector) — defaults to 1 for every existing call site.
export function getBuyResourceCost(state: GameState, type: ResourceType, multiplier = 1): number {
  const nation = getNation(state.nationId);
  return getResourceBuyPrice(nation, state.resourceDemand, type) * RESOURCE_MARKET_BATCH_SIZE * multiplier;
}

export function canBuyResource(state: GameState, type: ResourceType, multiplier = 1): boolean {
  return canAfford(state.stats, getBuyResourceCost(state, type, multiplier));
}

export function buyResource(state: GameState, type: ResourceType, multiplier = 1): GameState {
  if (!canBuyResource(state, type, multiplier)) return state;

  const cost = getBuyResourceCost(state, type, multiplier);
  const amount = RESOURCE_MARKET_BATCH_SIZE * multiplier;
  return {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - cost },
    resources: { ...state.resources, [type]: state.resources[type] + amount },
    resourceDemand: { ...state.resourceDemand, [type]: state.resourceDemand[type] + DEMAND_STEP * multiplier },
  };
}

export function getSellResourceRevenue(state: GameState, type: ResourceType, multiplier = 1): number {
  return getResourceSellPrice(state.resourceDemand, type) * RESOURCE_MARKET_BATCH_SIZE * multiplier;
}

export function canSellResource(state: GameState, type: ResourceType, multiplier = 1): boolean {
  return canAffordResource(state.resources, type, RESOURCE_MARKET_BATCH_SIZE * multiplier);
}

export function sellResource(state: GameState, type: ResourceType, multiplier = 1): GameState {
  if (!canSellResource(state, type, multiplier)) return state;

  const revenue = getSellResourceRevenue(state, type, multiplier);
  const amount = RESOURCE_MARKET_BATCH_SIZE * multiplier;
  return {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury + revenue },
    resources: deductResource(state.resources, type, amount),
    resourceDemand: { ...state.resourceDemand, [type]: state.resourceDemand[type] - DEMAND_STEP * multiplier },
  };
}
