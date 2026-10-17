// The longest Long Reign on each difficulty, kept in the browser beside the
// save slots. Only a reign that has ended is put up against it.
import type { Difficulty } from "../../domain/difficulty/difficultyData";
import type { GameState } from "../../domain/country/types";
import { getReignMonths } from "../../domain/reign/reignRules";

const RECORDS_KEY = "theworldgame-records-v1";

export interface ReignRecord {
  months: number;
  electionsWon: number;
  nationId: string;
  partyId: string;
}

type Records = Partial<Record<Difficulty, ReignRecord>>;

function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    return raw ? (JSON.parse(raw) as Records) : {};
  } catch {
    return {};
  }
}

// The longest reign so far on a difficulty, if there is one.
export function getBestReign(difficulty: Difficulty): ReignRecord | null {
  return loadRecords()[difficulty] ?? null;
}

// Puts an ended reign up against the best on its difficulty: what the best
// was before, and whether this one beat it (it's saved if so).
export function submitReign(state: GameState): { previous: ReignRecord | null; isNew: boolean } {
  const records = loadRecords();
  const previous = records[state.difficulty] ?? null;
  const reign: ReignRecord = { months: getReignMonths(state.date), electionsWon: state.electionsWon, nationId: state.nationId, partyId: state.partyId };
  const isNew = !previous || reign.months > previous.months;
  if (isNew) {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify({ ...records, [state.difficulty]: reign }));
    } catch {
      // Storage full or unavailable: the record just isn't kept.
    }
  }
  return { previous, isNew };
}
