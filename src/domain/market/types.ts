import type { ResourceType } from "../resources/types";

// Everything the continental market deals in: the raw resources, and
// food (see marketRules.ts).
export type MarketGood = ResourceType | "food";

export interface MarketState {
  supply: Record<MarketGood, number>; // units the market currently holds
  outlook: Record<MarketGood, number>; // the wider world's slow drift, ~0.7..1.3
}
