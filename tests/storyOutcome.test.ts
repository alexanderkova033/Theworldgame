// Letters that matter (ROADMAP step 6, F3): a story letter's answer can
// move a group of voters hard, raise or pull down buildings in a named
// province, set its order, lay an effect on the country for a while, let a
// province off its taxes, raise a province against you, or start a crisis.
// See application/storyOutcome.ts.
import { describe, expect, it } from "vitest";
import { advanceChapters, readBriefing, STORY_RULES } from "../src/application/chapters";
import { resolveDecision } from "../src/application/actions/resolveDecision";
import { applyStoryOutcome } from "../src/application/storyOutcome";
import { startNewGame } from "../src/application/startNewGame";
import { STORY_CHAPTERS, type ChapterData } from "../src/domain/chapters/chapterData";
import { addDays } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import { DECISIONS } from "../src/domain/decisions/decisionData";
import { getModifiers } from "../src/domain/policy/policyRules";
import { getNation } from "../src/domain/nations/nationRules";
import { getPlace } from "../src/domain/provinces/provinceRules";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { describeOutcome } from "../src/presentation/storyText";

const start = startNewGame("astravia", "astravia-harvest-union");
const provinces = getNation("astravia").provinceIds;
const plains = provinces.find((id) => id !== getNation("astravia").capitalProvinceId && getPlace(id)?.terrain === "plains")!;
const coast = provinces.find((id) => getPlace(id)?.terrain === "coast")!;
const farms = (s: GameState, id: string) => s.placedBuildings.filter((b) => b.provinceId === id && b.type === "farm").length;

describe("a story letter's answer", () => {
  it("moves the groups it names, and support with them", () => {
    const s = applyStoryOutcome(start, { groups: { Agrarian: 15, Commercial: -15 } });
    expect(s.factionApproval.Agrarian).toBe(start.factionApproval.Agrarian + 15);
    expect(s.factionApproval.Commercial).toBe(start.factionApproval.Commercial - 15);
    // Astravia has more farmers than merchants, so support rises.
    expect(s.stats.popularity).toBeGreaterThan(start.stats.popularity);
  });

  it("raises and pulls down buildings in a named province, and the tallies follow", () => {
    const raised = applyStoryOutcome(start, { build: [{ provinceId: plains, type: "farm", count: 2 }] });
    expect(farms(raised, plains)).toBe(farms(start, plains) + 2);
    expect(raised.farmCount).toBe(start.farmCount + 2);
    const pulled = applyStoryOutcome(raised, { pullDown: [{ provinceId: plains, type: "farm", count: 1 }] });
    expect(farms(pulled, plains)).toBe(farms(raised, plains) - 1);
    expect(pulled.farmCount).toBe(raised.farmCount - 1);
  });

  it("sets a province's order, and lets it off its taxes", () => {
    const s = applyStoryOutcome(start, { order: [{ provinceId: coast, change: 15 }], taxRelief: { provinceId: coast, days: 180 } });
    expect(s.provinces[coast].stability).toBe(Math.min(100, start.provinces[coast].stability + 15));
    expect(s.provinces[coast].taxReliefUntil).toEqual(addDays(start.date, 180));
  });

  it("lays an effect on the country that lasts its time, and no longer", () => {
    const s = applyStoryOutcome(start, { lasting: { effects: { incomeMultiplier: 0.92 }, days: 360, why: "Capital taken abroad" } });
    expect(getModifiers(s).incomeMultiplier).toBeCloseTo(getModifiers(start).incomeMultiplier * 0.92);
    expect(getModifiers({ ...s, date: addDays(start.date, 360) }).incomeMultiplier).toBeCloseTo(getModifiers(start).incomeMultiplier);
  });

  it("can raise a province against you, or start a crisis there, letter and all", () => {
    const risen = applyStoryOutcome(start, { rises: plains });
    expect(risen.provinces[plains].uprising).not.toBeNull();
    expect(risen.placedBuildings.filter((b) => b.provinceId === plains && b.type === "farm").every((b) => b.condition === "seized")).toBe(true);
    const flooded = applyStoryOutcome(start, { crisis: { provinceId: coast, kind: "flood" } });
    expect(flooded.provinces[coast].crisis?.kind).toBe("flood");
    expect(flooded.pendingCrisis).toBe(coast);
  });

  it("says what it will do, in plain words", () => {
    const words = describeOutcome({
      groups: { Agrarian: 15 },
      build: [{ provinceId: plains, type: "farm", count: 2 }],
      lasting: { effects: { incomeMultiplier: 0.92 }, days: 360, why: "" },
      rises: plains,
    });
    expect(words).toEqual(["Farmers +15", `2 farms raised in ${getPlace(plains)!.name}`, "8% less income for a year", `${getPlace(plains)!.name} rises against you`]);
    for (const w of words) expect(w).not.toMatch(/—/);
  });

  it("is kept by saves; older saves have no lasting effects", () => {
    const s = applyStoryOutcome(start, { lasting: { effects: { incomeMultiplier: 0.92 }, days: 360, why: "x" } });
    expect(hydrateGameState(JSON.parse(JSON.stringify(s))).lasting).toHaveLength(1);
    const old = JSON.parse(JSON.stringify(start));
    delete old.lasting;
    expect(hydrateGameState(old).lasting).toEqual([]);
  });
});

describe("a story that branches", () => {
  const LETTER = "test-branch-letter";
  const root: ChapterData = { id: "astravia:test-root", title: "Root", opens: [], briefing: "", objectives: [], until: "", nation: "astravia", letter: LETTER, by: 1 };
  const kept: ChapterData = { id: "astravia:test-kept", title: "Kept", opens: [], briefing: "", objectives: [], until: "", nation: "astravia", after: root.id };
  const broken: ChapterData = { id: "astravia:test-broken", title: "Broken", opens: [], briefing: "", objectives: [], until: "", nation: "astravia", after: root.id };
  const joined: ChapterData = { id: "astravia:test-joined", title: "Joined", opens: [], briefing: "", objectives: [], until: "", nation: "astravia", after: [kept.id, broken.id], by: 1 };

  it("tells one beat or the other by the choice made, and joins again after", () => {
    STORY_CHAPTERS.push(root, kept, broken, joined);
    DECISIONS.push({ id: LETTER, title: "", prompt: "", icon: "popularity", story: true, options: [{ id: "keep", label: "", effects: {} }, { id: "break", label: "", effects: {} }] });
    STORY_RULES[root.id] = { opens: () => true, checks: [] };
    STORY_RULES[kept.id] = { opens: (s) => s.chapters.deeds.includes(`${LETTER}:keep`), checks: [] };
    STORY_RULES[broken.id] = { opens: (s) => s.chapters.deeds.includes(`${LETTER}:break`), checks: [] };
    STORY_RULES[joined.id] = { opens: () => true, checks: [] };
    try {
      let s = advanceChapters(start);
      expect(s.chapters.opened).toContain(root.id);
      s = readBriefing(s, root.id);
      expect(s.pendingDecisionId).toBe(LETTER);
      s = resolveDecision(s, LETTER, "break");
      s = advanceChapters(s);
      expect(s.chapters.opened).toContain(broken.id);
      expect(s.chapters.opened).not.toContain(kept.id);
      s = advanceChapters(readBriefing(s, broken.id));
      expect(s.chapters.opened).toContain(joined.id);
    } finally {
      STORY_CHAPTERS.splice(STORY_CHAPTERS.indexOf(root), 4);
      DECISIONS.splice(DECISIONS.findIndex((d) => d.id === LETTER), 1);
      for (const c of [root, kept, broken, joined]) delete STORY_RULES[c.id];
    }
  });
});
