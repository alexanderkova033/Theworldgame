// The neighbours run their own countries (see domain/neighbours): they stay
// fed and housed, grow, build by their temper, never touch the game's
// shared dice, and are remembered by saves.
import { describe, expect, it, vi } from "vitest";
import { runNeighbours } from "../src/application/day/neighbours";
import { beginDay } from "../src/application/day/dayContext";
import { startNewGame } from "../src/application/startNewGame";
import { addDays } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import { chooseBuilding, createNeighbour, liveMonth, neighbourDice } from "../src/domain/neighbours/neighbourRules";
import type { Neighbour } from "../src/domain/neighbours/types";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";

function tenYears(nationId: string): Neighbour[] {
  let n = createNeighbour(nationId);
  let date = { year: 1, month: 1, day: 1 };
  const years: Neighbour[] = [];
  for (let m = 1; m <= 120; m++) {
    const c = chooseBuilding(liveMonth(n, nationId, date), nationId);
    n = { ...c.neighbour, lastDeed: c.deed };
    if (m % 12 === 0) years.push(n);
    date = addDays(date, 30);
  }
  return years;
}

describe("a neighbour run by the computer", () => {
  it.each(["astravia", "caldenreich", "veldoria"])("%s stays fed and housed, and grows, over ten years", (nationId) => {
    const years = tenYears(nationId);
    for (const n of years) {
      expect(n.food).toBeGreaterThan(0);
      expect(n.population).toBeLessThanOrEqual(n.homes * 1500);
      expect(n.treasury).toBeGreaterThanOrEqual(0);
    }
    expect(years[9].population).toBeGreaterThan(years[0].population * 1.5);
    expect(years[9].farms + years[9].factories).toBeGreaterThan(5);
  });

  it("keeps its own temper: Caldenreich steadier, Veldoria's factories stronger", () => {
    expect(tenYears("caldenreich")[4].stability).toBeGreaterThan(tenYears("veldoria")[4].stability);
  });

  it("rolls its own dice: the same for the same month, and never the game's", () => {
    expect(neighbourDice("veldoria", 30, "voyage")).toBe(neighbourDice("veldoria", 30, "voyage"));
    expect(neighbourDice("veldoria", 30, "voyage")).not.toBe(neighbourDice("veldoria", 31, "voyage"));
    const state = startNewGame("astravia", "astravia-harvest-union");
    const spy = vi.spyOn(Math, "random");
    runNeighbours(beginDay(state), state, { year: 1, month: 2, day: 1 });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("is every nation but yours, and is remembered by saves", () => {
    const state = startNewGame("astravia", "astravia-harvest-union");
    expect(Object.keys(state.neighbours).sort()).toEqual(["caldenreich", "veldoria"]);
    const { neighbours: _n, ...old } = state;
    expect(Object.keys(hydrateGameState(JSON.parse(JSON.stringify(old as GameState))).neighbours).sort()).toEqual(["caldenreich", "veldoria"]);
  });
});
