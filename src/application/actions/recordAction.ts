// Player actions move the treasury, food, support and stability between
// ticks. Each action books what it changed (after vs. before) against its
// cause in GameState.pendingLedger; the next simulateDay folds that into
// the day's DailyDelta, and from there into the monthly report.
import type { GameState } from "../../domain/country/types";
import { isLedgerEmpty, ledgerFromStatsChange, mergeLedgers } from "../../domain/ledger/ledgerRules";
import type { LedgerCauses } from "../../domain/ledger/types";

export function recordAction(before: GameState, after: GameState, causes: LedgerCauses): GameState {
  if (after === before) return after;
  const change = ledgerFromStatsChange(before.stats, after.stats, causes);
  if (isLedgerEmpty(change)) return after;
  return { ...after, pendingLedger: mergeLedgers(after.pendingLedger, change) };
}

// A decision, law, rally or crackdown: every number it touched is a one-off.
export const ONE_OFF: LedgerCauses = { treasury: "oneOffs", food: "oneOffs", support: "oneOffs", stability: "oneOffs" };
