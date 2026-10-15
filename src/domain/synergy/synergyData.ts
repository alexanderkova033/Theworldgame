import type { ModifierEffects } from "../policy/modifiers";

// Synergies are the "overlap" between Laws and Research: unlike
// crossRequirement (which blocks a node until something in the other tree
// is enacted), a synergy is a reward — an extra ongoing bonus layered on
// top of whatever each node already does alone, once BOTH halves of the
// pair are enacted. The two nodes don't need to gate each other; picking
// complementary paths across the two trees is its own payoff.
export interface Synergy {
  id: string;
  lawId: string;
  researchId: string;
  name: string;
  description: string;
  effects: ModifierEffects;
}

export const SYNERGIES: Synergy[] = [
  {
    id: "industrial-synergy",
    lawId: "labor-overtime-shifts",
    researchId: "industry-assembly-line",
    name: "Industrial Synergy",
    description: "Overtime shifts and the assembly line push the same way.",
    effects: { industryMultiplier: 1.05 },
  },
  {
    id: "grain-trade-synergy",
    lawId: "sustenance-export-charter",
    researchId: "agriculture-grain-mills",
    name: "Grain Trade",
    description: "The mills turn out flour and the charter ships it abroad.",
    effects: { incomeMultiplier: 1.05 },
  },
  {
    id: "cooperative-movement",
    lawId: "labor-workers-councils",
    researchId: "industry-cooperative-workshops",
    name: "Cooperative Movement",
    description: "Councils on the floor and workshops owned by their workers are the same idea twice.",
    effects: { industryMultiplier: 1.08 },
  },
  {
    id: "administrative-order",
    lawId: "order-gendarmerie",
    researchId: "administration-civil-survey",
    name: "Administrative Order",
    description: "A survey of every district and a constable to back it up.",
    effects: { incomeMultiplier: 1.05 },
  },
  {
    id: "public-health",
    lawId: "revenue-welfare-fund",
    researchId: "housing-sewers",
    name: "Public Health",
    description: "Clean water and a little money to live on keep the poor out of the fever wards.",
    effects: { hardshipMultiplier: 0.85 },
  },
  {
    id: "state-finance",
    lawId: "revenue-national-bank",
    researchId: "administration-statistics-bureau",
    name: "State Finance",
    description: "A bank that knows exactly what every district can pay.",
    effects: { incomeMultiplier: 1.05 },
  },
];
