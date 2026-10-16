// How a lost game was lost: the number that failed, its last few months,
// and what pulled it down, read back out of the ledgers the game already
// keeps (see types.ts). Nothing new is recorded for it: the ledgers add up
// to each real change, so the path can be walked backwards from the end.
import type { GameState } from "../country/types";
import { getElectionThreshold } from "../parties/electionRules";
import { emptyLedger, getLedgerTotal, getRankedCauses, mergeLedgers, type RankedCause } from "./ledgerRules";
import type { Ledger } from "./types";

// How far back the story reaches, in months (the one under way counts).
export const DEFEAT_STORY_MONTHS = 4;

export interface DefeatStory {
  metric: "support" | "stability"; // support loses elections, stability collapses governments
  trail: number[]; // the number at the start of each month, oldest first, then where it ended
  line: number; // what it had to stay above
  losses: RankedCause[]; // the biggest pulls downward over those months, worst first
}

export function explainDefeat(state: GameState): DefeatStory | null {
  if (state.outcome !== "voted-out" && state.outcome !== "collapsed") return null;
  const metric = state.outcome === "voted-out" ? "support" : "stability";

  // The month under way, then each finished month, newest first.
  const months: Ledger[] = [
    state.history.reduce((all, day) => (day.ledger ? mergeLedgers(all, day.ledger) : all), emptyLedger()),
    ...state.monthlyReports.slice(0, DEFEAT_STORY_MONTHS - 1).map((report) => report.ledger ?? emptyLedger()),
  ];

  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  let value = metric === "support" ? state.stats.popularity : state.stats.stability;
  const trail = [clamp(value)];
  for (const month of months) {
    value -= getLedgerTotal(month, metric);
    trail.unshift(clamp(value));
  }

  const all = months.reduce(mergeLedgers, emptyLedger());
  return {
    metric,
    trail,
    line: metric === "support" ? getElectionThreshold(state) : 0,
    losses: getRankedCauses(all, metric)
      .filter((c) => c.value < 0)
      .slice(0, 3),
  };
}
