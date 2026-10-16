// After a loss the end screen says how it happened, from the ledgers alone:
// the path has to end where the game ended and the causes have to be real.
import { beforeEach, describe, expect, it } from "vitest";
import { startNewGame } from "../src/application/startNewGame";
import { DEFEAT_STORY_MONTHS, explainDefeat } from "../src/domain/ledger/defeatRules";
import { getElectionThreshold } from "../src/domain/parties/electionRules";
import { getDefeatTip } from "../src/presentation/causes";
import { NATIONS, playCarefully } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261016));

describe("how it happened", () => {
  it("is only told for a loss", () => {
    const game = startNewGame("astravia", "astravia-harvest-union");
    expect(explainDefeat(game)).toBeNull();
    expect(explainDefeat({ ...game, isGameOver: true, outcome: "victory" })).toBeNull();
  });

  it("follows the failing number to where the game ended, and names what pulled it down", () => {
    const lost = NATIONS.map(([nation, party]) => playCarefully(nation, party, { days: 6 * 360, difficulty: "ruthless", skill: "sloppy" })).filter(
      (end) => end.isGameOver && end.outcome !== "victory",
    );
    expect(lost.length).toBeGreaterThan(0);
    for (const end of lost) {
      const story = explainDefeat(end)!;
      expect(story.metric).toBe(end.outcome === "voted-out" ? "support" : "stability");
      expect(story.trail.length).toBeLessThanOrEqual(DEFEAT_STORY_MONTHS + 1);
      expect(story.trail.at(-1)).toBeCloseTo(Math.max(0, story.metric === "support" ? end.stats.popularity : end.stats.stability), 5);
      expect(story.trail.at(-1)!).toBeLessThanOrEqual(story.line);
      expect(story.line).toBe(story.metric === "support" ? getElectionThreshold(end) : 0);
      expect(story.losses.length).toBeGreaterThan(0);
      expect(story.losses.every((c) => c.value < 0)).toBe(true);
      expect(getDefeatTip(story.metric, story.losses[0].cause)).not.toMatch(/—/);
    }
  });
});
