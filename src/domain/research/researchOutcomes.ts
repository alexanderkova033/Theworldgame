// "You don't know if the scientist will actually make something good": a
// finished technology still rolls how well it panned out. Weighted toward
// "expected", so most results are what the node promised, with real upside
// and downside either side. Kept apart from researchRules.ts so the shared
// modifiers (domain/policy) can scale research effects without importing
// the research rules that themselves read those modifiers.
import type { ResearchOutcomeTier } from "./types";

const RESEARCH_OUTCOME_TABLE: Array<{ tier: ResearchOutcomeTier; weight: number; factor: number; flavor: string }> = [
  { tier: "breakthrough", weight: 0.2, factor: 1.5, flavor: "a real breakthrough, better than anyone projected" },
  { tier: "expected", weight: 0.6, factor: 1, flavor: "solid work, as projected" },
  { tier: "underwhelming", weight: 0.2, factor: 0.5, flavor: "a disappointment, about half what was hoped for" },
];

export function rollResearchOutcome(): { tier: ResearchOutcomeTier; factor: number; flavor: string } {
  const roll = Math.random();
  let cumulative = 0;
  for (const entry of RESEARCH_OUTCOME_TABLE) {
    cumulative += entry.weight;
    if (roll < cumulative) return entry;
  }
  return RESEARCH_OUTCOME_TABLE[RESEARCH_OUTCOME_TABLE.length - 1];
}

export function getResearchOutcomeFactor(tier: ResearchOutcomeTier | undefined): number {
  return RESEARCH_OUTCOME_TABLE.find((entry) => entry.tier === tier)?.factor ?? 1;
}

export function getResearchOutcomeFlavor(tier: ResearchOutcomeTier | undefined): string | undefined {
  return RESEARCH_OUTCOME_TABLE.find((entry) => entry.tier === tier)?.flavor;
}
