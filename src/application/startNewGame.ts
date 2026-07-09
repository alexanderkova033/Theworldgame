// Use case: start a new game. Builds the initial GameState for a fresh country.
import { CAPITAL_PROVINCE_ID, NATION_NAME } from "../domain/constants";
import { calculateIndustryOutput } from "../domain/industry/industryRules";
import type { GameState } from "../domain/country/types";
import type { PlacedBuilding } from "../domain/provinces/types";

const STARTING_DATE = { year: 1, month: 1, day: 1 };

// The nation starts with a little infrastructure already in place, spread
// across a few provinces so the map isn't empty on day one.
const STARTING_BUILDINGS: PlacedBuilding[] = [
  { id: "starting-farm-1", provinceId: CAPITAL_PROVINCE_ID, type: "farm" }, // Redgate
  { id: "starting-farm-2", provinceId: "province-2", type: "farm" }, // Marrow Coast
  { id: "starting-factory-1", provinceId: "province-1", type: "factory" }, // Veldshire
  { id: "starting-road-1", provinceId: CAPITAL_PROVINCE_ID, type: "road" }, // Redgate
];

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
    placedBuildings: STARTING_BUILDINGS,
    events: [
      {
        id: "event-start",
        date: STARTING_DATE,
        message: `${NATION_NAME} enters the new century amid rising industry and simmering tensions across the continent.`,
        severity: "info",
      },
    ],
    monthlyReports: [],
    history: [],
  };
}
