import type { ResourceType } from "../resources/types";

// Everything the continental market deals in: the raw resources, and
// food (see marketRules.ts).
export type MarketGood = ResourceType | "food";

export interface MarketState {
  supply: Record<MarketGood, number>; // units the market currently holds
  outlook: Record<MarketGood, number>; // the wider world's slow drift, ~0.7..1.3
}

// Standing orders: the player's own rules for one good, run once a day (see
// application/day/marketOrders.ts). Prices are the mid price the Market shows,
// and an order keeps its numbers while it is switched off.
export interface BuyOrder {
  on: boolean;
  below: number; // buys while the price is under this
  stockUnder: number | null; // and only while the country holds less than this; null is no limit
}

export interface SellOrder {
  on: boolean;
  above: number; // sells while the price is over this
  keep: number; // and never takes the country's stock below this
}

export interface GoodOrders {
  buy?: BuyOrder;
  sell?: SellOrder;
}

export type MarketOrders = Partial<Record<MarketGood, GoodOrders>>;

// What the orders have done this month, for the Market's line and the log.
export interface OrderTally {
  year: number;
  month: number;
  bought: Partial<Record<MarketGood, number>>;
  sold: Partial<Record<MarketGood, number>>;
  spent: number;
  earned: number;
}
