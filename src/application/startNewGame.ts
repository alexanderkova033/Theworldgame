// Use case: start a new game for a chosen nation. Builds the initial
// GameState, with starting infrastructure placed within that nation's own
// provinces (so different nations feel at least slightly different from day
// one, even though the underlying economy math is the same for everyone).
import { STARTING_RESOURCE_STOCK } from "../domain/constants";
import { calculateIndustryOutput } from "../domain/industry/industryRules";
import { getNation } from "../domain/nations/nationRules";
import type { GameState } from "../domain/country/types";
import type { PlacedBuilding } from "../domain/provinces/types";
import { emptyResourceBundle } from "../domain/resources/resourceRules";

const STARTING_DATE = { year: 1, month: 1, day: 1 };

// One-time starting-stat nudges that back up each nation's Nation.startingBonus
// blurb (nationData.ts) — keep the two in sync when tuning. Veldoria's bonus
// is an ongoing multiplier instead; see nationEffects.ts.
const EXTRA_STARTING_FARM_NATIONS = ["astravia"]; // "balancing farmland and ambition"
const STARTING_STABILITY_BONUS: Record<string, number> = { caldenreich: 10 }; // "steady administration"

// Lean, but not starved: two farms keep food production close to what a
// 10,000-strong population actually eats (FOOD_PER_FARM × 2 ≈ consumption)
// — cutting to one farm looked like "less free stuff" but was actually a
// guaranteed early famine, which isn't the same thing as "costs more to
// build." No free road, though — that bonus is easy to live without.
function buildStartingBuildings(nationId: string, farmCount: number): PlacedBuilding[] {
  const nation = getNation(nationId);
  const capital = nation.capitalProvinceId;
  const otherProvinces = nation.provinceIds.filter((id) => id !== capital);
  const secondProvince = otherProvinces[0] ?? capital;
  const thirdProvince = otherProvinces[1] ?? secondProvince;
  const fourthProvince = otherProvinces[2] ?? thirdProvince;

  const buildings: PlacedBuilding[] = [
    { id: "starting-farm-1", provinceId: capital, type: "farm" },
    { id: "starting-farm-2", provinceId: secondProvince, type: "farm" },
    { id: "starting-factory-1", provinceId: thirdProvince, type: "factory" },
  ];
  if (farmCount >= 3) {
    buildings.push({ id: "starting-farm-3", provinceId: fourthProvince, type: "farm" });
  }
  return buildings;
}

export function startNewGame(nationId: string, partyId: string): GameState {
  const nation = getNation(nationId);
  const farmCount = EXTRA_STARTING_FARM_NATIONS.includes(nationId) ? 3 : 2;
  const factoryCount = 1;
  const roadCount = 0;
  const stability = 60 + (STARTING_STABILITY_BONUS[nationId] ?? 0);

  return {
    nationId,
    partyId,
    electionsWon: 0,
    date: STARTING_DATE,
    isPaused: true,
    speed: 1,
    isGameOver: false,
    outcome: null,
    gameOverReason: null,
    taxRate: 0.15,
    debt: 0,

    farmCount,
    factoryCount,
    roadCount,
    educationLevel: 0,
    researchLevel: 0,

    stats: {
      treasury: 3000,
      population: 10000,
      food: 8000,
      industry: calculateIndustryOutput(factoryCount, 0),
      stability,
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
    placedBuildings: buildStartingBuildings(nationId, farmCount),
    enactedLawIds: [],
    enactedResearchIds: [],
    researchOutcomes: {},
    resourceDemand: emptyResourceBundle(),
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
    pendingDecisionId: null,
    decisionHistory: [],
    tutorialStep: 0,
  };
}
