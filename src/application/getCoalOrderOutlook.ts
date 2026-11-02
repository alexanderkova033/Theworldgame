// Use case: what a coal buy order will come to if nothing else changes: what it
// costs over the next year, and whether it holds out through the coming winter.
// Read-only, and rolls no dice: it walks the days ahead by the same rules as the
// day's steps (the order trades, the land digs, the market settles, homes burn),
// with the market's outlook held where it is today and homes and works as they
// are. Nothing else is counted: no other trade, and no wood spent on building.
import { COAL_ORDER_FORECAST_DAYS, MARKET_ORDER_BATCHES } from "../domain/constants";
import { isFeatureOpen } from "../domain/chapters/chapterData";
import { getGoodsProduction } from "../domain/crises/crisisRules";
import { addDays, getSeason, type Season } from "../domain/country/calendar";
import type { GameState } from "../domain/country/types";
import { burnHeatingFuel, getHeatingDemand } from "../domain/housing/housingRules";
import { getLabourSituation } from "../domain/labour/labourRules";
import { getBatchSize, getBuyCost, getMidPrice, holdsPort, marketHasStock, updateMarket, withSupplyChange } from "../domain/market/marketRules";
import { getModifiers } from "../domain/policy/policyRules";
import type { ResourceBundle } from "../domain/resources/types";
import { ordersCross } from "./actions/marketOrderActions";
import { getDailyProductionSummary } from "./getDailyProductionSummary";

export type OrderLimit = "price" | "stock" | "money";

export interface CoalOrderOutlook {
  yearlyCost: number; // Crowns it spends over the next year
  coalAtWinter: number; // coal held as the coming winter starts (or today, in winter)
  winterBurn: number; // coal the homes burn through that winter (or what's left of it)
  shortDays: number; // winter days the coal runs out, with the order still working
  coldDays: number; // of those, the days the wood doesn't cover either
  heldBackBy: OrderLimit; // what stopped it buying most, up to the end of that winter
}

const SEASONS: Season[] = ["winter", "spring", "summer", "autumn"];

// Null with no coal order running, or one that can't trade at all.
export function getCoalOrderOutlook(state: GameState): CoalOrderOutlook | null {
  const order = state.marketOrders.coal?.buy;
  if (!order?.on || !isFeatureOpen(state, "market") || ordersCross(state, "coal")) return null;

  const labour = getLabourSituation(state);
  const made = Object.fromEntries(SEASONS.map((s) => [s, getGoodsProduction(state, s, (id) => labour.provinces[id]?.industryOutput ?? 0)])) as Record<Season, ResourceBundle>;
  const demand = Object.fromEntries(SEASONS.map((s) => [s, getHeatingDemand(state, s)])) as Record<Season, number>;
  const amount = getBatchSize("coal", MARKET_ORDER_BATCHES);
  const port = holdsPort(state);
  const priceMultiplier = getModifiers(state).buyPriceMultiplier;
  const production = getDailyProductionSummary(state);
  const income = production.netTreasuryFromTomorrow + production.buildingInstalments;
  const instalments = state.projects.map((p) => ({ perDay: p.treasuryCostPerDay, days: Math.ceil(p.daysRemaining) }));

  let date = state.date;
  let market = state.market;
  let { coal, wood } = state.resources;
  let treasury = state.stats.treasury;
  let yearlyCost = 0;
  let coalAtWinter: number | null = null;
  let winterBurn = 0;
  let shortDays = 0;
  let coldDays = 0;
  let winterOver = false;
  const held: Record<OrderLimit, number> = { price: 0, stock: 0, money: 0 };

  for (let day = 1; day <= COAL_ORDER_FORECAST_DAYS; day++) {
    const season = getSeason(date);
    if (season === "winter" && coalAtWinter === null) coalAtWinter = coal;
    if (season !== "winter" && coalAtWinter !== null) winterOver = true;

    // The order trades first, as the day's first step does.
    let limit: OrderLimit | null = null;
    if (order.stockUnder !== null && coal >= order.stockUnder) limit = "stock";
    else if (getMidPrice("coal", market.supply.coal) >= order.below) limit = "price";
    else if (!marketHasStock(market, "coal", amount)) limit = "price";
    else {
      const cost = getBuyCost(market, "coal", amount, port, priceMultiplier);
      if (treasury - cost < state.marketOrderReserve) limit = "money";
      else {
        treasury -= cost;
        yearlyCost += cost;
        coal += amount;
        market = withSupplyChange(market, "coal", -amount);
      }
    }
    if (limit && !winterOver) held[limit]++;

    // Then the land digs, the market settles, and homes burn.
    market = updateMarket(market, season, false);
    const burned = burnHeatingFuel({ ...state.resources, coal: coal + made[season].coal, wood: wood + made[season].wood }, demand[season]);
    coal = burned.resources.coal;
    wood = burned.resources.wood;
    if (season === "winter" && !winterOver) {
      winterBurn += demand.winter;
      if (burned.coalBurned < demand.winter) shortDays++;
      if (burned.unheatedShare > 0) coldDays++;
    }
    treasury += income - instalments.reduce((sum, p) => sum + (day <= p.days ? p.perDay : 0), 0);
    date = addDays(date, 1);
  }

  const heldBackBy = held.money > held.price && held.money > held.stock ? "money" : held.price >= held.stock ? "price" : "stock";
  return { yearlyCost, coalAtWinter: coalAtWinter ?? coal, winterBurn, shortDays, coldDays, heldBackBy };
}
