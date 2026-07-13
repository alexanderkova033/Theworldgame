import type { ResourceType } from "../resources/types";
import type { TradeableType } from "./types";

// A standing order automates one specific trade — whichever action it names
// runs once, automatically, every day (see application/actions/standingOrders.ts),
// as long as it's affordable that day. Kept to a small closed set of "kinds"
// rather than a generic action reference so it stays plain, JSON-serializable
// data (same requirement GameState itself has — see gameSave.ts).
export type StandingOrderKind = "barter" | "buyResource" | "sellResource" | "importFood" | "exportFood";

export interface StandingOrder {
  id: string;
  kind: StandingOrderKind;
  give?: TradeableType; // "barter" only
  receive?: TradeableType; // "barter" only
  resourceType?: ResourceType; // "buyResource" / "sellResource" only
  multiplier: number; // batch-size multiplier, same scale as the manual trade UI
}

export const MAX_STANDING_ORDERS = 3;
