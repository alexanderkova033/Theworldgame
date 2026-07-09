// Use case: start a new game for a chosen nation. Builds the initial
// GameState, with starting infrastructure placed within that nation's own
// provinces (so different nations feel at least slightly different from day
// one, even though the underlying economy math is the same for everyone).
import { STARTING_RESOURCE_STOCK } from "../domain/constants";
import { calculateIndustryOutput } from "../domain/industry/industryRules";
import { getNation } from "../domain/nations/nationRules";
import type { GameState } from "../domain/country/types";
import type { PlacedBuilding } from "../domain/provinces/types";

const STARTING_DATE = { year: 1, month: 1, day: 1 };

function buildStartingBuildings(nationId: string): PlacedBuilding[] {
  const nation = getNation(nationId);
  const capital = nation.capitalProvinceId;
  const otherProvinces = nation.provinceIds.filter((id) => id !== capital);
  const secondProvince = otherProvinces[0] ?? capital;
  const thirdProvince = otherProvinces[1] ?? secondProvince;

  return [
    { id: "starting-farm-1", provinceId: capital, type: "farm" },
    { id: "starting-road-1", provinceId: capital, type: "road" },
    { id: "starting-farm-2", provinceId: secondProvince, type: "farm" },
    { id: "starting-factory-1", provinceId: thirdProvince, type: "factory" },
  ];
}

export function startNewGame(nationId: string): GameState {
  const nation = getNation(nationId);
  const farmCount = 2;
  const factoryCount = 1;
  const roadCount = 1;

  return {
    nationId,
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
      food: 8000,
      industry: calculateIndustryOutput(factoryCount, 0),
      stability: 60,
      armyStrength: 0,
      researchPoints: 0,
      popularity: 55,
    },
    resources: {
      wood: STARTING_RESOURCE_STOCK,
      ore: STARTING_RESOURCE_STOCK,
      grain: STARTING_RESOURCE_STOCK,
      fish: STARTING_RESOURCE_STOCK,
    },

    projects: [],
    placedBuildings: buildStartingBuildings(nationId),
    enactedLawIds: [],
    expeditions: [],
    scoutedIslandIds: [],
    events: [
      {
        id: "event-start",
        date: STARTING_DATE,
        message: `${nation.name} enters the new century amid rising industry and simmering tensions across the continent.`,
        severity: "info",
      },
    ],
    monthlyReports: [],
    history: [],
  };
}
