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
import { CHAPTERS, isFeatureOpen, type Feature } from "../src/domain/chapters/chapterData";
import { LAW_NODES } from "../src/domain/laws/lawData";
import { getNation } from "../src/domain/nations/nationRules";
import { RESEARCH_NODES } from "../src/domain/research/researchData";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
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
    expect([...end.chapters.opened].sort()).toEqual(CHAPTERS.map((c) => c.id).sort());
    expect(end.events.some((e) => e.topic === "chapter" && e.message.startsWith("A new chapter"))).toBe(true);
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
});
