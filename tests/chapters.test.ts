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
import { simulateDay } from "../src/application/simulateDay";
import { CHAPTERS, getChapter, isFeatureOpen, isStoryChapter, type Feature } from "../src/domain/chapters/chapterData";
import { CAPTAIN_FROM_MONTH, CAPTAIN_SHORTAGE_DAYS, CAPTAIN_WORKER_SHORTAGE, JOBS_PER_BUILDING, LABOUR_SHARE } from "../src/domain/constants";
import { getLabourSituation, isShortOfWorkers } from "../src/domain/labour/labourRules";
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
    // A country with exactly this many jobs, and people to give it `workers`.
    const staffedBy = (s: typeof start, jobs: number, workers: number): typeof start => {
      const ids = getOwnedProvinceIds(s);
      const placedBuildings = Array.from({ length: jobs / JOBS_PER_BUILDING.farm }, (_, i) => ({ ...s.placedBuildings[0], id: `farm-${i}`, type: "farm" as const, provinceId: ids[0], condition: undefined }));
      const population = workers / LABOUR_SHARE / ids.length;
      return { ...s, placedBuildings, stats: { ...s.stats, population: workers / LABOUR_SHARE }, provinces: Object.fromEntries(Object.entries(s.provinces).map(([id, p]) => [id, { ...p, population }])) };
    };
    // The next day's count of days short of workers, simulated.
    const nextDay = (s: typeof start) => simulateDay({ ...s, isPaused: false }).daysShortOfWorkers;

    it("comes in December of the first year at the latest", () => {
      expect(getChapter("captain").by).toBe(12);
      expect(opened(start, 11, 30)).toBe(false);
      expect(opened(start, 12)).toBe(true);
    });

    it("comes from June once the country has been short of workers long enough", () => {
      const short = { ...start, daysShortOfWorkers: CAPTAIN_SHORTAGE_DAYS };
      expect(opened(short, CAPTAIN_FROM_MONTH - 1, 30)).toBe(false);
      expect(opened(short, CAPTAIN_FROM_MONTH, 15)).toBe(true); // any day of the month
    });

    it("doesn't come for a shortage that hasn't lasted", () => {
      expect(opened({ ...start, daysShortOfWorkers: CAPTAIN_SHORTAGE_DAYS - 1 }, 11)).toBe(false);
    });

    it("counts a real shortage, day by day, and starts again when it ends", () => {
      const short = staffedBy(start, 3000, 1000);
      expect(isShortOfWorkers(getLabourSituation(short))).toBe(true);
      expect(nextDay(short)).toBe(1);
      expect(nextDay({ ...short, daysShortOfWorkers: 5 })).toBe(6);
      const eased = staffedBy(start, 3000, 3000);
      expect(nextDay({ ...eased, daysShortOfWorkers: CAPTAIN_SHORTAGE_DAYS - 1 })).toBe(0);
    });

    it("starts counting from nothing in a save from before the count", () => {
      const { daysShortOfWorkers: _count, ...old } = start;
      expect(hydrateGameState(JSON.parse(JSON.stringify(old))).daysShortOfWorkers).toBe(0);
    });

    it("needs a meaningful shortage, not jobs just beyond the workers", () => {
      const workers = 2000;
      const line = workers * (1 + CAPTAIN_WORKER_SHORTAGE);
      expect(isShortOfWorkers({ jobs: line, workers })).toBe(true);
      expect(isShortOfWorkers({ jobs: line - 1, workers })).toBe(false);
      // What a country that only feeds itself reaches, measured: 39% at the most.
      expect(isShortOfWorkers({ jobs: workers * 1.39, workers })).toBe(false);
      expect(isShortOfWorkers({ jobs: workers, workers })).toBe(false);
      expect(isShortOfWorkers({ jobs: 0, workers: 0 })).toBe(false);
    });

    it("isn't brought by a broken factory, whose jobs nobody can fill", () => {
      // Just under the line, with one factory broken: mended, it would pass it.
      const under = staffedBy(start, 2700, 2000);
      const broken = { ...under, placedBuildings: [...under.placedBuildings, { ...under.placedBuildings[0], id: "broken", type: "factory" as const, condition: "broken" as const }] };
      expect(isShortOfWorkers(getLabourSituation(broken))).toBe(false);
      expect(isShortOfWorkers(getLabourSituation({ ...broken, placedBuildings: broken.placedBuildings.map((b) => ({ ...b, condition: undefined })) }))).toBe(true);
    });

    it("doesn't count people idle in one province while jobs stand open in another", () => {
      // Every job in one province and all the people in another: some stay
      // home, so jobs go unfilled, yet the country has the people.
      const [here, there] = getOwnedProvinceIds(start);
      const apart = staffedBy(start, 3000, 3000);
      const provinces = Object.fromEntries(Object.entries(apart.provinces).map(([id, p]) => [id, { ...p, population: id === there ? 3000 / LABOUR_SHARE : 0 }]));
      const labour = getLabourSituation({ ...apart, provinces });
      expect(labour.provinces[here].openJobs).toBeGreaterThan(0);
      expect(isShortOfWorkers(labour)).toBe(false);
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
