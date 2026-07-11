import { TRADE_BATCH_SIZE } from "../../domain/constants";
import { getNation } from "../../domain/nations/nationRules";
import { canAffordResource, deductResource } from "../../domain/resources/resourceRules";
import { applyTradeDemand, getDynamicTradeRate } from "../../domain/resources/tradeRules";
import type { ResourceType } from "../../domain/resources/types";
import type { GameState } from "../../domain/country/types";

// Bank trade: give `rate * TRADE_BATCH_SIZE` of one resource, receive
// `TRADE_BATCH_SIZE` of another. Batched so a meaningful trade doesn't take
// a dozen clicks. `rate` now floats with the dynamic market (see
// tradeRules.ts) instead of being a fixed port/no-port constant, and the
// give amount is rounded up so the bank never rounds in the player's favor.
export function getGiveAmount(state: GameState, give: ResourceType, receive: ResourceType): number {
  const rate = getDynamicTradeRate(getNation(state.nationId), state.resourceDemand, give, receive);
  return Math.ceil(rate * TRADE_BATCH_SIZE);
}

export function canTrade(state: GameState, give: ResourceType, receive: ResourceType): boolean {
  if (give === receive) return false;
  return canAffordResource(state.resources, give, getGiveAmount(state, give, receive));
}

export function tradeResources(state: GameState, give: ResourceType, receive: ResourceType): GameState {
  if (!canTrade(state, give, receive)) return state;

  const giveAmount = getGiveAmount(state, give, receive);
  const afterGive = deductResource(state.resources, give, giveAmount);
  const afterReceive = { ...afterGive, [receive]: afterGive[receive] + TRADE_BATCH_SIZE };

  return { ...state, resources: afterReceive, resourceDemand: applyTradeDemand(state.resourceDemand, give, receive) };
}
