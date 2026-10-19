// Why the numbers moved. Every change to the treasury, the food stock,
// support and stability is booked against a cause, day by day (see
// simulateDay.ts and application/actions/recordAction.ts), and summed into
// each MonthlyReport — so the Reports tab can say "the treasury fell because
// of wages and building", not just "the treasury fell".
export type TreasuryCause = "taxes" | "industry" | "salaries" | "construction" | "trade" | "loans" | "oneOffs" | "events" | "colonies";

export type FoodCause = "farms" | "processing" | "eating" | "trade" | "oneOffs" | "events";

// The first six are the popularity drivers (see getPopularityDrivers);
// "settling" is opinion easing back toward neutral when nothing pushes it.
export type SupportCause =
  | "taxes"
  | "food"
  | "homes"
  | "heat"
  | "jobs"
  | "order"
  | "settling"
  | "debt"
  | "rival"
  | "foreign"
  | "oneOffs";

export type StabilityCause = "food" | "support" | "debt" | "homes" | "cold" | "provinces" | "police" | "crackdown" | "election" | "oneOffs" | "events";

export interface Ledger {
  treasury: Partial<Record<TreasuryCause, number>>;
  food: Partial<Record<FoodCause, number>>;
  support: Partial<Record<SupportCause, number>>;
  stability: Partial<Record<StabilityCause, number>>;
}

export type LedgerMetric = keyof Ledger;

// One cause per metric, for booking a whole stat change against a single
// reason (a market trade is all "trade", a decision all "oneOffs").
export interface LedgerCauses {
  treasury?: TreasuryCause;
  food?: FoodCause;
  support?: SupportCause;
  stability?: StabilityCause;
}
