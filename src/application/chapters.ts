// Use case: the chapters of a game (see domain/chapters). Once a day, after
// the simulation: any chapter whose moment has come opens, with its
// briefing, and the game pauses so the player reads it; any chapter whose
// objectives are all met is marked done. Chance triggers (a petition, a
// captain's offer) are rolled once a month, and every chapter opens by its
// date at the latest.
import { CHAPTERS, getChapter, type ChapterId } from "../domain/chapters/chapterData";
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

// What sets each chapter off, besides its date.
const TRIGGERS: Record<ChapterId, (s: GameState, month: number, monthStart: boolean) => boolean> = {
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
export const OBJECTIVE_CHECKS: Record<ChapterId, Array<(s: GameState) => boolean>> = {
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

export function objectivesMet(state: GameState, id: ChapterId): boolean[] {
  return OBJECTIVE_CHECKS[id].map((check) => check(state));
}

export function advanceChapters(state: GameState): GameState {
  if (state.isGameOver) return state;
  const month = monthNumber(state.date);
  const monthStart = isFirstDayOfMonth(state.date);
  let chapters = state.chapters;
  const events = [...state.events];
  let opened = false;

  for (const chapter of CHAPTERS) {
    if (chapters.opened.includes(chapter.id)) continue;
    const due = chapter.by !== undefined && month >= chapter.by;
    if (!due && !TRIGGERS[chapter.id](state, month, monthStart)) continue;
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

// The player has read a briefing.
export function readBriefing(state: GameState, id: ChapterId): GameState {
  return { ...state, chapters: { ...state.chapters, unread: state.chapters.unread.filter((c) => c !== id) } };
}
