// Systems arrive as they matter: locked until a chapter opens them, and
// really unreachable until then, whatever the interface shows.
import { beforeEach, describe, expect, it } from "vitest";
import { buildEducation } from "../src/application/actions/buildEducation";
import { enactLaw } from "../src/application/actions/enactLaw";
import { takeLoan } from "../src/application/actions/loanActions";
import { buyGood, canBuyGood } from "../src/application/actions/marketActions";
import { canCourtGroup, canCrackDown } from "../src/application/actions/politicalActions";
import { canPressureGovernment } from "../src/application/actions/pressureGovernment";
import { canFocusResearch } from "../src/application/actions/researchActions";
import { canSendExpedition } from "../src/application/actions/sendExpedition";
import { canHirePolice, canHireScientist } from "../src/application/actions/workforceActions";
import { advanceChapters, monthNumber } from "../src/application/chapters";
import { getAdvisorOutlook } from "../src/application/getAdvisorOutlook";
import { getDailyProductionSummary } from "../src/application/getDailyProductionSummary";
import { getForecasts } from "../src/application/getForecasts";
import { getHeatingOutlook } from "../src/application/getHeatingOutlook";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import { DECISIONS } from "../src/domain/decisions/decisionData";
import { pickDecision } from "../src/domain/decisions/decisionRules";
import { startNewGame } from "../src/application/startNewGame";
import { isAtJobCeiling } from "../src/application/getJobCeiling";
import { CHAPTERS, getChapter, isFeatureOpen, isStoryChapter, type Feature } from "../src/domain/chapters/chapterData";
import { CAPTAIN_FROM_MONTH, JOBS_PER_BUILDING } from "../src/domain/constants";
import { getOwnedProvinceIds } from "../src/domain/provinces/provinceRules";
import { LAW_NODES } from "../src/domain/laws/lawData";
import { getNation } from "../src/domain/nations/nationRules";
import { RESEARCH_NODES } from "../src/domain/research/researchData";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { OBJECTIVE_DESTINATIONS, reachable } from "../src/presentation/navigation";
import { NATIONS, playCarefully } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261015));

const rich = (s: ReturnType<typeof startNewGame>) => ({ ...s, stats: { ...s.stats, treasury: 50000, politicalPower: 500 } });

describe("chapters", () => {
  const start = rich(takeLoan(startNewGame("astravia", "astravia-harvest-union")));
  const province = getNation(start.nationId).provinceIds[0];
  const rootLaw = LAW_NODES.find((n) => n.tier === 1)!;
  const rootResearch = RESEARCH_NODES.find((n) => n.tier === 1)!;

  it("start with only the first winter open", () => {
    expect(start.chapters.opened).toEqual(["first-winter"]);
    const features: Feature[] = ["market", "laws", "research", "unrest", "voters", "neighbours", "ventures"];
    for (const feature of features) expect(isFeatureOpen(start, feature), feature).toBe(false);
  });

  it("keep every locked system out of reach, money or not", () => {
    expect(canBuyGood(start, "wood")).toBe(false);
    expect(buyGood(start, "wood")).toBe(start);
    expect(enactLaw(start, rootLaw.id)).toBe(start);
    expect(canFocusResearch(start, rootResearch.id)).toBe(false);
    expect(canHireScientist(start)).toBe(false);
    expect(buildEducation.canBuild(start, province)).toBe(false);
    expect(canHirePolice(start)).toBe(false);
    expect(canCrackDown(start)).toBe(false);
    expect(canCourtGroup(start)).toBe(false);
    expect(canPressureGovernment(start, Object.keys(start.foreignPolitics)[0])).toBe(false);
    expect(canSendExpedition(start, "island-1")).toBe(false);
  });

  it("each open by their date at the latest, with a briefing", () => {
    const [nation, party] = NATIONS[0];
    const latest = Math.max(...CHAPTERS.map((c) => c.by ?? 0));
    const end = playCarefully(nation, party, { days: latest * 30 + 1 });
    expect(monthNumber(end.date)).toBeGreaterThan(latest);
    // The systems' chapters, all of them (the nation's story opens alongside: tests/astraviaStory.test.ts).
    expect(end.chapters.opened.filter((id) => !isStoryChapter(id)).sort()).toEqual(CHAPTERS.map((c) => c.id).sort());
    expect(end.events.some((e) => e.topic === "chapter" && e.message.startsWith("A new chapter"))).toBe(true);
  });

  describe("the captain's offer", () => {
    const opened = (s: typeof start, month: number, day = 1) => advanceChapters({ ...s, date: { year: 1, month, day } }).chapters.opened.includes("captain");
    // Every province full of every building that employs anyone, and far more
    // people than those jobs: the ceiling. A building type shut to this
    // country has no slot to count, so filling it too does no harm.
    const atCeiling = (s: typeof start): typeof start => {
      const types = Object.keys(JOBS_PER_BUILDING) as Array<keyof typeof JOBS_PER_BUILDING>;
      const placedBuildings = getOwnedProvinceIds(s).flatMap((provinceId) => types.flatMap((type) => Array.from({ length: 4 }, (_, i) => ({ ...s.placedBuildings[0], id: `${provinceId}-${type}-${i}`, type, provinceId, condition: undefined }))));
      return { ...s, placedBuildings, provinces: Object.fromEntries(Object.entries(s.provinces).map(([id, p]) => [id, { ...p, population: 1000000 }])) };
    };

    it("comes in December of the first year at the latest", () => {
      expect(getChapter("captain").by).toBe(12);
      expect(opened(start, 11, 30)).toBe(false);
      expect(opened(start, 12)).toBe(true);
    });

    it("comes from June once people stand idle with no building left to employ them", () => {
      const full = atCeiling(start);
      expect(isAtJobCeiling(full)).toBe(true);
      expect(opened(full, CAPTAIN_FROM_MONTH - 1, 30)).toBe(false);
      expect(opened(full, CAPTAIN_FROM_MONTH, 15)).toBe(true); // any day of the month
    });

    it("isn't brought by a ceiling with one slot left, or with nobody idle", () => {
      const full = atCeiling(start);
      const oneFree = { ...full, placedBuildings: full.placedBuildings.filter((b) => !(b.type === "factory" && b.provinceId === province)) };
      expect(isAtJobCeiling(oneFree)).toBe(false);
      expect(opened(oneFree, 11)).toBe(false);
      const empty = { ...full, provinces: Object.fromEntries(Object.entries(full.provinces).map(([id, p]) => [id, { ...p, population: 0 }])) };
      expect(isAtJobCeiling(empty)).toBe(false);
      expect(opened(empty, 11)).toBe(false);
    });

    it("isn't held back by a building the country can't build yet, or brought on by want of money", () => {
      // Only what research or a chapter would still open is free: no slot today.
      const locked = ["granary", "cannery", "modelFarm", "steelworks", "education"];
      const full = atCeiling(start);
      expect(isAtJobCeiling({ ...full, placedBuildings: full.placedBuildings.filter((b) => !locked.includes(b.type)) })).toBe(true);
      // A slot it has no money for is still a slot.
      const broke = { ...full, placedBuildings: full.placedBuildings.filter((b) => b.type !== "factory"), stats: { ...full.stats, treasury: 0 } };
      expect(isAtJobCeiling(broke)).toBe(false);
    });

    // Later rules keep their own dates: the race (RACE_FROM_MONTH, tests/islands.test.ts)
    // and the island chapters of the stories, whatever the captain does.
    it("leaves the neighbours at home and the stories' island chapters to their months", () => {
      const [nation, party] = NATIONS[0];
      const end = playCarefully(nation, party, { days: 13 * 30 });
      expect(end.chapters.opened).toContain("captain");
      expect(end.foreignVoyages).toEqual([]);
      for (const id of ["astravia:coast", "astravia:island"] as const) expect(end.chapters.opened, id).not.toContain(id);
    });
  });

  it("stop the clock when one opens, and complete when its objectives are met", () => {
    const due = { ...start, date: { year: 1, month: 2, day: 1 }, isPaused: false };
    const opened = advanceChapters(due);
    expect(opened.chapters.opened).toContain("exchange");
    expect(opened.chapters.unread).toContain("exchange");
    expect(opened.isPaused).toBe(true);
    const traded = buyGood(opened, "wood");
    expect(advanceChapters(traded).chapters.done).toContain("exchange");
  });

  it("hold back letters about systems not yet open", () => {
    const troubled = { ...start, stats: { ...start.stats, stability: 5 } };
    const picked = new Set(Array.from({ length: 400 }, () => pickDecision(troubled).id));
    const waiting = DECISIONS.filter((d) => d.needs).map((d) => d.id);
    expect(waiting.length).toBeGreaterThan(0);
    for (const id of waiting) expect(picked.has(id), id).toBe(false);
    const open = { ...troubled, chapters: allChaptersOpen() };
    const later = new Set(Array.from({ length: 400 }, () => pickDecision(open).id));
    expect(waiting.some((id) => later.has(id))).toBe(true);
  });

  it("never advise what the player can't do yet", () => {
    // Hungry, cold, rioting: every alert that could name the market or a crackdown.
    const dire = { ...start, unrestStage: "riots" as const, stats: { ...start.stats, food: 0, stability: 10 }, resources: { ...start.resources, coal: 0, wood: 1 } };
    const advice = (s: typeof dire) => {
      const production = getDailyProductionSummary(s);
      return getAdvisorOutlook(s, production, getHeatingOutlook(s), getForecasts(s, production)).alerts.map((a) => a.detail ?? "").join(" ");
    };
    expect(advice(dire)).not.toMatch(/buy|crack/i);
    expect(advice({ ...dire, chapters: allChaptersOpen() })).toMatch(/buy/i);
  });

  it("leave saves from before chapters with everything open", () => {
    const { chapters: _chapters, ...old } = start;
    const loaded = hydrateGameState(JSON.parse(JSON.stringify(old)));
    expect(isFeatureOpen(loaded, "market")).toBe(true);
    expect(loaded.chapters.unread).toEqual([]);
  });

  // Each objective in the slip opens where it is done, and that place is
  // open as soon as the chapter is: a link never lands somewhere else.
  it("point every objective at a window its chapter has opened", () => {
    for (const chapter of CHAPTERS) {
      const destinations = OBJECTIVE_DESTINATIONS[chapter.id];
      expect(destinations, chapter.id).toHaveLength(chapter.objectives.length);
      const opened = { ...start, chapters: { ...start.chapters, opened: [...new Set(["first-winter" as const, chapter.id])] } };
      for (const to of destinations) if (to) expect(reachable(opened, to), chapter.id).toEqual(to);
    }
  });
});
