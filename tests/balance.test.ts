// Whole games played by a script, three game years long, in every nation.
// These guard the balance the game is tuned to: a careful player survives
// and wins the first election, an idle one does not last, and following
// any one path of the trees doesn't wreck a country on its own.
import { beforeEach, describe, expect, it } from "vitest";
import { completeLaw } from "../src/application/actions/enactLaw";
import { startNewGame } from "../src/application/startNewGame";
import { LAW_PATHS } from "../src/domain/laws/lawData";
import { RESEARCH_PATHS } from "../src/domain/research/researchData";
import { NATIONS, playCarefully, playIdle } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

const THREE_YEARS = 3 * 365;

beforeEach(() => seedRandom(20261015));

describe("a careful player", () => {
  it.each(NATIONS)("survives three years in %s and wins the first election", (nation, party) => {
    const end = playCarefully(nation, party, { days: THREE_YEARS });
    expect(end.isGameOver).toBe(false);
    expect(end.electionsWon).toBeGreaterThanOrEqual(1);
  });

  // Political power is meant to run short, so laws are a choice. Before the
  // rate was cut, a careful player banked 650 to 900 of it with nothing to
  // spend it on.
  it.each(NATIONS)("doesn't bank a hoard of political power in %s", (nation, party) => {
    const end = playCarefully(nation, party, { days: THREE_YEARS });
    expect(end.stats.politicalPower).toBeLessThan(650);
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
