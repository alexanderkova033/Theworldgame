// Use case: start a new game. Builds the initial GameState for a fresh country.
import { calculateIndustryOutput } from "../domain/industry/industryRules";
import type { GameState } from "../domain/country/types";

const STARTING_DATE = { year: 1, month: 1, day: 1 };

export function startNewGame(): GameState {
  const farmCount = 2;
  const factoryCount = 1;
  const roadCount = 1;

  return {
    date: STARTING_DATE,
    isPaused: true,
    speed: 1,
    taxRate: 0.15,

    farmCount,
    factoryCount,
    roadCount,
    educationLevel: 0,
    researchLevel: 0,

    stats: {
      treasury: 5000,
      population: 10000,
      food: 500,
      industry: calculateIndustryOutput(factoryCount, 0),
      stability: 60,
      armyStrength: 0,
      researchPoints: 0,
      popularity: 55,
    },

    projects: [],
    events: [
      {
        id: "event-start",
        date: STARTING_DATE,
        message: "Your nation begins its journey.",
        severity: "info",
      },
    ],
    monthlyReports: [],
    history: [],
  };
}
