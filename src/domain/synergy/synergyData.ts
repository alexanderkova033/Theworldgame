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
  effects: { incomeMultiplier?: number; industryMultiplier?: number };
}

export const SYNERGIES: Synergy[] = [
  {
    id: "industrial-synergy",
    lawId: "labor-overtime-shifts",
    researchId: "industry-assembly-line",
    name: "Industrial Synergy",
    description: "Overtime shifts and assembly-line discipline reinforce each other — the same push, from two directions.",
    effects: { industryMultiplier: 1.05 },
  },
  {
    id: "grain-trade-synergy",
    lawId: "sustenance-export-charter",
    researchId: "agriculture-continental-exchange",
    name: "Grain Trade Synergy",
    description: "The export charter and the continental exchange feed the same pipeline, tariff-free grain straight onto the wire.",
    effects: { incomeMultiplier: 1.05 },
  },
  {
    id: "cooperative-movement",
    lawId: "labor-workers-council",
    researchId: "industry-cooperative-workshops",
    name: "Cooperative Movement",
    description: "Shop-floor councils and worker-run workshops are the same idea, told twice — the movement reinforces itself.",
    effects: { industryMultiplier: 1.08 },
  },
  {
    id: "administrative-order",
    lawId: "order-gendarmerie",
    researchId: "administration-civil-survey",
    name: "Administrative Order",
    description: "A funded watch and a proper survey office make the state legible enough to actually collect what it's owed.",
    effects: { incomeMultiplier: 1.05 },
  },
];
