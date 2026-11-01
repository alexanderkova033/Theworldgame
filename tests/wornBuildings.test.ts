// A building shows wear before it breaks, and the player may pay to service it.
import { afterEach, describe, expect, it, vi } from "vitest";
import { canRepairBuilding, repairBuilding } from "../src/application/actions/repairBuilding";
import { canServiceBuilding, serviceBuilding } from "../src/application/actions/serviceBuilding";
import { playDay } from "../src/application/playDay";
import { simulateDay } from "../src/application/simulateDay";
import { REPAIR_COST_SHARE, REPAIR_DAYS, FARM_COST, FARM_WOOD_COST, FACTORY_COST, FACTORY_ORE_COST, SERVICE_COST_SHARE, WORN_WARNING_DAYS } from "../src/domain/constants";
import { dayNumber } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import { DIFFICULTY_SETTINGS } from "../src/domain/difficulty/difficultyData";
import { getRepairCost, getServiceCost, getWorkingCounts, getWornDaysLeft, isWorking, isWorn, rollBreakdowns } from "../src/domain/maintenance/maintenanceRules";
import type { PlacedBuilding } from "../src/domain/provinces/types";
import { rollRiotDamage } from "../src/domain/unrest/unrestRules";
import { returnBuildings, seizeBuildings } from "../src/domain/uprising/uprisingRules";
import { getEventKind } from "../src/presentation/eventKinds";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { calmStart } from "./support/calmStart";
import { NATIONS, playCarefully } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

const [NATION, PARTY] = NATIONS[0];

const farm = (over: Partial<PlacedBuilding> = {}): PlacedBuilding => ({ id: "f1", provinceId: "p", type: "farm", ...over });

// A calm country with its first farm worn, due to break `days` from today.
function withWornFarm(days = WORN_WARNING_DAYS): { state: GameState; id: string } {
  const start = calmStart(NATION, PARTY);
  const id = start.placedBuildings.find((b) => b.type === "farm")!.id;
  const placedBuildings = start.placedBuildings.map((b) => (b.id === id ? { ...b, wornUntilDay: dayNumber(start.date) + days } : b));
  return { state: { ...start, isPaused: false, placedBuildings, stats: { ...start.stats, treasury: 100000 }, resources: { ...start.resources, wood: 1000, ore: 1000 } }, id };
}

const find = (s: GameState, id: string) => s.placedBuildings.find((b) => b.id === id)!;

afterEach(() => vi.restoreAllMocks());

describe("a failed roll", () => {
  it("marks the building worn, working, with the whole warning to run", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = rollBreakdowns([farm()], 100, 0, 1);
    expect(result.broken).toEqual([]);
    expect(result.worn.map((b) => b.id)).toEqual(["f1"]);
    const [worn] = result.placedBuildings;
    expect(worn.condition).toBeUndefined();
    expect(isWorking(worn)).toBe(true);
    expect(isWorn(worn)).toBe(true);
    // Marked while day 100 is played, so the player first sees it on day 101.
    expect(worn.wornUntilDay! - 101).toBe(WORN_WARNING_DAYS);
  });

  it("happens as often as a breakdown did: the chance of a roll has not moved", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.0013);
    expect(rollBreakdowns([farm()], 100, 0, 1).worn).toHaveLength(1);
    random.mockReturnValue(0.0014);
    expect(rollBreakdowns([farm()], 100, 0, 1).worn).toHaveLength(0);
  });

  it("is not rolled again for a building already worn", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const placed = [farm({ wornUntilDay: 110 })];
    const result = rollBreakdowns(placed, 100, 0, 1);
    expect(random).not.toHaveBeenCalled();
    expect(result.placedBuildings).toBe(placed);
  });

  it("changes nothing on an ordinary day, so the map isn't redrawn while a building is worn", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const placed = [farm({ wornUntilDay: 110 }), farm({ id: "f2" })];
    expect(rollBreakdowns(placed, 100, 0, 1).placedBuildings).toBe(placed);
  });
});

describe("a worn building", () => {
  it("works through the warning, then breaks", () => {
    let { state, id } = withWornFarm();
    expect(getWornDaysLeft(find(state, id), state.date)).toBe(WORN_WARNING_DAYS);
    const working = getWorkingCounts(state);
    for (let day = 0; day < WORN_WARNING_DAYS; day++) {
      expect(isWorn(find(state, id))).toBe(true);
      expect(getWorkingCounts(state).farms).toBe(working.farms);
      state = simulateDay(state);
    }
    expect(getWornDaysLeft(find(state, id), state.date)).toBe(0);
    expect(isWorking(find(state, id))).toBe(true);
    state = simulateDay(state);
    expect(find(state, id).condition).toBe("broken");
    expect(find(state, id).wornUntilDay).toBeUndefined();
    expect(getWorkingCounts(state).farms).toBe(working.farms - 1);
    expect(state.events.some((e) => e.topic === "breakdown" && e.message.endsWith("has broken down."))).toBe(true);
  });

  it("then repairs as any broken building does, and comes back unworn", () => {
    let { state, id } = withWornFarm(0);
    state = simulateDay(state);
    expect(canRepairBuilding(state, id)).toBe(true);
    state = repairBuilding(state, id);
    for (let day = 0; day < REPAIR_DAYS; day++) state = simulateDay(state);
    expect(find(state, id).condition).toBeUndefined();
    expect(isWorn(find(state, id))).toBe(false);
  });

  it("can't be repaired: there's nothing broken yet", () => {
    const { state, id } = withWornFarm();
    expect(canRepairBuilding(state, id)).toBe(false);
  });
});

describe("a notice of wear", () => {
  it("comes once for each building, folds, and neither pauses nor sends a letter", () => {
    seedRandom(20261015);
    let state: GameState = { ...calmStart(NATION, PARTY), isPaused: false, speed: 3 };
    const letter = state.pendingDecisionId;
    DIFFICULTY_SETTINGS.normal.breakdownMultiplier = 50; // plenty turn worn, all inside the first month
    try {
      for (let day = 0; day < 20; day++) state = playDay(state);
    } finally {
      DIFFICULTY_SETTINGS.normal.breakdownMultiplier = 0;
    }
    const notices = state.events.filter((e) => e.topic === "worn");
    expect(notices.length).toBeGreaterThan(1);
    expect(notices).toHaveLength(state.placedBuildings.filter(isWorn).length);
    expect(notices.every((e) => e.message.includes(`within ${WORN_WARNING_DAYS} days`))).toBe(true);
    expect(getEventKind(notices[0])).toMatchObject({ kind: "worn", foldable: true });
    expect(state.isPaused).toBe(false);
    expect(state.events.some((e) => e.topic === "paused")).toBe(false);
    expect(state.pendingDecisionId).toBe(letter);
  });
});

describe("servicing", () => {
  it("clears the wear at once, and the building never leaves service", () => {
    const { state, id } = withWornFarm();
    const working = getWorkingCounts(state);
    expect(canServiceBuilding(state, id)).toBe(true);
    const after = serviceBuilding(state, id);
    expect(isWorn(find(after, id))).toBe(false);
    expect(find(after, id).condition).toBeUndefined();
    expect(getWorkingCounts(after)).toEqual(working);
    let later = after;
    for (let day = 0; day < WORN_WARNING_DAYS + 5; day++) later = simulateDay(later);
    expect(find(later, id).condition).toBeUndefined();
  });

  it("costs 30% of the build price, in money and the good, against a quarter for a repair", () => {
    expect(SERVICE_COST_SHARE).toBe(0.3);
    expect(REPAIR_COST_SHARE).toBe(0.25);
    expect(getServiceCost("farm")).toEqual({ treasury: Math.round(FARM_COST * 0.3), resourceType: "wood", resourceAmount: Math.ceil(FARM_WOOD_COST * 0.3) });
    expect(getServiceCost("factory")).toEqual({ treasury: Math.round(FACTORY_COST * 0.3), resourceType: "ore", resourceAmount: Math.ceil(FACTORY_ORE_COST * 0.3) });
    expect(getServiceCost("farm").treasury).toBeGreaterThan(getRepairCost("farm").treasury);

    const { state, id } = withWornFarm();
    const cost = getServiceCost("farm");
    const after = serviceBuilding(state, id);
    expect(after.stats.treasury).toBe(state.stats.treasury - cost.treasury);
    expect(after.resources.wood).toBe(state.resources.wood - cost.resourceAmount);
  });

  it("gets cheaper with what makes a repair cheaper", () => {
    expect(getServiceCost("factory", 0.5).treasury).toBe(Math.round(FACTORY_COST * 0.15));
  });

  it("can't be paid for without the money or the good, and changes nothing", () => {
    const { state, id } = withWornFarm();
    const cost = getServiceCost("farm");
    const noMoney = { ...state, stats: { ...state.stats, treasury: cost.treasury - 1 } };
    const noWood = { ...state, resources: { ...state.resources, wood: cost.resourceAmount - 1 } };
    expect(canServiceBuilding(noMoney, id)).toBe(false);
    expect(serviceBuilding(noMoney, id)).toBe(noMoney);
    expect(canServiceBuilding(noWood, id)).toBe(false);
    expect(serviceBuilding(noWood, id)).toBe(noWood);
  });

  it("is only for a worn building", () => {
    const start = calmStart(NATION, PARTY);
    const id = start.placedBuildings[0].id;
    expect(canServiceBuilding({ ...start, stats: { ...start.stats, treasury: 100000 } }, id)).toBe(false);
    const broken = { ...start, placedBuildings: start.placedBuildings.map((b) => (b.id === id ? { ...b, condition: "broken" as const } : b)) };
    expect(canServiceBuilding(broken, id)).toBe(false);
  });
});

describe("what skips the warning", () => {
  it("a riot breaks a building at once, worn or not", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    for (const target of [farm(), farm({ wornUntilDay: 110 })]) {
      const { wrecked, placedBuildings } = rollRiotDamage([target], 0);
      expect(wrecked?.condition).toBe("broken");
      expect(placedBuildings[0].condition).toBe("broken");
      expect(isWorn(placedBuildings[0])).toBe(false);
      expect(placedBuildings[0].wornUntilDay).toBeUndefined();
    }
  });

  it("a new game's broken works start broken, not worn", () => {
    const original = DIFFICULTY_SETTINGS.normal.startingBroken;
    DIFFICULTY_SETTINGS.normal.startingBroken = 2;
    try {
      const start = calmStart(NATION, PARTY);
      const broken = start.placedBuildings.filter((b) => b.condition === "broken");
      expect(broken).toHaveLength(2);
      expect(start.placedBuildings.some((b) => b.wornUntilDay !== undefined)).toBe(false);
    } finally {
      DIFFICULTY_SETTINGS.normal.startingBroken = original;
    }
  });
});

describe("other hands on a worn building", () => {
  it("rebels take it and give it back free of wear, as the clock can't be answered while they hold it", () => {
    const placed = seizeBuildings([farm({ wornUntilDay: 110 })], "p");
    expect(placed[0].condition).toBe("seized");
    expect(isWorn(placed[0])).toBe(false);
    const back = returnBuildings(placed, "p");
    expect(isWorking(back[0])).toBe(true);
    expect(isWorn(back[0])).toBe(false);
  });

  it("isn't rolled or broken while out of use", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const seized: PlacedBuilding[] = [farm({ condition: "seized" })];
    const result = rollBreakdowns(seized, 100, 0, 1);
    expect(result.placedBuildings).toBe(seized);
  });
});

describe("the scripted player", () => {
  const breakdowns = (service?: boolean) => {
    seedRandom(20261015);
    DIFFICULTY_SETTINGS.normal.breakdownMultiplier = 5;
    try {
      const seen = new Set<string>();
      playCarefully(NATION, PARTY, {
        days: 200,
        difficulty: "normal",
        service,
        onDay: (s) => {
          for (const e of s.events) if (e.topic === "breakdown") seen.add(e.id);
        },
      });
      return seen.size;
    } finally {
      DIFFICULTY_SETTINGS.normal.breakdownMultiplier = 0;
    }
  };

  it("leaves wear alone by default, and services it when asked", () => {
    expect(breakdowns()).toBeGreaterThan(0);
    expect(breakdowns(true)).toBeLessThan(breakdowns());
  });
});

describe("saves", () => {
  const roundTrip = (raw: unknown) => hydrateGameState(JSON.parse(JSON.stringify(raw)) as Partial<GameState>);

  it("from before wear load with nothing worn, and play on", () => {
    const start = calmStart(NATION, PARTY);
    const old = { ...start, placedBuildings: start.placedBuildings.map(({ id, provinceId, type }) => ({ id, provinceId, type })) };
    let loaded = roundTrip(old);
    expect(loaded.placedBuildings.some(isWorn)).toBe(false);
    loaded = simulateDay({ ...loaded, isPaused: false });
    expect(Number.isFinite(loaded.stats.treasury)).toBe(true);
  });

  it("keep a worn building's time", () => {
    const { state, id } = withWornFarm(12);
    const loaded = roundTrip(state);
    expect(getWornDaysLeft(find(loaded, id), loaded.date)).toBe(12);
  });
});
