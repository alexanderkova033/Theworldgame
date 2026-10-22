// Use case: start a new game for a chosen nation. Builds the initial
// GameState, with starting infrastructure placed within that nation's own
// provinces (so different nations feel at least slightly different from day
// one, even though the underlying economy math is the same for everyone).
import { STARTING_COAL, STARTING_RESOURCE_STOCK } from "../domain/constants";
import { getSeason } from "../domain/country/calendar";
import { getDifficulty, type Difficulty } from "../domain/difficulty/difficultyData";
import { createForeignPolitics } from "../domain/diplomacy/diplomacyRules";
import { createMarket } from "../domain/market/marketRules";
import { buildStartingHomes, getHousingCapacityByProvince } from "../domain/housing/housingRules";
import { calculateIndustryOutput } from "../domain/industry/industryRules";
import { getNation } from "../domain/nations/nationRules";
import type { GameState } from "../domain/country/types";
import { FACTIONS } from "../domain/parties/factionData";
import type { Ideology } from "../domain/parties/types";
import { createProvinceStates } from "../domain/provinces/provincePopulation";
import type { PlacedBuilding } from "../domain/provinces/types";
import { emptyLedger } from "../domain/ledger/ledgerRules";
import { emptyWorkforce } from "../domain/workforce/workforceRules";
import { newChapterProgress } from "../domain/chapters/chapterData";
import type { GameMode } from "../domain/reign/reignData";
import { createNeighbours } from "../domain/neighbours/neighbourRules";

// The reign opens on New Year's Day, in the dead of winter (see getSeason):
// farms barely yield, so the very first thing the player sees is food
// falling and why. Last autumn's harvest is in the granaries
// (STARTING_FOOD) to carry the country through to spring.
const STARTING_DATE = { year: 1, month: 1, day: 1 };

// Enough for a 2-farm nation to reach spring without building anything —
// just. A 2-farm nation eats ~5,000 more than it grows per winter day.
const STARTING_FOOD = 400000;

// Everything else starts at zero: no money, no stockpiles, no political
// capital, no research. Surviving the first winter — keeping people fed,
// housed and warm with nothing in hand — is the opening challenge.
const STARTING_POPULATION = 10000;

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
  const others = nation.provinceIds.filter((id) => id !== capital);
  // Farms round-robin from the capital outward; the factory goes in the
  // next province along.
  const order = [capital, ...others];
  const buildings: PlacedBuilding[] = Array.from({ length: farmCount }, (_, i) => ({
    id: `starting-farm-${i + 1}`,
    provinceId: order[i % order.length],
    type: "farm" as const,
  }));
  buildings.push({ id: "starting-factory-1", provinceId: order[farmCount % order.length], type: "factory" });
  return buildings;
}

export function startNewGame(nationId: string, partyId: string, difficulty: Difficulty = "normal", mode: GameMode = "terms"): GameState {
  const state = { ...createInitialState(nationId, partyId, difficulty), mode };
  // Everyone starts out living where the homes are.
  return {
    ...state,
    provinces: createProvinceStates(getNation(nationId).provinceIds, state.stats.population, getHousingCapacityByProvince(state), state.stats.stability),
  };
}

function createInitialState(nationId: string, partyId: string, difficulty: Difficulty): GameState {
  const nation = getNation(nationId);
  const level = getDifficulty(difficulty);
  const farmCount = EXTRA_STARTING_FARM_NATIONS.includes(nationId) ? 4 : 3;
  const factoryCount = 1;
  const roadCount = 0;
  const stability = 60 + (STARTING_STABILITY_BONUS[nationId] ?? 0);

  return {
    difficulty,
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
    granaryCount: 0,
    canneryCount: 0,
    educationLevel: 0,

    stats: {
      treasury: level.startingTreasury,
      population: STARTING_POPULATION,
      food: STARTING_FOOD * level.startingFoodShare,
      industry: calculateIndustryOutput(factoryCount),
      stability,
      politicalPower: 0,
      popularity: 55,
    },
    unrestStage: "calm",
    resources: {
      wood: STARTING_RESOURCE_STOCK,
      ore: STARTING_RESOURCE_STOCK,
      coal: STARTING_COAL,
      grain: STARTING_RESOURCE_STOCK,
      fish: STARTING_RESOURCE_STOCK,
    },
    factionApproval: Object.fromEntries(FACTIONS.map((f) => [f, 55])) as Record<Ideology, number>,

    projects: [],
    placedBuildings: [...buildStartingBuildings(nationId, farmCount), ...buildStartingHomes(nationId, STARTING_POPULATION)],
    provinces: {},
    enactedLawIds: [],
    enactedResearchIds: [],
    researchOutcomes: {},
    activeLaw: null,
    researchFocus: { industry: null, agriculture: null, administration: null, housing: null },
    researchProgress: {},
    researchPathsFinished: {},
    pendingDemand: null,
    pendingCrisis: null,
    lasting: [],
    lostProvinceIds: [],
    settlements: [],
    settledIslandIds: [],
    foreignVoyages: [],
    foreignIslands: {},
    foreignIslandsSince: {},
    neighbours: createNeighbours(nationId),
    pendingOffer: null,
    regiments: [],
    freeProvinces: {},
    wars: {},
    sieges: {},
    ultimatum: null,
    workforce: emptyWorkforce(),
    foreignPolitics: createForeignPolitics(nationId),
    market: createMarket(getSeason(STARTING_DATE)),
    expeditions: [],
    scoutedIslandIds: [],
    events: [
      {
        id: "event-start",
        date: STARTING_DATE,
        message: `${nation.name} enters the new century in the depth of winter. The fields lie fallow; the granaries hold last autumn's harvest until spring.`,
        severity: "info",
        topic: "season",
      },
    ],
    monthlyReports: [],
    history: [],
    pendingLedger: emptyLedger(),
    lastDayLedger: emptyLedger(),
    pendingDecisionId: null,
    dangerPauses: [],
    decisionHistory: [],
    chapters: newChapterProgress(),
    retriesUsed: 0,
    mode: "terms",
    burdens: [],
    burdenOffer: null,
  };
}
