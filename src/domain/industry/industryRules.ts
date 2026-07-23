// Industrial output. Industry is a derived stat recomputed fresh each day
// from the number of factories, scaled by law/research/nation multipliers
// elsewhere (see simulateDay.ts step 5).
import { INDUSTRY_PER_FACTORY } from "../constants";

export function calculateIndustryOutput(factoryCount: number): number {
  return factoryCount * INDUSTRY_PER_FACTORY;
}
