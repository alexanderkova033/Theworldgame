// Use case: how many days of today's balance it takes to put by a sum the
// treasury is short of, so "not enough money" can say when there will be.
// Null when the treasury isn't rising.
import type { GameState } from "../domain/country/types";
import { getDailyProductionSummary } from "./getDailyProductionSummary";

export function getDaysToSave(state: GameState, short: number, netPerDay = getDailyProductionSummary(state).netTreasury): number | null {
  if (short <= 0) return 0;
  if (netPerDay <= 0) return null;
  return Math.ceil(short / netPerDay);
}

// The wait in words: "tomorrow", "in 7 days".
export function describeWait(days: number): string {
  return days <= 1 ? "tomorrow" : `in ${days} days`;
}
