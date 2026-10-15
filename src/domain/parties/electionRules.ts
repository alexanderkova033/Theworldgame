import { ELECTION_INTERVAL_MONTHS, ELECTION_WIN_THRESHOLDS, MONTHS_PER_YEAR } from "../constants";
import type { GameDate } from "../country/types";

// How many in-game months until the next general election fires — see
// simulateDay.ts's step 13, which uses the same "every N months since game
// start" cadence as random world events (isEveryNMonths).
export function monthsUntilNextElection(date: GameDate): number {
  const totalMonths = (date.year - 1) * MONTHS_PER_YEAR + date.month;
  const remainder = (totalMonths - 1) % ELECTION_INTERVAL_MONTHS;
  return remainder === 0 ? ELECTION_INTERVAL_MONTHS : ELECTION_INTERVAL_MONTHS - remainder;
}

// Support needed to win the next election, given how many you've won so far.
export function getElectionThreshold(electionsWon: number): number {
  return ELECTION_WIN_THRESHOLDS[Math.min(electionsWon, ELECTION_WIN_THRESHOLDS.length - 1)];
}
