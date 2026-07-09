// Industrial output. Industry is a derived stat recomputed fresh each day
// from the number of factories, boosted by completed research.
import { INDUSTRY_PER_FACTORY, RESEARCH_INDUSTRY_BONUS } from "../constants";

export function calculateIndustryOutput(factoryCount: number, researchLevel: number): number {
  const researchMultiplier = 1 + researchLevel * RESEARCH_INDUSTRY_BONUS;
  return factoryCount * INDUSTRY_PER_FACTORY * researchMultiplier;
}
