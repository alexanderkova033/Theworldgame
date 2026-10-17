import { ELECTION_INTERVAL_MONTHS, LONG_REIGN_THRESHOLD_STEP, MONTHS_PER_YEAR } from "../constants";
import type { GameMode } from "../reign/reignData";
import { getDifficulty, type Difficulty } from "../difficulty/difficultyData";
import type { GameDate } from "../country/types";

// How many in-game months until the next general election fires — see
// simulateDay.ts's step 13, which uses the same "every N months since game
// start" cadence as random world events (isEveryNMonths).
export function monthsUntilNextElection(date: GameDate): number {
  const totalMonths = (date.year - 1) * MONTHS_PER_YEAR + date.month;
  const remainder = (totalMonths - 1) % ELECTION_INTERVAL_MONTHS;
  return remainder === 0 ? ELECTION_INTERVAL_MONTHS : ELECTION_INTERVAL_MONTHS - remainder;
}

// Support needed to win the next election: more for each one already won,
// and more on harder difficulties. A Long Reign keeps raising the line past
// the difficulty's last, a point an election (see domain/reign).
export function getElectionThreshold(state: { electionsWon: number; difficulty?: Difficulty; mode?: GameMode }): number {
  const lines = getDifficulty(state.difficulty).electionThresholds;
  const past = state.mode === "long-reign" ? Math.max(0, state.electionsWon - (lines.length - 1)) : 0;
  return lines[Math.min(state.electionsWon, lines.length - 1)] + past * LONG_REIGN_THRESHOLD_STEP;
}
