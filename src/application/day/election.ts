// Step 9 of the day: a general election, every ELECTION_INTERVAL_MONTHS.
// The actual win or loss of the game: below the line, the rival party
// takes power; at or above it, the player's party keeps governing (with a
// small mandate to stability), and enough wins in a row is outright
// victory. Skipped once the game has already ended some other way.
import { ELECTIONS_TO_WIN_GAME, ELECTION_INTERVAL_MONTHS, ELECTION_WIN_STABILITY_BONUS } from "../../domain/constants";
import { isEveryNMonths } from "../../domain/country/calendar";
import type { CountryStats, GameDate, GameOutcome, GameState } from "../../domain/country/types";
import { getElectionThreshold } from "../../domain/parties/electionRules";
import { getParty } from "../../domain/parties/partyRules";
import { book, log, type Day } from "./dayContext";

export interface Election {
  stats: CountryStats;
  electionsWon: number;
  ended?: { outcome: GameOutcome; reason: string };
}

export function holdElection(day: Day, working: GameState, date: GameDate, today: { isGameOver: boolean; supportAtDawn: number; stats: CountryStats }): Election {
  let stats = today.stats;
  let electionsWon = working.electionsWon;
  if (today.isGameOver || !isEveryNMonths(date, ELECTION_INTERVAL_MONTHS)) return { stats, electionsWon };

  const party = getParty(working.partyId);
  // The vote counts support as election day dawns: the rival's and the
  // neighbours' moves rolled this same morning (see newMonth.ts) land after
  // it, since nobody could answer them. A campaign the month before still
  // counts, and there's time to see it coming.
  const popularity = today.supportAtDawn;
  const threshold = getElectionThreshold(working.electionsWon);
  if (popularity < threshold) {
    log(day, { date, message: `${party.name} loses the general election. You are voted out of office.`, severity: "danger", topic: "elections" });
    return {
      stats,
      electionsWon,
      ended: {
        outcome: "voted-out",
        reason: `${party.name} lost the general election with ${Math.round(popularity)}% support, short of the ${threshold}% it needed. The opposition takes power.`,
      },
    };
  }

  electionsWon += 1;
  const mandate = Math.min(100, stats.stability + ELECTION_WIN_STABILITY_BONUS);
  book(day, "late", "stability", { election: mandate - stats.stability });
  stats = { ...stats, stability: mandate };
  if (electionsWon >= ELECTIONS_TO_WIN_GAME) {
    log(day, { date, message: `${party.name} wins the general election outright: ${electionsWon} elections running. Victory!`, severity: "info", topic: "elections" });
    return { stats, electionsWon, ended: { outcome: "victory", reason: `${party.name} has won the people's trust for good, a mandate no rival can challenge.` } };
  }
  log(day, {
    date,
    message: `${party.name} wins the general election with ${Math.round(popularity)}% support (${electionsWon}/${ELECTIONS_TO_WIN_GAME} for outright victory). The next one needs ${getElectionThreshold(electionsWon)}%.`,
    severity: "info",
    topic: "elections",
  });
  return { stats, electionsWon };
}
