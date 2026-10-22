// Whole games played by a script, three game years long, in every nation.
// These guard the balance the game is tuned to: a careful player survives
// and wins the first election, an idle one does not last, and following
// any one path of the trees doesn't wreck a country on its own.
import { beforeEach, describe, expect, it } from "vitest";
import { completeLaw } from "../src/application/actions/enactLaw";
import { startNewGame } from "../src/application/startNewGame";
import type { Difficulty } from "../src/domain/difficulty/difficultyData";
import { getElectionThreshold } from "../src/domain/parties/electionRules";
import { LAW_PATHS } from "../src/domain/laws/lawData";
import { RESEARCH_PATHS } from "../src/domain/research/researchData";
import { NATIONS, playCarefully, playIdle } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

const THREE_YEARS = 3 * 365;

beforeEach(() => seedRandom(20261015));

describe("a careful player", { timeout: 30000 }, () => {
  it.each(NATIONS)("survives three years in %s and wins the first election", (nation, party) => {
    const end = playCarefully(nation, party, { days: THREE_YEARS });
    expect(end.isGameOver).toBe(false);
    expect(end.electionsWon).toBeGreaterThanOrEqual(1);
  });

  // The whole game: three elections in a row, inside five years.
  it.each(NATIONS)("wins outright in %s within five years", (nation, party) => {
    const end = playCarefully(nation, party, { days: 5 * 365 });
    expect(end.outcome).toBe("victory");
  });

  // Political power is meant to run short for a player who makes laws, so
  // each law is a choice. (One who passes none can still bank it; see TODO.md.)
  // Twelve three-year games, so it gets longer than the default to finish.
  it("runs short of political power while following a law path", { timeout: 20000 }, () => {
    const left = LAW_PATHS.map((path) => {
      seedRandom(20261015);
      const [nation, party] = NATIONS[path.key.length % NATIONS.length];
      return playCarefully(nation, party, { days: THREE_YEARS, follow: { tree: "law", pathKey: path.key } }).stats.politicalPower;
    });
    expect(left.reduce((a, b) => a + b, 0) / left.length).toBeLessThan(350);
  });

  // Daily income should be the country's living, not market sales, or the
  // "+10% income" laws and research barely register.
  it.each(NATIONS)("lives mostly on taxes and industry in %s", (nation, party) => {
    const end = playCarefully(nation, party, { days: THREE_YEARS });
    const earned = { income: 0, trade: 0 };
    for (const report of end.monthlyReports) {
      const treasury = report.ledger?.treasury ?? {};
      earned.income += (treasury.taxes ?? 0) + (treasury.industry ?? 0);
      earned.trade += treasury.trade ?? 0;
    }
    expect(earned.income).toBeGreaterThan(earned.trade);
  });

  // Surviving isn't the whole test: if a careful player never comes near
  // losing, the game has gone soft. Support should come close to the line
  // for the next election at some point after the opening months.
  it.each(NATIONS)("has to work for it in %s", (nation, party) => {
    let closest = 100;
    let day = 0;
    playCarefully(nation, party, {
      days: THREE_YEARS,
      onDay: (s) => {
        if (++day > 60) closest = Math.min(closest, s.stats.popularity - getElectionThreshold(s));
      },
    });
    expect(closest).toBeLessThan(8);
  });
});

describe("an idle player", () => {
  it.each(NATIONS)("loses %s within two years", (nation, party) => {
    expect(playIdle(nation, party, 2 * 365).isGameOver).toBe(true);
  });
});

// One nation per path keeps this quick; the scratch balance runs cover all
// three. Every path should leave a careful player standing, with numbers
// that still make sense.
describe("following one path", () => {
  const paths = [
    ...LAW_PATHS.map((p) => ["law", p.key] as const),
    ...RESEARCH_PATHS.map((p) => ["research", p.key] as const),
  ];
  it.each(paths)("%s path %s leaves the country standing", (tree, pathKey) => {
    const [nation, party] = NATIONS[pathKey.length % NATIONS.length];
    const end = playCarefully(nation, party, { days: THREE_YEARS, follow: { tree, pathKey } });
    expect(end.isGameOver).toBe(false);
    for (const [stat, value] of Object.entries(end.stats)) expect(Number.isFinite(value), stat).toBe(true);
  });
});

describe("a law coming into force", () => {
  it("says what it changed, in the numbers the player watches", () => {
    const start = startNewGame("veldoria", "veldoria-ironworkers-guild");
    const after = completeLaw(start, "labor-company-towns");
    expect(after.events[0].message).toMatch(/^Company Towns comes into force: \+[\d,]+ room for people/);
  });
});

// The difficulty levels, measured: 9 five-year games each (3 seeds, every
// nation), by a sloppy player (late, never ahead of trouble) and a careful
// one. Each level should mean what its name says. Up to 18 games a test,
// so they get longer than the default to finish.
describe("difficulty", { timeout: 30000 }, () => {
  const wins = (difficulty: Difficulty, skill: "sloppy" | "careful") => {
    let won = 0;
    for (const seed of [20261015, 7, 99]) {
      for (const [nation, party] of NATIONS) {
        seedRandom(seed);
        if (playCarefully(nation, party, { days: 5 * 365, difficulty, skill }).outcome === "victory") won++;
      }
    }
    return won;
  };

  it("Easy lets even a sloppy player win most games", () => {
    expect(wins("easy", "sloppy")).toBeGreaterThanOrEqual(7);
  });

  it("Normal isn't a walkover for a sloppy player", () => {
    expect(wins("normal", "sloppy")).toBeLessThanOrEqual(6);
  });

  it("Hard: a careful player wins most games, but not all", () => {
    const careful = wins("hard", "careful");
    expect(careful).toBeGreaterThanOrEqual(6);
    expect(careful).toBeLessThan(9);
    expect(wins("hard", "sloppy")).toBeLessThanOrEqual(3);
  });

  it("Ruthless: not every country can be saved, but some can", () => {
    const careful = wins("ruthless", "careful");
    expect(careful).toBeGreaterThanOrEqual(2);
    expect(careful).toBeLessThanOrEqual(6);
  });
});
