// Trade with the neighbours, by letter (see application/actions/tradeActions.ts).
// Now and then a neighbour's ruler offers a deal: to sell you, under the
// market's price, food from a store bigger than it needs or wood, ore and
// coal from its own land that you are short of; or to buy, over what the
// market would pay you, the good its land lacks (Astravia, a farming
// country with no mines, coal for its winters; Caldenreich, all hills,
// wood; Veldoria, plains and coast, ore for its foundries). It never sells
// the good it wants. Warmer neighbours deal a little better; a hostile one
// doesn't deal at all. An accepted deal warms them.
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
import type { GameDate } from "../country/types";
import type { MarketGood, MarketState } from "../market/types";
import { getBatchSize, getBuyCost, getSellRevenue } from "../market/marketRules";
import type { ResourceType } from "../resources/types";
import { neighbourDice } from "./neighbourRules";
import type { Neighbour, StoreGood } from "./types";

export interface TradeOffer {
  nationId: string;
  kind: "sell" | "buy"; // they sell to you, or buy from you
  good: MarketGood;
  amount: number;
  price: number; // Crowns, for the whole lot
  until?: GameDate; // it lapses after this day (absent on offers from older saves: it stands until answered)
}

// What each neighbour's temper wants from you.
export const WANTS: Record<string, ResourceType> = { astravia: "coal", caldenreich: "wood", veldoria: "ore" };

const STORE_GOODS: StoreGood[] = ["wood", "ore", "coal"];

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
  const sale = (good: MarketGood, amount: number): TradeOffer => ({
    nationId,
    kind: "sell",
    good,
    amount,
    price: Math.round(getBuyCost(market, good, amount, hasPort) * (1 - TRADE_SELL_DISCOUNT - warmth(n.relations))),
  });
  const food = getBatchSize("food", 2);
  const sales: TradeOffer[] = [
    // Food to spare: more than three months' eating, and the lot on top.
    ...(n.food > n.population * FOOD_PER_POP_CONSUMPTION * 90 + food ? [sale("food", food)] : []),
    // Wood, ore or coal from its stores, when you hold less than the lot.
    ...STORE_GOODS.filter((good) => good !== WANTS[nationId] && n.stores[good] >= getBatchSize(good, 2) && yourStock[good] < getBatchSize(good, 2)).map((good) =>
      sale(good, getBatchSize(good, 2)),
    ),
  ];
  // Several to offer: which one takes turns, month by month.
  if (sales.length > 0) return sales[month % sales.length];
  // Otherwise what it wants, if you have it and it can pay.
  const good = WANTS[nationId];
  if (!good) return null;
  const amount = getBatchSize(good, 2);
  const price = Math.round(getSellRevenue(market, good, amount) * (1 + TRADE_BUY_PREMIUM + warmth(n.relations)));
  if (yourStock[good] < amount || n.treasury < price) return null;
  return { nationId, kind: "buy", good, amount, price };
}
