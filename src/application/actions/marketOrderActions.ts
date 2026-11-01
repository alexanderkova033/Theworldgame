// Standing orders in the Market: setting them, and whether one would trade
// today. The day's step (day/marketOrders.ts) and the Market ask the same
// questions here, so the screen says what the simulation will do.
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import { CURRENCY_SYMBOL, MARKET_ORDER_BATCHES, MARKET_ORDER_RESERVE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { GOOD_SPECS, MARKET_GOODS, getBatchSize, getMidPrice, marketHasStock } from "../../domain/market/marketRules";
import type { BuyOrder, GoodOrders, MarketGood, OrderTally, SellOrder } from "../../domain/market/types";
import { canBuyGood, canSellGood, getMarketBuyCost } from "./marketActions";

function goodHolding(state: GameState, good: MarketGood): number {
  return good === "food" ? state.stats.food : state.resources[good];
}

function todaysPrice(state: GameState, good: MarketGood): number {
  return getMidPrice(good, state.market.supply[good]);
}

// Today's price to a click of the order's own step: up for a buy and down for a
// sell, so a new order made at today's price is already in reach of it.
function toStep(good: MarketGood, price: number, round: (n: number) => number): number {
  const step = GOOD_SPECS[good].orderStep;
  return round(price / step) * step;
}

function withOrders(state: GameState, good: MarketGood, change: GoodOrders): GameState {
  return { ...state, marketOrders: { ...state.marketOrders, [good]: { ...state.marketOrders[good], ...change } } };
}

function newBuyOrder(state: GameState, good: MarketGood): BuyOrder {
  return { on: true, below: toStep(good, todaysPrice(state, good), Math.ceil), stockUnder: null };
}

// Keeps what is in store today, so a new order sells only what comes in after.
function newSellOrder(state: GameState, good: MarketGood): SellOrder {
  return { on: true, above: toStep(good, todaysPrice(state, good), Math.floor), keep: Math.floor(goodHolding(state, good)) };
}

// The first click makes an order at today's price and switches it on.
export function toggleBuyOrder(state: GameState, good: MarketGood): GameState {
  const order = state.marketOrders[good]?.buy;
  return withOrders(state, good, { buy: order ? { ...order, on: !order.on } : newBuyOrder(state, good) });
}

export function toggleSellOrder(state: GameState, good: MarketGood): GameState {
  const order = state.marketOrders[good]?.sell;
  return withOrders(state, good, { sell: order ? { ...order, on: !order.on } : newSellOrder(state, good) });
}

export function changeBuyOrder(state: GameState, good: MarketGood, change: Partial<Omit<BuyOrder, "on">>): GameState {
  const order = state.marketOrders[good]?.buy;
  if (!order) return state;
  const next = { ...order, ...change };
  return withOrders(state, good, { buy: { ...next, below: Math.max(0, next.below), stockUnder: next.stockUnder === null ? null : Math.max(0, next.stockUnder) } });
}

export function changeSellOrder(state: GameState, good: MarketGood, change: Partial<Omit<SellOrder, "on">>): GameState {
  const order = state.marketOrders[good]?.sell;
  if (!order) return state;
  const next = { ...order, ...change };
  return withOrders(state, good, { sell: { ...next, above: Math.max(0, next.above), keep: Math.max(0, next.keep) } });
}

export function setBuyOrderToToday(state: GameState, good: MarketGood): GameState {
  return changeBuyOrder(state, good, { below: toStep(good, todaysPrice(state, good), Math.ceil) });
}

export function setSellOrderToToday(state: GameState, good: MarketGood): GameState {
  return changeSellOrder(state, good, { above: toStep(good, todaysPrice(state, good), Math.floor) });
}

export function countOrdersOn(state: GameState): number {
  return MARKET_GOODS.reduce((sum, good) => {
    const orders = state.marketOrders[good];
    return sum + (orders?.buy?.on ? 1 : 0) + (orders?.sell?.on ? 1 : 0);
  }, 0);
}

// A buy limit at or over the sell limit would pay the spread day after day,
// buying and selling the same goods. Neither trades until they are apart.
function ordersCross(state: GameState, good: MarketGood): boolean {
  const { buy, sell } = state.marketOrders[good] ?? {};
  return !!buy?.on && !!sell?.on && buy.below >= sell.above;
}

const CROSSED = "Waiting: the buy price must be under the sell price.";

// Null when the order would buy today; otherwise why it won't, for the tip.
export function whyBuyOrderWaits(state: GameState, good: MarketGood): string | null {
  const order = state.marketOrders[good]?.buy;
  if (!order?.on) return "Switched off.";
  if (!isFeatureOpen(state, "market")) return "Waiting: the Market is shut.";
  if (ordersCross(state, good)) return CROSSED;
  if (todaysPrice(state, good) >= order.below) return "Waiting for the price to fall.";
  if (order.stockUnder !== null && goodHolding(state, good) >= order.stockUnder) return "Waiting: you hold enough.";
  if (!marketHasStock(state.market, good, getBatchSize(good, MARKET_ORDER_BATCHES))) return "Waiting: the market has too little.";
  if (!canBuyGood(state, good, MARKET_ORDER_BATCHES) || state.stats.treasury - getMarketBuyCost(state, good, MARKET_ORDER_BATCHES) < MARKET_ORDER_RESERVE) {
    return `Waiting: orders leave ${MARKET_ORDER_RESERVE} ${CURRENCY_SYMBOL} in the treasury.`;
  }
  return null;
}

export function whySellOrderWaits(state: GameState, good: MarketGood): string | null {
  const order = state.marketOrders[good]?.sell;
  if (!order?.on) return "Switched off.";
  if (!isFeatureOpen(state, "market")) return "Waiting: the Market is shut.";
  if (ordersCross(state, good)) return CROSSED;
  if (todaysPrice(state, good) <= order.above) return "Waiting for the price to rise.";
  const amount = getBatchSize(good, MARKET_ORDER_BATCHES);
  if (goodHolding(state, good) - amount < order.keep || !canSellGood(state, good, MARKET_ORDER_BATCHES)) return "Waiting: nothing to spare above what you keep.";
  return null;
}

function list(amounts: Partial<Record<MarketGood, number>>, format: (n: number) => string): string {
  return MARKET_GOODS.filter((good) => amounts[good]).map((good) => `${format(amounts[good]!)} ${good}`).join(", ");
}

// The month's trades in one line. The log writes its numbers plainly; the
// Market passes its own format.
export function describeOrderTally(tally: OrderTally, format: (n: number) => string = (n) => Math.round(n).toLocaleString("en-US")): string {
  const parts: string[] = [];
  if (tally.spent > 0) parts.push(`bought ${list(tally.bought, format)} for ${format(tally.spent)} ${CURRENCY_SYMBOL}`);
  if (tally.earned > 0) parts.push(`sold ${list(tally.sold, format)} for ${format(tally.earned)} ${CURRENCY_SYMBOL}`);
  return `Standing orders this month: ${parts.join("; ")}.`;
}
