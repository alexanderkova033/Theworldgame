import type { LawDefinition } from "./types";

// Three forks, two options each. Each pair is a real trade-off, not a
// straight upgrade — picking one is meant to say something about the kind of
// nation you're running.
export const LAW_DEFINITIONS: LawDefinition[] = [
  {
    id: "labor-overtime-shifts",
    category: "labor",
    name: "Overtime Shifts",
    description: "Factory floors run around the clock under gaslight. Output climbs; exhaustion spreads with it.",
    benefit: "+15% industry",
    cost: "-8 stability",
    effects: { industryMultiplier: 1.15, stabilityDelta: -8 },
  },
  {
    id: "labor-guild-charter",
    category: "labor",
    name: "Guild Charter",
    description: "The trade guilds set hours and terms by charter, not by foremen. Slower, but steadier.",
    benefit: "+8 stability",
    cost: "-8% industry",
    effects: { industryMultiplier: 0.92, stabilityDelta: 8 },
  },
  {
    id: "sustenance-state-granary",
    category: "sustenance",
    name: "State Granary",
    description: "The treasury seizes the harvest and locks it behind ration books — a hedge against hunger, resented all the same.",
    benefit: "+3,000 food (one-time reserve)",
    cost: "-10 stability",
    effects: { foodDelta: 3000, stabilityDelta: -10 },
  },
  {
    id: "sustenance-export-charter",
    category: "sustenance",
    name: "Export Charter",
    description: "Grain ships out tariff-free to whoever pays best. The granaries thin; the treasury fattens.",
    benefit: "+10% income",
    cost: "-1,500 food (one-time)",
    effects: { incomeMultiplier: 1.1, foodDelta: -1500 },
  },
  {
    id: "order-gendarmerie",
    category: "order",
    name: "Gendarmerie Act",
    description: "A funded, uniformed watch on every corner, paid for up front. Nerves settle fast.",
    benefit: "+15 stability",
    cost: "-2,000 treasury (one-time)",
    effects: { treasuryDelta: -2000, stabilityDelta: 15 },
  },
  {
    id: "order-open-border",
    category: "order",
    name: "Open Border Accord",
    description: "Papers are waved through and newcomers welcomed. Word spreads, and people follow.",
    benefit: "+6 stability, +500 population (one-time)",
    cost: "none",
    effects: { stabilityDelta: 6, populationDelta: 500 },
  },
];
