import type { LawDefinition } from "./types";

// Three forks, two options each. Each pair is a real trade-off, not a
// straight upgrade — picking one is meant to say something about the kind of
// nation you're running.
export const LAW_DEFINITIONS: LawDefinition[] = [
  {
    id: "labor-child-labor",
    category: "labor",
    name: "Child Labor",
    description: "Factories run longer shifts with younger hands on the floor. Output rises; the public does not forget.",
    benefit: "+15% industry",
    cost: "-8 stability",
    effects: { industryMultiplier: 1.15, stabilityDelta: -8 },
  },
  {
    id: "labor-guild-protections",
    category: "labor",
    name: "Guild Protections",
    description: "Working hours and conditions are set by charter, not by foremen. Slower, but the streets stay calmer.",
    benefit: "+8 stability",
    cost: "-8% industry",
    effects: { industryMultiplier: 0.92, stabilityDelta: 8 },
  },
  {
    id: "sustenance-rationing",
    category: "sustenance",
    name: "Grain Rationing",
    description: "The state takes control of the grain stores and doles them out by ration book. A hedge against famine, at the cost of goodwill.",
    benefit: "+3,000 food (one-time reserve)",
    cost: "-10 stability",
    effects: { foodDelta: 3000, stabilityDelta: -10 },
  },
  {
    id: "sustenance-open-markets",
    category: "sustenance",
    name: "Open Markets",
    description: "Grain moves freely to wherever the price is best — usually not your own granaries.",
    benefit: "+10% income",
    cost: "-1,500 food (one-time)",
    effects: { incomeMultiplier: 1.1, foodDelta: -1500 },
  },
  {
    id: "order-patrols",
    category: "order",
    name: "Public Order Patrols",
    description: "A funded, visible watch on every street corner. Expensive to stand up, but it settles nerves fast.",
    benefit: "+15 stability",
    cost: `-2,000 treasury (one-time)`,
    effects: { treasuryDelta: -2000, stabilityDelta: 15 },
  },
  {
    id: "order-tolerance",
    category: "order",
    name: "Civil Tolerance",
    description: "Open borders and an open hand. Word spreads, and newcomers follow.",
    benefit: "+6 stability, +500 population (one-time)",
    cost: "none",
    effects: { stabilityDelta: 6, populationDelta: 500 },
  },
];
