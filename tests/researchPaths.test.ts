// Research paths reopen: taking a path closes its area's other two only
// until it's finished; a year after its capstone, the area may take up one
// it passed over. A fork inside a path stays a fork, and laws stay closed
// for good.
import { describe, expect, it } from "vitest";
import { announceReopenedPaths, completeResearch } from "../src/application/actions/researchActions";
import { startNewGame } from "../src/application/startNewGame";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import { RESEARCH_PATH_REOPEN_DAYS } from "../src/domain/constants";
import { addDays } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import { RESEARCH_NODES } from "../src/domain/research/researchData";
import { getResearchNodeStatus } from "../src/domain/research/researchRules";
import { LAW_NODES } from "../src/domain/laws/lawData";
import { getLawNodeStatus } from "../src/domain/laws/lawsRules";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { pathRoute } from "./support/carefulPlayer";

const firstStep = (path: string) => RESEARCH_NODES.find((n) => n.path === path && n.tier === 2)!;
const status = (state: GameState, path: string) => getResearchNodeStatus(state, firstStep(path));
const later = (state: GameState, days: number): GameState => ({ ...state, date: addDays(state.date, days) });

function finishPath(state: GameState, path: string): GameState {
  let s = state;
  for (const id of pathRoute("research", path)) if (!s.enactedResearchIds.includes(id)) s = completeResearch(s, id);
  return s;
}

describe("a finished research path", () => {
  const start: GameState = { ...startNewGame("astravia", "astravia-harvest-union"), chapters: allChaptersOpen() };
  const craftDone = finishPath(start, "industry-craft");

  it("keeps the area's other paths closed for a year", () => {
    expect(craftDone.researchPathsFinished["industry-craft"]).toEqual(craftDone.date);
    expect(status(craftDone, "industry-precision")).toBe("foreclosed");
    expect(status(later(craftDone, RESEARCH_PATH_REOPEN_DAYS - 1), "industry-precision")).toBe("foreclosed");
  });

  it("then lets the area take up either path it passed over", () => {
    const reopened = later(craftDone, RESEARCH_PATH_REOPEN_DAYS);
    expect(status(reopened, "industry-precision")).toBe("available");
    expect(status(reopened, "industry-heavy")).toBe("available");
  });

  it("says so on the day, and not the day before", () => {
    const eve = announceReopenedPaths(later(craftDone, RESEARCH_PATH_REOPEN_DAYS - 1));
    expect(eve.events.length).toBe(craftDone.events.length);
    const day = announceReopenedPaths(later(craftDone, RESEARCH_PATH_REOPEN_DAYS));
    expect(day.events[0].message).toBe("Industry research can take up a new path: Precision or Heavy Industry.");
  });

  it("leaves the fork it passed over closed", () => {
    const route = pathRoute("research", "industry-craft");
    const passedOver = RESEARCH_NODES.find((n) => n.path === "industry-craft" && n.tier === 4 && !route.includes(n.id))!;
    expect(getResearchNodeStatus(later(craftDone, RESEARCH_PATH_REOPEN_DAYS), passedOver)).toBe("foreclosed");
  });

  it("closes the third path again while the second is under way, and opens it a year after", () => {
    const reopened = later(craftDone, RESEARCH_PATH_REOPEN_DAYS);
    const onPrecision = completeResearch(reopened, firstStep("industry-precision").id);
    expect(status(onPrecision, "industry-heavy")).toBe("foreclosed");
    const precisionDone = finishPath(onPrecision, "industry-precision");
    expect(status(precisionDone, "industry-heavy")).toBe("foreclosed");
    expect(status(later(precisionDone, RESEARCH_PATH_REOPEN_DAYS), "industry-heavy")).toBe("available");
  });

  it("is counted from loading in a save made before paths reopened", () => {
    const { researchPathsFinished: _finished, ...old } = craftDone;
    const loaded = hydrateGameState(JSON.parse(JSON.stringify(old)));
    expect(Object.keys(loaded.researchPathsFinished)).toEqual(["industry-craft"]);
  });
});

describe("a law path", () => {
  it("still closes the branch's other paths for good, years after it is finished", () => {
    const route = pathRoute("law", LAW_NODES.find((n) => n.path)!.path!);
    const taken = LAW_NODES.find((n) => n.id === route[1])!;
    const other = LAW_NODES.find((n) => n.category === taken.category && n.tier === 2 && n.path !== taken.path && !n.ideology)!;
    const start = startNewGame("astravia", "astravia-harvest-union");
    const passed: GameState = { ...start, enactedLawIds: route, date: addDays(start.date, 5 * RESEARCH_PATH_REOPEN_DAYS) };
    expect(getLawNodeStatus(passed, other)).toBe("foreclosed");
  });
});
