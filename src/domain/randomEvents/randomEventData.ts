// A mix of good and bad fortune that can strike every few months. Kept as
// plain data (see types.ts) so tuning or adding an event never touches
// application logic — it's just another entry in this list.
import type { RandomEventDefinition } from "./types";

export const RANDOM_EVENTS: RandomEventDefinition[] = [
  {
    id: "bountiful-harvest",
    name: "Bountiful Harvest",
    message: "An exceptional harvest fills the granaries beyond expectation.",
    severity: "info",
    effect: { foodMultiplier: 1.25 },
  },
  {
    id: "drought",
    name: "Drought",
    message: "A summer drought withers crops across the countryside.",
    severity: "warning",
    effect: { foodMultiplier: 0.7 },
  },
  {
    id: "trade-boom",
    name: "Trade Boom",
    message: "Merchants flock to your markets, and the treasury swells.",
    severity: "info",
    effect: { treasuryMultiplier: 1.15 },
  },
  {
    id: "market-crash",
    name: "Market Crash",
    message: "A downturn in the continental markets rattles the treasury.",
    severity: "warning",
    effect: { treasuryMultiplier: 0.85 },
  },
  {
    id: "civil-unrest",
    name: "Civil Unrest",
    message: "Discontent boils over into unrest in the streets.",
    severity: "danger",
    effect: { stabilityDelta: -12 },
  },
  {
    id: "festival-of-unity",
    name: "Festival of Unity",
    message: "A national festival lifts the people's spirits.",
    severity: "info",
    effect: { stabilityDelta: 8 },
  },
  {
    id: "mineral-discovery",
    name: "Mineral Discovery",
    message: "Prospectors strike a rich vein in the hills.",
    severity: "info",
    effect: { resourceMultipliers: { ore: 1.3 } },
  },
  {
    id: "timber-blight",
    name: "Timber Blight",
    message: "A blight sweeps through the forests, spoiling stores of lumber.",
    severity: "warning",
    effect: { resourceMultipliers: { wood: 0.75 } },
  },
];
