import { DEMAND_STEP, RESOURCE_MARKET_BATCH_SIZE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { canAfford } from "../../domain/economy/economyRules";
import { getNation } from "../../domain/nations/nationRules";
import { canAffordResource, deductResource } from "../../domain/resources/resourceRules";
import { getResourceBuyPrice, getResourceSellPrice } from "../../domain/resources/tradeRules";
import type { ResourceType } from "../../domain/resources/types";

export function getBuyResourceCost(state: GameState, type: ResourceType): number {
  const nation = getNation(state.nationId);
  return getResourceBuyPrice(nation, state.resourceDemand, type) * RESOURCE_MARKET_BATCH_SIZE;
}

export function canBuyResource(state: GameState, type: ResourceType): boolean {
  return canAfford(state.stats, getBuyResourceCost(state, type));
}

export function buyResource(state: GameState, type: ResourceType): GameState {
  if (!canBuyResource(state, type)) return state;

  const cost = getBuyResourceCost(state, type);
  return {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - cost },
    resources: { ...state.resources, [type]: state.resources[type] + RESOURCE_MARKET_BATCH_SIZE },
    resourceDemand: { ...state.resourceDemand, [type]: state.resourceDemand[type] + DEMAND_STEP },
  };
}

export function getSellResourceRevenue(state: GameState, type: ResourceType): number {
  return getResourceSellPrice(state.resourceDemand, type) * RESOURCE_MARKET_BATCH_SIZE;
}

export function canSellResource(state: GameState, type: ResourceType): boolean {
  return canAffordResource(state.resources, type, RESOURCE_MARKET_BATCH_SIZE);
}

export function sellResource(state: GameState, type: ResourceType): GameState {
  if (!canSellResource(state, type)) return state;

  const revenue = getSellResourceRevenue(state, type);
  return {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury + revenue },
    resources: deductResource(state.resources, type, RESOURCE_MARKET_BATCH_SIZE),
    resourceDemand: { ...state.resourceDemand, [type]: state.resourceDemand[type] - DEMAND_STEP },
  };
}
