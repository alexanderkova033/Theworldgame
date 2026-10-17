// The Long Reign: no finish line, a burden of office for every election
// won, and a line that keeps rising, so even a careful player is
// eventually voted out, but well after Three Terms would have ended.
import { beforeEach, describe, expect, it } from "vitest";
import { takeBurden } from "../src/application/actions/burdenActions";
import { holdRally } from "../src/application/actions/politicalActions";
import { startNewGame } from "../src/application/startNewGame";
import { getModifiers } from "../src/domain/policy/policyRules";
import { getElectionThreshold } from "../src/domain/parties/electionRules";
import { BURDENS } from "../src/domain/reign/reignData";
import { burdensForWin, describeBurden, getReignMonths } from "../src/domain/reign/reignRules";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { NATIONS, playCarefully } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261017));

const start = startNewGame("astravia", "astravia-harvest-union", "normal", "long-reign");
const years = (s: { date: { year: number; month: number } }) => getReignMonths(s.date as never) / 12;

describe("the long reign", () => {
  it("raises the line past the difficulty's last, and only in a Long Reign", () => {
    const terms = { ...start, mode: "terms" as const };
    expect(getElectionThreshold({ ...start, electionsWon: 2 })).toBe(getElectionThreshold({ ...terms, electionsWon: 2 }));
    expect(getElectionThreshold({ ...start, electionsWon: 5 })).toBeGreaterThan(getElectionThreshold({ ...start, electionsWon: 4 }));
    expect(getElectionThreshold({ ...terms, electionsWon: 5 })).toBe(getElectionThreshold({ ...terms, electionsWon: 2 }));
  });

  it("offers a choice of two burdens, and later draws one more by chance", () => {
    const early = burdensForWin([], 1);
    expect(early.offer).toHaveLength(2);
    expect(new Set(early.offer).size).toBe(2);
    expect(early.forced).toHaveLength(0);
    const late = burdensForWin([], 3);
    expect(late.forced).toHaveLength(1);
    expect(late.offer).not.toContain(late.forced[0]);
  });

  it("makes a burden bite once taken, and every burden says what it does", () => {
    const offered = { ...start, burdenOffer: ["lean-years", "hollow-rallies"] as never };
    const leaner = takeBurden(offered, "lean-years");
    expect(leaner.burdenOffer).toBeNull();
    expect(getModifiers(leaner).incomeMultiplier).toBeLessThan(getModifiers(start).incomeMultiplier);
    const rich = (s: typeof start) => ({ ...s, stats: { ...s.stats, politicalPower: 100, treasury: 5000 } });
    const hollow = takeBurden(offered, "hollow-rallies");
    const lift = (s: typeof start) => holdRally(rich(s)).stats.popularity - s.stats.popularity;
    expect(lift(hollow)).toBeLessThan(lift(start));
    expect(takeBurden(offered, "weary-voters")).toBe(offered);
    for (const burden of BURDENS) {
      expect(describeBurden(burden).length, burden.id).toBeGreaterThan(0);
      expect(`${burden.name} ${burden.flavour} ${describeBurden(burden).join(" ")}`).not.toMatch(/—/);
    }
  });

  it("outlasts Three Terms for a careful player, but not forever, and Hard ends it sooner", () => {
    const play = (difficulty: "normal" | "hard") =>
      NATIONS.map(([nation, party]) => playCarefully(nation, party, { days: 20 * 360, difficulty, mode: "long-reign" }));
    const normal = play("normal");
    for (const end of normal) {
      expect(end.isGameOver, end.nationId).toBe(true);
      expect(end.outcome).not.toBe("victory");
      expect(end.electionsWon, end.nationId).toBeGreaterThan(3);
    }
    const hard = play("hard");
    const average = (ends: typeof normal) => ends.reduce((total, end) => total + years(end), 0) / ends.length;
    expect(average(hard)).toBeLessThan(average(normal));
  }, 120000);

  it("loads older saves as Three Terms with nothing carried", () => {
    const { mode: _mode, burdens: _burdens, burdenOffer: _offer, ...old } = start;
    const loaded = hydrateGameState(JSON.parse(JSON.stringify(old)));
    expect(loaded.mode).toBe("terms");
    expect(loaded.burdens).toEqual([]);
    expect(loaded.burdenOffer).toBeNull();
  });
});
