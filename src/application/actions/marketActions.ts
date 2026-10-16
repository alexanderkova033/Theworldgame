// Buying from and selling to the continental market (see marketRules.ts).
// `multiplier` is the player's chosen amount (×1/×5/×10 batches). Every
// trade moves the market's stock, and so its price, for the next one.
import type { GameState } from "../../domain/country/types";
import {
  getBatchSize,
  getBuyCost,
  getSellRevenue,
  marketHasStock,
  nationHasPort,
  withSupplyChange,
} from "../../domain/market/marketRules";
import type { MarketGood } from "../../domain/market/types";
import { getNation } from "../../domain/nations/nationRules";
import { getModifiers } from "../../domain/policy/policyRules";
import { recordAction } from "./recordAction";
import { isFeatureOpen, recordDeed } from "../../domain/chapters/chapterData";

const TRADE = { treasury: "trade", food: "trade" } as const;

function holding(state: GameState, good: MarketGood): number {
  return good === "food" ? state.stats.food : state.resources[good];
}

function withHolding(state: GameState, good: MarketGood, delta: number): GameState {
  if (good === "food") return { ...state, stats: { ...state.stats, food: state.stats.food + delta } };
  return { ...state, resources: { ...state.resources, [good]: state.resources[good] + delta } };
}

export function getMarketBuyCost(state: GameState, good: MarketGood, multiplier = 1): number {
  return getBuyCost(state.market, good, getBatchSize(good, multiplier), nationHasPort(getNation(state.nationId)), getModifiers(state).buyPriceMultiplier);
}

export function canBuyGood(state: GameState, good: MarketGood, multiplier = 1): boolean {
  const amount = getBatchSize(good, multiplier);
  return isFeatureOpen(state, "market") && marketHasStock(state.market, good, amount) && state.stats.treasury >= getMarketBuyCost(state, good, multiplier);
}

export function buyGood(state: GameState, good: MarketGood, multiplier = 1): GameState {
  if (!canBuyGood(state, good, multiplier)) return state;
  const amount = getBatchSize(good, multiplier);
  const cost = getMarketBuyCost(state, good, multiplier);
  const paid = { ...state, stats: { ...state.stats, treasury: state.stats.treasury - cost } };
  return recordDeed(recordAction(state, { ...withHolding(paid, good, amount), market: withSupplyChange(state.market, good, -amount) }, TRADE), "traded");
}

export function getMarketSellRevenue(state: GameState, good: MarketGood, multiplier = 1): number {
  return getSellRevenue(state.market, good, getBatchSize(good, multiplier));
}

export function canSellGood(state: GameState, good: MarketGood, multiplier = 1): boolean {
  return isFeatureOpen(state, "market") && holding(state, good) >= getBatchSize(good, multiplier);
}

export function sellGood(state: GameState, good: MarketGood, multiplier = 1): GameState {
  if (!canSellGood(state, good, multiplier)) return state;
  const amount = getBatchSize(good, multiplier);
  const revenue = getMarketSellRevenue(state, good, multiplier);
  const paid = { ...state, stats: { ...state.stats, treasury: state.stats.treasury + revenue } };
  return recordDeed(recordAction(state, { ...withHolding(paid, good, -amount), market: withSupplyChange(state.market, good, amount) }, TRADE), "traded");
}
