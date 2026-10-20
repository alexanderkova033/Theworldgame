// Use case: the chapters of a game (see domain/chapters). Once a day, after
// the simulation: any chapter whose moment has come opens, with its
// briefing, and the game pauses so the player reads it; any chapter whose
// objectives are all met is marked done. Chance triggers (a petition, a
// captain's offer) are rolled once a month, and every chapter opens by its
// date at the latest.
//
// A nation's story chapters (STORY_CHAPTERS) open by their own rules
// (STORY_RULES, filled campaign by campaign), each only once the chapter
// it follows is done. Reading a story chapter's briefing sends its letter.
import {
  chaptersFor,
  choiceDeed,
  getChapter,
  isStoryChapter,
  type ChapterId,
  type StoryChapterId,
  type SystemChapterId,
} from "../domain/chapters/chapterData";
import { isFirstDayOfMonth } from "../domain/country/calendar";
import { generateId } from "../domain/country/id";
import type { GameDate, GameState } from "../domain/country/types";
import { getElectionThreshold } from "../domain/parties/electionRules";
import { RELATIONS_HOSTILE } from "../domain/constants";

// Months since the game began: 1 in the first month, 2 in the second...
export function monthNumber(date: GameDate): number {
  return (date.year - 1) * 12 + date.month;
}

const LAW_FIRST_COST = 20; // political power for a first-row law

const builtByYou = (s: GameState, type: string) =>
  s.placedBuildings.some((b) => b.type === type && !b.id.startsWith("starting-")) || s.projects.some((p) => p.type === type);

type Trigger = (s: GameState, month: number, monthStart: boolean) => boolean;
type Check = (s: GameState) => boolean;

// A story chapter's rules: what sets it off besides its date, and its
// objectives' checks, in the order of its words.
export interface StoryRules {
  opens: Trigger;
  checks: Check[];
}
export const STORY_RULES: Record<StoryChapterId, StoryRules> = {};

// What sets each chapter off, besides its date.
const TRIGGERS: Record<SystemChapterId, Trigger> = {
  "first-winter": () => true,
  exchange: () => false, // the exchange opens on its date
  assembly: (s, month) => month >= 4 && s.stats.politicalPower >= LAW_FIRST_COST,
  society: (_s, month, monthStart) => monthStart && month >= 5 && Math.random() < 0.25,
  streets: (s) => s.unrestStage !== "calm" || Object.values(s.provinces).some((p) => p.unrestStage !== "calm"),
  voters: (s, month) => month >= 10 && s.stats.popularity < getElectionThreshold(s) + 5,
  envoys: (s, month) => month >= 6 && s.lastDayLedger.support.foreign !== undefined,
  captain: (_s, month, monthStart) => monthStart && month >= 13 && Math.random() < 0.3,
  // Trouble the army would answer: a province risen, a neighbour's
  // settlers at sea, or a neighbour turned hostile.
  army: (s, month) =>
    month >= 18 &&
    (Object.values(s.provinces).some((p) => p.uprising) || s.foreignVoyages.length > 0 || Object.values(s.neighbours).some((n) => n.relations <= RELATIONS_HOSTILE)),
};

// Each chapter's objectives, in the order of its words (chapterData.ts).
export const OBJECTIVE_CHECKS: Record<SystemChapterId, Check[]> = {
  "first-winter": [(s) => builtByYou(s, "farm"), (s) => builtByYou(s, "housing"), (s) => monthNumber(s.date) >= 3],
  exchange: [(s) => s.chapters.deeds.includes("traded")],
  assembly: [(s) => s.enactedLawIds.length > 0 || s.activeLaw !== null],
  society: [(s) => s.enactedResearchIds.length > 0 || Object.values(s.researchFocus).some(Boolean), (s) => builtByYou(s, "education")],
  streets: [(s) => s.workforce.police > 0],
  voters: [(s) => s.chapters.deeds.includes("courted")],
  envoys: [(s) => s.chapters.deeds.includes("pressed")],
  captain: [(s) => s.expeditions.length > 0 || s.scoutedIslandIds.length > 0],
  army: [(s) => s.regiments.some((r) => r.nationId === s.nationId)],
};

function checksFor(id: ChapterId): Check[] {
  return isStoryChapter(id) ? (STORY_RULES[id]?.checks ?? []) : OBJECTIVE_CHECKS[id];
}

export function objectivesMet(state: GameState, id: ChapterId): boolean[] {
  return checksFor(id).map((check) => check(state));
}

// Whether a chapter's moment has come today, besides its date.
function isDue(state: GameState, id: ChapterId, month: number, monthStart: boolean): boolean {
  if (!isStoryChapter(id)) return TRIGGERS[id](state, month, monthStart);
  return STORY_RULES[id]?.opens(state, month, monthStart) ?? false;
}

export function advanceChapters(state: GameState): GameState {
  if (state.isGameOver) return state;
  const month = monthNumber(state.date);
  const monthStart = isFirstDayOfMonth(state.date);
  let chapters = state.chapters;
  const events = [...state.events];
  let opened = false;

  for (const chapter of chaptersFor(state.nationId)) {
    if (chapters.opened.includes(chapter.id)) continue;
    // A story's next chapter waits for the one before it.
    if (chapter.after && !chapters.done.includes(chapter.after)) continue;
    const due = chapter.by !== undefined && month >= chapter.by;
    if (!due && !isDue(state, chapter.id, month, monthStart)) continue;
    chapters = { ...chapters, opened: [...chapters.opened, chapter.id], unread: [...chapters.unread, chapter.id] };
    events.unshift({ id: generateId("event"), date: state.date, message: `A new chapter: ${chapter.title}.`, severity: "info", topic: "chapter" });
    opened = true;
  }

  const withOpened = { ...state, chapters };
  for (const id of chapters.opened) {
    if (chapters.done.includes(id) || !objectivesMet(withOpened, id).every(Boolean)) continue;
    chapters = { ...chapters, done: [...chapters.done, id] };
    events.unshift({ id: generateId("event"), date: state.date, message: `Chapter complete: ${getChapter(id).title}.`, severity: "info", topic: "chapter" });
  }

  if (chapters === state.chapters) return state;
  // A new chapter stops the clock until its briefing is read.
  return { ...state, chapters, events, isPaused: opened ? true : state.isPaused };
}

// The player has read a briefing. A story chapter's letter comes next: at
// once if no other letter waits, else as soon as the way is clear.
export function readBriefing(state: GameState, id: ChapterId): GameState {
  const chapters = { ...state.chapters, unread: state.chapters.unread.filter((c) => c !== id) };
  const letter = state.chapters.unread.includes(id) ? getChapter(id).letter : undefined;
  if (!letter) return { ...state, chapters };
  if (!state.pendingDecisionId) return { ...state, chapters, pendingDecisionId: letter, isPaused: true };
  return { ...state, chapters: { ...chapters, letters: [...chapters.letters, letter] } };
}

// The next story letter waiting, sent once no other letter is open.
export function sendStoryLetter(state: GameState): GameState {
  const [next, ...rest] = state.chapters.letters;
  if (!next || state.pendingDecisionId || state.isGameOver) return state;
  return { ...state, pendingDecisionId: next, isPaused: true, chapters: { ...state.chapters, letters: rest } };
}

// The story's last word, for the ending screen: a line for each choice made
// on a story letter that has one.
export function storyEnding(state: GameState): string[] {
  return chaptersFor(state.nationId).flatMap((chapter) =>
    Object.entries(chapter.ending ?? {})
      .filter(([deed]) => state.chapters.deeds.includes(deed))
      .map(([, line]) => line),
  );
}

export { choiceDeed };
