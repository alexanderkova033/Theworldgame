import { TRADE_BATCH_SIZE } from "../../domain/constants";
import { getNation } from "../../domain/nations/nationRules";
import { canAffordResource, deductResource } from "../../domain/resources/resourceRules";
import { getTradeRate } from "../../domain/resources/tradeRules";
import type { ResourceType } from "../../domain/resources/types";
import type { GameState } from "../../domain/country/types";

// Bank trade: give `rate * TRADE_BATCH_SIZE` of one resource, receive
// `TRADE_BATCH_SIZE` of another. Batched so a meaningful trade doesn't take
// a dozen clicks.
export function canTrade(state: GameState, give: ResourceType, receive: ResourceType): boolean {
  if (give === receive) return false;
  const rate = getTradeRate(getNation(state.nationId));
  return canAffordResource(state.resources, give, rate * TRADE_BATCH_SIZE);
}

export function tradeResources(state: GameState, give: ResourceType, receive: ResourceType): GameState {
  if (!canTrade(state, give, receive)) return state;

  const rate = getTradeRate(getNation(state.nationId));
  const afterGive = deductResource(state.resources, give, rate * TRADE_BATCH_SIZE);
  const afterReceive = { ...afterGive, [receive]: afterGive[receive] + TRADE_BATCH_SIZE };

  return { ...state, resources: afterReceive };
}
