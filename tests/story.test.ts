// A nation's story, told through chapters of its own (ROADMAP step 6, F):
// told only in that nation, one chapter after another, opening no system,
// each perhaps with a letter whose choice is remembered for the ending.
// No campaign is written yet, so these tests tell a small one of their own
// and take it away afterwards.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { advanceChapters, readBriefing, sendStoryLetter, STORY_RULES, storyEnding } from "../src/application/chapters";
import { resolveDecision } from "../src/application/actions/resolveDecision";
import { simulateDay } from "../src/application/simulateDay";
import { startNewGame } from "../src/application/startNewGame";
import { allChaptersOpen, chaptersFor, isFeatureOpen, STORY_CHAPTERS, type ChapterData } from "../src/domain/chapters/chapterData";
import type { GameState } from "../src/domain/country/types";
import { DECISIONS } from "../src/domain/decisions/decisionData";
import { pickDecision } from "../src/domain/decisions/decisionRules";
import type { DecisionDefinition } from "../src/domain/decisions/types";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { objectiveDestination, STORY_DESTINATIONS } from "../src/presentation/navigation";
import { seedRandom } from "./support/seededRandom";

const PROLOGUE = "astravia:test-prologue";
const SEQUEL = "astravia:test-sequel";
const LETTER = "test-story-letter";

const prologue: ChapterData = {
  id: PROLOGUE,
  title: "A Promise Falls Due",
  opens: [],
  briefing: "The founders promised land to the families who farm it.",
  objectives: ["Answer the farmers"],
  until: "",
  by: 30,
  nation: "astravia",
  letter: LETTER,
  partyLines: { "astravia-harvest-union": "Your own party was founded on it." },
  ending: { [`${LETTER}:keep`]: "The promise was kept." },
};
const sequel: ChapterData = { id: SEQUEL, title: "What Came of It", opens: [], briefing: "The farms changed hands.", objectives: ["Wait"], until: "", by: 2, nation: "astravia", after: PROLOGUE };
const letter: DecisionDefinition = {
  id: LETTER,
  title: "The Farmers' Petition",
  prompt: "The farmers ask for the land they were promised.",
  icon: "popularity",
  story: true,
  options: [
    { id: "keep", label: "Keep the promise", effects: { popularityDelta: 1 } },
    { id: "wait", label: "Let it wait", effects: {} },
  ],
};

beforeAll(() => {
  STORY_CHAPTERS.push(prologue, sequel);
  STORY_RULES[PROLOGUE] = { opens: (_s, month) => month >= 3, checks: [(s) => s.chapters.deeds.some((d) => d.startsWith(`${LETTER}:`))] };
  STORY_RULES[SEQUEL] = { opens: () => true, checks: [() => false] };
  STORY_DESTINATIONS[PROLOGUE] = [{ panel: "politics" }];
  DECISIONS.push(letter);
});
afterAll(() => {
  STORY_CHAPTERS.splice(STORY_CHAPTERS.indexOf(prologue), 2);
  delete STORY_RULES[PROLOGUE];
  delete STORY_RULES[SEQUEL];
  delete STORY_DESTINATIONS[PROLOGUE];
  DECISIONS.splice(DECISIONS.indexOf(letter), 1);
});

const inMonth = (s: GameState, month: number): GameState => ({ ...s, date: { year: Math.floor((month - 1) / 12) + 1, month: ((month - 1) % 12) + 1, day: 1 } });
const astravia = () => startNewGame("astravia", "astravia-harvest-union");

describe("a nation's story", () => {
  it("is told only in that nation", () => {
    expect(chaptersFor("astravia").map((c) => c.id)).toContain(PROLOGUE);
    expect(chaptersFor("veldoria").map((c) => c.id)).not.toContain(PROLOGUE);
    const veldoria = advanceChapters(inMonth(startNewGame("veldoria", "veldoria-ironworkers-guild"), 40));
    expect(veldoria.chapters.opened).not.toContain(PROLOGUE);
  });

  it("opens when its moment comes, and opens no system", () => {
    expect(advanceChapters(inMonth(astravia(), 2)).chapters.opened).not.toContain(PROLOGUE);
    const opened = advanceChapters(inMonth(astravia(), 3));
    expect(opened.chapters.opened).toContain(PROLOGUE);
    expect(opened.chapters.unread).toContain(PROLOGUE);
    expect(opened.isPaused).toBe(true);
    for (const feature of ["laws", "research", "army"] as const) expect(isFeatureOpen(opened, feature)).toBe(isFeatureOpen(inMonth(astravia(), 3), feature));
  });

  it("tells its chapters in order: the next waits until the one before is told, whatever its date", () => {
    const opened = advanceChapters(inMonth(astravia(), 3));
    expect(opened.chapters.opened).not.toContain(SEQUEL);
    // Read, but its letter not yet answered: still waiting.
    const read = advanceChapters({ ...opened, chapters: { ...opened.chapters, unread: [] } });
    expect(read.chapters.opened).not.toContain(SEQUEL);
    // Answered: told, and the next one opens, objectives met or not.
    const told = advanceChapters({ ...read, chapters: { ...read.chapters, deeds: [`${LETTER}:wait`] } });
    expect(told.chapters.done).toContain(PROLOGUE);
    expect(advanceChapters(told).chapters.opened).toContain(SEQUEL);
  });

  it("sends its letter once the briefing is read, or as soon as no other letter is open", () => {
    const opened = advanceChapters(inMonth(astravia(), 3));
    expect(readBriefing(opened, PROLOGUE).pendingDecisionId).toBe(LETTER);
    const busy = readBriefing({ ...opened, pendingDecisionId: "press-interview" }, PROLOGUE);
    expect(busy.pendingDecisionId).toBe("press-interview");
    expect(busy.chapters.letters).toEqual([LETTER]);
    expect(sendStoryLetter(busy)).toBe(busy);
    const clear = sendStoryLetter({ ...busy, pendingDecisionId: null });
    expect(clear.pendingDecisionId).toBe(LETTER);
    expect(clear.chapters.letters).toEqual([]);
    // The day sends it too (on the 2nd, when no letter is drawn at random).
    expect(simulateDay({ ...busy, date: { ...busy.date, day: 2 }, pendingDecisionId: null, isPaused: false }).pendingDecisionId).toBe(LETTER);
  });

  it("never has its letter drawn at random", () => {
    seedRandom(7);
    const s = { ...astravia(), chapters: allChaptersOpen() };
    for (let i = 0; i < 300; i++) expect(pickDecision(s).id).not.toBe(LETTER);
  });

  it("remembers the choice made on its letter, and ends with it", () => {
    const sent = readBriefing(advanceChapters(inMonth(astravia(), 3)), PROLOGUE);
    const kept = resolveDecision(sent, LETTER, "keep");
    expect(kept.chapters.deeds).toContain(`${LETTER}:keep`);
    expect(kept.pendingDecisionId).toBeNull();
    expect(storyEnding(kept)).toEqual(["The promise was kept."]);
    expect(storyEnding(resolveDecision(sent, LETTER, "wait"))).toEqual([]);
  });

  it("sends its objectives to their own windows", () => {
    expect(objectiveDestination(PROLOGUE, 0)).toEqual({ panel: "politics" });
    expect(objectiveDestination(SEQUEL, 0)).toBeNull();
    expect(objectiveDestination("first-winter", 0)).toEqual({ panel: "build", section: "buildings" });
  });

  it("is not told in saves from before it, and saves keep a letter waiting", () => {
    expect(allChaptersOpen().done).toContain(PROLOGUE);
    const old = JSON.parse(JSON.stringify(astravia()));
    delete old.chapters.letters;
    expect(hydrateGameState(old).chapters.letters).toEqual([]);
    const waiting = { ...astravia(), chapters: { ...astravia().chapters, letters: [LETTER] } };
    expect(hydrateGameState(JSON.parse(JSON.stringify(waiting))).chapters.letters).toEqual([LETTER]);
  });
});
