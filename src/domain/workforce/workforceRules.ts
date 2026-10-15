// The salaried workforce: scientists (one research area each) and police.
// Caps keep hiring tied to the rest of the country — schools train
// scientists, and there's only so much policing a population needs.
import {
  BASE_SCIENTIST_CAP,
  POLICE_BREAKDOWN_REDUCTION,
  POLICE_BREAKDOWN_REDUCTION_CAP,
  POLICE_SALARY,
  POLICE_STABILITY_CAP,
  POLICE_STABILITY_PER_OFFICER,
  POPULATION_PER_POLICE,
  SCIENTIST_SALARY,
  SCIENTISTS_PER_SCHOOL,
} from "../constants";
import type { ResearchCategory } from "../research/types";
import type { Workforce } from "./types";

export const RESEARCH_CATEGORIES: ResearchCategory[] = ["industry", "agriculture", "administration", "housing"];

export function emptyWorkforce(): Workforce {
  return { scientists: { industry: 0, agriculture: 0, administration: 0, housing: 0 }, police: 0 };
}

export function getTotalScientists(workforce: Workforce): number {
  return RESEARCH_CATEGORIES.reduce((sum, category) => sum + workforce.scientists[category], 0);
}

// Every school built (working or not — a broken roof doesn't un-train
// anyone) raises how many scientists the country can employ.
export function getScientistCap(educationLevel: number): number {
  return BASE_SCIENTIST_CAP + educationLevel * SCIENTISTS_PER_SCHOOL;
}

export function getPoliceCap(population: number): number {
  return Math.floor(population / POPULATION_PER_POLICE);
}

// wageMultiplier: laws and the party's creed (see domain/policy).
export function getDailySalaries(workforce: Workforce, wageMultiplier = 1): number {
  return (getTotalScientists(workforce) * SCIENTIST_SALARY + workforce.police * POLICE_SALARY) * wageMultiplier;
}

export function getPoliceStabilityBonus(police: number): number {
  return Math.min(POLICE_STABILITY_CAP, police * POLICE_STABILITY_PER_OFFICER);
}

export function getPoliceBreakdownReduction(police: number): number {
  return Math.min(POLICE_BREAKDOWN_REDUCTION_CAP, police * POLICE_BREAKDOWN_REDUCTION);
}

// Unpaid staff walk out: police first (cheapest to lose), then scientists
// from whichever area has the most, until what's left is affordable.
export function layOffUntilAffordable(workforce: Workforce, budget: number, wageMultiplier = 1): { workforce: Workforce; laidOff: number } {
  let next: Workforce = { scientists: { ...workforce.scientists }, police: workforce.police };
  let laidOff = 0;
  while (getDailySalaries(next, wageMultiplier) > Math.max(0, budget)) {
    if (next.police > 0) {
      next = { ...next, police: next.police - 1 };
    } else {
      const largest = RESEARCH_CATEGORIES.reduce((a, b) => (next.scientists[b] > next.scientists[a] ? b : a));
      if (next.scientists[largest] === 0) break;
      next = { ...next, scientists: { ...next.scientists, [largest]: next.scientists[largest] - 1 } };
    }
    laidOff += 1;
  }
  return { workforce: laidOff === 0 ? workforce : next, laidOff };
}
