// Use case: summarize a month's worth of daily deltas into one report —
// the totals, and the month's causes behind each number (see domain/ledger).
import { generateId } from "../domain/country/id";
import type { DailyDelta, GameDate, MonthlyReport } from "../domain/country/types";
import { emptyLedger, mergeLedgers } from "../domain/ledger/ledgerRules";

export function generateMonthlyReport(date: GameDate, history: DailyDelta[]): MonthlyReport {
  const totalIncome = history.reduce((sum, d) => sum + d.income, 0);
  const populationChange = history.reduce((sum, d) => sum + d.populationChange, 0);
  const stabilityChange = history.reduce((sum, d) => sum + d.stabilityChange, 0);
  const ledger = history.reduce((sum, d) => (d.ledger ? mergeLedgers(sum, d.ledger) : sum), emptyLedger());

  return {
    id: generateId("report"),
    date,
    totalIncome,
    populationChange,
    stabilityChange,
    ledger,
  };
}
