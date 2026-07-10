import { ELECTION_INTERVAL_MONTHS, MONTHS_PER_YEAR } from "../constants";
import type { GameDate } from "../country/types";

// How many in-game months until the next general election fires — see
// simulateDay.ts's step 13, which uses the same "every N months since game
// start" cadence as random world events (isEveryNMonths).
export function monthsUntilNextElection(date: GameDate): number {
  const totalMonths = (date.year - 1) * MONTHS_PER_YEAR + date.month;
  const remainder = (totalMonths - 1) % ELECTION_INTERVAL_MONTHS;
  return remainder === 0 ? ELECTION_INTERVAL_MONTHS : ELECTION_INTERVAL_MONTHS - remainder;
}
