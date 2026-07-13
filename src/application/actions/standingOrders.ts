import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { MAX_STANDING_ORDERS, type StandingOrder } from "../../domain/trade/standingOrderTypes";
import { buyResource, canBuyResource, canSellResource, sellResource } from "./marketActions";
import { canImportFood, importFood } from "./importFood";
import { canExportFood, exportFood } from "./exportFood";
import { canTrade, tradeResources } from "./tradeResources";

export function canAddStandingOrder(state: GameState): boolean {
  return state.standingOrders.length < MAX_STANDING_ORDERS;
}

export function addStandingOrder(state: GameState, order: Omit<StandingOrder, "id">): GameState {
  if (!canAddStandingOrder(state)) return state;
  return { ...state, standingOrders: [...state.standingOrders, { ...order, id: generateId("standing-order") }] };
}

export function removeStandingOrder(state: GameState, orderId: string): GameState {
  return { ...state, standingOrders: state.standingOrders.filter((o) => o.id !== orderId) };
}

// Runs every standing order once, in order, whenever it's affordable that
// day — reusing each trade's own can*/action pair so a standing order can
// never do anything a manual click couldn't. An order that can't be
// afforded today is silently skipped (not removed — it'll try again
// tomorrow) rather than logged, matching how manual trades don't log events
// either; the effect is visible in the resources/treasury themselves.
export function runStandingOrders(state: GameState): GameState {
  let working = state;
  for (const order of working.standingOrders) {
    switch (order.kind) {
      case "barter":
        if (order.give && order.receive && canTrade(working, order.give, order.receive, order.multiplier)) {
          working = tradeResources(working, order.give, order.receive, order.multiplier);
        }
        break;
      case "buyResource":
        if (order.resourceType && canBuyResource(working, order.resourceType, order.multiplier)) {
          working = buyResource(working, order.resourceType, order.multiplier);
        }
        break;
      case "sellResource":
        if (order.resourceType && canSellResource(working, order.resourceType, order.multiplier)) {
          working = sellResource(working, order.resourceType, order.multiplier);
        }
        break;
      case "importFood":
        if (canImportFood(working, order.multiplier)) {
          working = importFood(working, order.multiplier);
        }
        break;
      case "exportFood":
        if (canExportFood(working, order.multiplier)) {
          working = exportFood(working, order.multiplier);
        }
        break;
    }
  }
  return working;
}
