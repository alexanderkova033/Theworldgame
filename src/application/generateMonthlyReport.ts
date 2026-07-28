// Use case: summarize a month's worth of daily deltas into one report.
import { generateId } from "../domain/country/id";
import type { DailyDelta, GameDate, MonthlyReport } from "../domain/country/types";

export function generateMonthlyReport(date: GameDate, history: DailyDelta[]): MonthlyReport {
  const totalIncome = history.reduce((sum, d) => sum + d.income, 0);
  const populationChange = history.reduce((sum, d) => sum + d.populationChange, 0);
  const stabilityChange = history.reduce((sum, d) => sum + d.stabilityChange, 0);

  return {
    id: generateId("report"),
    date,
    totalIncome,
    populationChange,
    stabilityChange,
  };
}
