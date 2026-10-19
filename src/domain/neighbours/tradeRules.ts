// Trade with the neighbours, by letter (see application/actions/tradeActions.ts).
// Now and then a neighbour's ruler offers a deal: to sell you food from a
// store bigger than it needs, under the market's price, or to buy the good
// its temper wants (Veldoria ore, Astravia wood, Caldenreich coal) over what
// the market would pay you. Warmer neighbours deal a little better; a
// hostile one doesn't deal at all. An accepted deal warms them.
//
// Prices are fixed when the letter is written, against the market as it
// stands. When to write is the neighbour's own dice (neighbourDice).
import {
  FOOD_PER_POP_CONSUMPTION,
  RELATIONS_HOSTILE,
  TRADE_BUY_PREMIUM,
  TRADE_OFFER_CHANCE,
  TRADE_PRICE_PER_RELATION,
  TRADE_SELL_DISCOUNT,
} from "../constants";
import type { MarketGood, MarketState } from "../market/types";
import { getBatchSize, getBuyCost, getSellRevenue } from "../market/marketRules";
import type { ResourceType } from "../resources/types";
import { neighbourDice } from "./neighbourRules";
import type { Neighbour } from "./types";

export interface TradeOffer {
  nationId: string;
  kind: "sell" | "buy"; // they sell to you, or buy from you
  good: MarketGood;
  amount: number;
  price: number; // Crowns, for the whole lot
}

// What each neighbour's temper wants from you.
export const WANTS: Record<string, ResourceType> = { astravia: "wood", caldenreich: "coal", veldoria: "ore" };

// How far relations move the price: better the warmer they are.
function warmth(relations: number): number {
  return relations * TRADE_PRICE_PER_RELATION;
}

// The letter a neighbour writes this month, if any.
export function draftOffer(
  n: Neighbour,
  nationId: string,
  month: number,
  market: MarketState,
  hasPort: boolean,
  yourStock: Record<ResourceType, number>,
): TradeOffer | null {
  if (n.relations <= RELATIONS_HOSTILE) return null;
  if (neighbourDice(nationId, month, "trade") >= TRADE_OFFER_CHANCE) return null;
  const food = getBatchSize("food", 2);
  // Food to spare: more than three months' eating, and the lot on top.
  if (n.food > n.population * FOOD_PER_POP_CONSUMPTION * 90 + food) {
    const price = Math.round(getBuyCost(market, "food", food, hasPort) * (1 - TRADE_SELL_DISCOUNT - warmth(n.relations)));
    return { nationId, kind: "sell", good: "food", amount: food, price };
  }
  // Otherwise what it wants, if you have it and it can pay.
  const good = WANTS[nationId];
  if (!good) return null;
  const amount = getBatchSize(good, 2);
  const price = Math.round(getSellRevenue(market, good, amount) * (1 + TRADE_BUY_PREMIUM + warmth(n.relations)));
  if (yourStock[good] < amount || n.treasury < price) return null;
  return { nationId, kind: "buy", good, amount, price };
}
