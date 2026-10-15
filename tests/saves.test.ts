// Saves from older versions must keep loading. A save is a plain JSON round
// trip, and hydrateGameState (src/presentation/hooks/gameSave.ts) fills in
// whatever an older save predates. These build saves in the old shapes from
// a real game rather than keeping fixture files that would go stale.
import { beforeEach, describe, expect, it } from "vitest";
import { simulateDay } from "../src/application/simulateDay";
import type { GameState } from "../src/domain/country/types";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { NATIONS, playCarefully } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

// Every save has these: the nation and party were chosen before anything else.
const ALWAYS_SAVED = ["nationId", "partyId"];

beforeEach(() => seedRandom(20261015));

function midGame(): GameState {
  const [nation, party] = NATIONS[0];
  return playCarefully(nation, party, { days: 200 });
}

function roundTrip(raw: Partial<GameState>): GameState {
  return hydrateGameState(JSON.parse(JSON.stringify(raw)) as Partial<GameState>);
}

function playsAMonth(state: GameState): void {
  let s: GameState = { ...state, isPaused: false };
  for (let day = 0; day < 30; day++) s = simulateDay(s);
  for (const [stat, value] of Object.entries(s.stats)) expect(Number.isFinite(value), stat).toBe(true);
}

describe("saved games", () => {
  // The guard for new fields: add one to GameState without a default in
  // hydrateGameState and it is dropped here, so this fails.
  it("load back exactly as they were saved", () => {
    const state = midGame();
    expect(roundTrip(state)).toEqual(JSON.parse(JSON.stringify(state)));
  });

  it.each(Object.keys(midGame()).filter((key) => !ALWAYS_SAVED.includes(key)))("still load and play from before %s existed", (key) => {
    const old: Record<string, unknown> = { ...midGame() };
    delete old[key];
    const loaded = roundTrip(old as Partial<GameState>);
    expect(loaded[key as keyof GameState], key).toBeDefined();
    playsAMonth(loaded);
  });

  it("load and play from the oldest shape: just a nation, a party and the numbers", () => {
    const state = midGame();
    const loaded = roundTrip({ nationId: state.nationId, partyId: state.partyId, stats: state.stats, date: state.date });
    playsAMonth(loaded);
  });

  it("load with events from before they had topics", () => {
    const state = midGame();
    const events = state.events.map(({ topic: _topic, about: _about, ...rest }) => rest);
    playsAMonth(roundTrip({ ...state, events }));
  });
});
