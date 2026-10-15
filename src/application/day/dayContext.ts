// What every step of the daily tick shares: the country as the day began,
// today's modifiers, the event log being written, and the ledger of why
// each number moved. Steps add to the log and the ledger as they go, and
// return what they changed.
import { getSeason, type Season } from "../../domain/country/calendar";
import { generateId } from "../../domain/country/id";
import type { CountryStats, GameEvent, GameState } from "../../domain/country/types";
import { emptyLedger, ledgerFromStatsChange, mergeLedgers } from "../../domain/ledger/ledgerRules";
import type { Ledger, LedgerCauses } from "../../domain/ledger/types";
import { getWorkingCounts } from "../../domain/maintenance/maintenanceRules";
import { getModifiers } from "../../domain/policy/policyRules";
import { calculateEfficiencyMultiplier } from "../../domain/roads/roadsRules";

export interface Day {
  start: GameState; // the country as the day began
  // Laws, research, the party's creed, the nation, law+research pairs: all
  // folded into one set of modifiers (see domain/policy). Read once at the
  // start of the day, so a law taking force today counts from tomorrow.
  mods: ReturnType<typeof getModifiers>;
  season: Season;
  efficiency: number; // from working roads: speeds income and building
  events: GameEvent[]; // newest first
  // Why today's numbers moved, cause by cause, for the monthly report (see
  // domain/ledger). `late` holds what happens after the calendar turns (the
  // monthly rival, neighbour, event and election rolls), which belongs to
  // the new month, not the one being reported on.
  ledger: Ledger;
  late: Ledger;
}

export function beginDay(state: GameState): Day {
  return {
    start: state,
    mods: getModifiers(state),
    season: getSeason(state.date),
    efficiency: calculateEfficiencyMultiplier(getWorkingCounts(state).roads),
    events: [...state.events],
    ledger: emptyLedger(),
    late: emptyLedger(),
  };
}

export function log(day: Day, event: Omit<GameEvent, "id">): void {
  day.events.unshift({ id: generateId("event"), ...event });
}

export function book(day: Day, into: "ledger" | "late", metric: keyof Ledger, causes: Record<string, number>): void {
  day[into] = mergeLedgers(day[into], { ...emptyLedger(), [metric]: causes });
}

export function bookChange(day: Day, into: "ledger" | "late", before: CountryStats, after: CountryStats, causes: LedgerCauses): void {
  day[into] = mergeLedgers(day[into], ledgerFromStatsChange(before, after, causes));
}
