// Use case: how many days it takes to put by a sum the treasury is short of, so
// "not enough money" can say when there will be. Null when the treasury isn't
// rising. Today pays on yesterday's industry, so the first day of a game (whose
// industry counts factories nobody works yet) is taken apart from the days after.
import type { GameState } from "../domain/country/types";
import { getDailyProductionSummary, type DailyProductionSummary } from "./getDailyProductionSummary";
import { counted } from "../domain/plural";

export type SavingIncome = number | Pick<DailyProductionSummary, "netTreasury" | "netTreasuryFromTomorrow">;

export function getDaysToSave(state: GameState, short: number, income: SavingIncome = getDailyProductionSummary(state)): number | null {
  const today = typeof income === "number" ? income : income.netTreasury;
  const later = typeof income === "number" ? income : income.netTreasuryFromTomorrow;
  if (short <= 0) return 0;
  if (today >= short) return 1;
  if (later <= 0) return null;
  return 1 + Math.ceil((short - today) / later);
}

// The wait in words: "tomorrow", "in 7 days".
export function describeWait(days: number): string {
  return days <= 1 ? "tomorrow" : `in ${counted(days, "day")}`;
}
