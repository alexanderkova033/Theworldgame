// The continental market, as supply and demand. For every good the market
// holds a stock. Prices come from how much of it there is against how much
// is normal: sell into it and the stock swells (prices fall), buy from it
// and it drains (prices rise). Every day the stock drifts back toward its
// equilibrium — which itself moves: food and grain are scarce in winter and
// glutted at harvest, wood is in demand when everyone's heating, and the
// wider world's outlook wanders month to month.
//
// Because each extra unit sold fetches a little less than the last, dumping
// a mountain of surplus pays off less and less — there's no infinite money
// in it. Buying always costs more than selling (MARKET_BUY_MARKUP vs
// MARKET_SELL_FACTOR), so flipping goods back and forth only loses.
import {
  MARKET_BUY_MARKUP,
  MARKET_OUTLOOK_MAX,
  MARKET_OUTLOOK_MIN,
  MARKET_OUTLOOK_SWING,
  MARKET_PORT_BUY_MARKUP,
  MARKET_PRICE_CEILING,
  MARKET_PRICE_FLOOR,
  MARKET_RECOVERY_PER_DAY,
  MARKET_SELL_FACTOR,
} from "../constants";
import type { Season } from "../country/calendar";
import type { Nation } from "../nations/types";
import { MAP_GEOMETRY } from "../provinces/provinceData";
import type { MarketGood, MarketState } from "./types";

export const MARKET_GOODS: MarketGood[] = ["wood", "ore", "grain", "fish", "food"];

interface GoodSpec {
  basePrice: number; // mid price per unit when the market holds exactly its normal stock
  equilibrium: number; // the market's normal stock
  batch: number; // units per trade at ×1
  priceFloor?: number; // lowest price as a share of base (default MARKET_PRICE_FLOOR)
  recovery?: number; // share of the gap to normal closed per day (default MARKET_RECOVERY_PER_DAY)
}

export const GOOD_SPECS: Record<MarketGood, GoodSpec> = {
  wood: { basePrice: 20, equilibrium: 150, batch: 5 },
  ore: { basePrice: 22, equilibrium: 150, batch: 5 },
  grain: { basePrice: 16, equilibrium: 150, batch: 5 },
  fish: { basePrice: 16, equilibrium: 150, batch: 5 },
  // Food moves in cartloads and is cheap per unit — but the market only
  // absorbs so much before the price collapses.
  // A food glut can drive the price almost to nothing, and the market only
  // works through it slowly — dumping a surplus every day stops paying.
  food: { basePrice: 0.008, equilibrium: 60000, batch: 2000, priceFloor: 0.05, recovery: 0.015 },
};

// How the season shifts each good's normal stock (1 = unchanged).
const SEASONAL_SUPPLY: Record<Season, Partial<Record<MarketGood, number>>> = {
  winter: { food: 0.6, grain: 0.5, wood: 0.75 },
  spring: { food: 0.9 },
  summer: { fish: 1.2 },
  autumn: { food: 1.4, grain: 1.4 },
};

export function nationHasPort(nation: Nation): boolean {
  return nation.provinceIds.some((provinceId) => MAP_GEOMETRY.provinces.find((p) => p.id === provinceId)?.terrain === "coast");
}

// Where the market's stock is heading today.
export function getTargetSupply(good: MarketGood, season: Season, outlook: number): number {
  return GOOD_SPECS[good].equilibrium * (SEASONAL_SUPPLY[season][good] ?? 1) * outlook;
}

export function createMarket(season: Season): MarketState {
  const supply = {} as Record<MarketGood, number>;
  const outlook = {} as Record<MarketGood, number>;
  for (const good of MARKET_GOODS) {
    outlook[good] = 1;
    supply[good] = getTargetSupply(good, season, 1);
  }
  return { supply, outlook };
}

// Mid price at a given stock: scarce stock, high price; glut, low price.
export function getMidPrice(good: MarketGood, supply: number): number {
  const spec = GOOD_SPECS[good];
  const ratio = spec.equilibrium / Math.max(1, supply);
  return spec.basePrice * Math.min(MARKET_PRICE_CEILING, Math.max(spec.priceFloor ?? MARKET_PRICE_FLOOR, ratio));
}

// 1 = normal; above 1 the good is scarce (pricey), below it's plentiful.
export function getPriceRatio(market: MarketState, good: MarketGood): number {
  return getMidPrice(good, market.supply[good]) / GOOD_SPECS[good].basePrice;
}

export function getBatchSize(good: MarketGood, multiplier: number): number {
  return GOOD_SPECS[good].batch * multiplier;
}

// A batch is priced at the stock level halfway through it, so a big order
// moves its own price.
export function getBuyCost(market: MarketState, good: MarketGood, amount: number, hasPort: boolean): number {
  const mid = getMidPrice(good, market.supply[good] - amount / 2);
  return amount * mid * (hasPort ? MARKET_PORT_BUY_MARKUP : MARKET_BUY_MARKUP);
}

export function getSellRevenue(market: MarketState, good: MarketGood, amount: number): number {
  return amount * getMidPrice(good, market.supply[good] + amount / 2) * MARKET_SELL_FACTOR;
}

// The market can't sell what it doesn't hold.
export function marketHasStock(market: MarketState, good: MarketGood, amount: number): boolean {
  return market.supply[good] - amount >= 1;
}

export function withSupplyChange(market: MarketState, good: MarketGood, delta: number): MarketState {
  return { ...market, supply: { ...market.supply, [good]: market.supply[good] + delta } };
}

// Daily: every stock relaxes toward its (seasonal, outlook-adjusted)
// target. Monthly: the outlook for each good takes a random step.
export function updateMarket(market: MarketState, season: Season, isNewMonth: boolean): MarketState {
  const outlook = { ...market.outlook };
  if (isNewMonth) {
    for (const good of MARKET_GOODS) {
      const step = 1 + (Math.random() * 2 - 1) * MARKET_OUTLOOK_SWING;
      outlook[good] = Math.min(MARKET_OUTLOOK_MAX, Math.max(MARKET_OUTLOOK_MIN, outlook[good] * step));
    }
  }
  const supply = {} as Record<MarketGood, number>;
  for (const good of MARKET_GOODS) {
    const target = getTargetSupply(good, season, outlook[good]);
    supply[good] = market.supply[good] + (target - market.supply[good]) * (GOOD_SPECS[good].recovery ?? MARKET_RECOVERY_PER_DAY);
  }
  return { supply, outlook };
}
