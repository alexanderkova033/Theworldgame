// Bank trading, Catan-style: any resource for any other at a base rate, with
// a better rate for nations that own a coastal ("port") province — and, on
// top of that base rate, a dynamic market: buying a resource repeatedly
// makes it dearer, selling it repeatedly makes it cheaper, drifting back to
// baseline the longer it's left alone. See getDynamicTradeRate/applyTradeDemand/decayDemand.
import { BASE_TRADE_RATE, DEMAND_CAP, DEMAND_DECAY_PER_DAY, DEMAND_PRICE_SENSITIVITY, DEMAND_STEP, PORT_TRADE_RATE } from "../constants";
import type { Nation } from "../nations/types";
import { MAP_GEOMETRY } from "../provinces/provinceData";
import { RESOURCE_TYPES, type ResourceBundle, type ResourceType } from "./types";

export function nationHasPort(nation: Nation): boolean {
  return nation.provinceIds.some((provinceId) => {
    const province = MAP_GEOMETRY.provinces.find((p) => p.id === provinceId);
    return province?.terrain === "coast";
  });
}

export function getTradeRate(nation: Nation): number {
  return nationHasPort(nation) ? PORT_TRADE_RATE : BASE_TRADE_RATE;
}

// A resource's current price index: 1 at neutral demand, climbing above 1
// when it's been in demand (bought a lot) and dropping below 1 when it's
// been oversupplied (sold a lot). Clamped so no resource can become free or
// infinitely expensive.
export function getPriceIndex(demand: ResourceBundle, type: ResourceType): number {
  const clamped = Math.min(DEMAND_CAP, Math.max(-DEMAND_CAP, demand[type]));
  return 1 + clamped * DEMAND_PRICE_SENSITIVITY;
}

// The bank's actual rate for a give->receive trade right now: the base port
// rate, scaled up if what you're receiving is in demand and scaled down if
// what you're giving is in demand (i.e. valuable) too.
export function getDynamicTradeRate(nation: Nation, demand: ResourceBundle, give: ResourceType, receive: ResourceType): number {
  const base = getTradeRate(nation);
  return base * (getPriceIndex(demand, receive) / getPriceIndex(demand, give));
}

// Every trade nudges the market: the resource you gave gets a little more
// plentiful (cheaper), the one you received a little scarcer (dearer).
export function applyTradeDemand(demand: ResourceBundle, give: ResourceType, receive: ResourceType): ResourceBundle {
  return {
    ...demand,
    [give]: demand[give] - DEMAND_STEP,
    [receive]: demand[receive] + DEMAND_STEP,
  };
}

// Daily mean-reversion — a market you stop trading in cools back to
// baseline over time instead of staying skewed forever.
export function decayDemand(demand: ResourceBundle): ResourceBundle {
  const decayed = {} as ResourceBundle;
  for (const type of RESOURCE_TYPES) {
    decayed[type] = demand[type] * (1 - DEMAND_DECAY_PER_DAY);
  }
  return decayed;
}
