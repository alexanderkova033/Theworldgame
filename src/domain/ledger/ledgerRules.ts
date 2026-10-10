// Booking changes against causes, and reading them back out. Pure helpers
// over the Ledger shape — the daily tick and the player actions decide
// *what* to book, this only adds, scales and ranks.
import { REPORT_GAIN_WEIGHT, REPORT_LOSS_WEIGHT, REPORT_NOTABLE_CHANGE } from "../constants";
import type { CountryStats } from "../country/types";
import type { Ledger, LedgerCauses, LedgerMetric } from "./types";

export const LEDGER_METRICS: LedgerMetric[] = ["treasury", "food", "support", "stability"];

export function emptyLedger(): Ledger {
  return { treasury: {}, food: {}, support: {}, stability: {} };
}

function addRecord<K extends string>(into: Partial<Record<K, number>>, from: Partial<Record<K, number>>): Partial<Record<K, number>> {
  const next = { ...into };
  for (const [key, value] of Object.entries(from) as Array<[K, number | undefined]>) {
    if (!value) continue;
    next[key] = (next[key] ?? 0) + value;
  }
  return next;
}

export function mergeLedgers(a: Ledger, b: Ledger): Ledger {
  return {
    treasury: addRecord(a.treasury, b.treasury),
    food: addRecord(a.food, b.food),
    support: addRecord(a.support, b.support),
    stability: addRecord(a.stability, b.stability),
  };
}

export function isLedgerEmpty(ledger: Ledger): boolean {
  return LEDGER_METRICS.every((metric) => Object.values(ledger[metric]).every((v) => !v));
}

// The whole change between two snapshots of the stats, each metric booked
// against the one cause given for it (metrics without a cause are ignored).
export function ledgerFromStatsChange(before: CountryStats, after: CountryStats, causes: LedgerCauses): Ledger {
  const ledger = emptyLedger();
  const book = (metric: LedgerMetric, cause: string | undefined, delta: number) => {
    if (cause && delta) (ledger[metric] as Record<string, number>)[cause] = delta;
  };
  book("treasury", causes.treasury, after.treasury - before.treasury);
  book("food", causes.food, after.food - before.food);
  book("support", causes.support, after.popularity - before.popularity);
  book("stability", causes.stability, after.stability - before.stability);
  return ledger;
}

// Causes are worked out before the result is clamped (stability can't pass
// 100, support can't go below 0...), so they can add up to more than what
// actually happened. Scale back whichever side overshot so the parts always
// sum to the real change.
export function fitCauses<K extends string>(causes: Partial<Record<K, number>>, actual: number): Partial<Record<K, number>> {
  const entries = Object.entries(causes) as Array<[K, number]>;
  const sum = entries.reduce((total, [, v]) => total + v, 0);
  const gap = actual - sum;
  if (Math.abs(gap) < 1e-9) return causes;
  // Overshot upward: shrink the gains. Overshot downward: shrink the losses.
  const side = entries.filter(([, v]) => (gap < 0 ? v > 0 : v < 0));
  const sideTotal = side.reduce((total, [, v]) => total + v, 0);
  if (sideTotal === 0 || Math.abs(gap) > Math.abs(sideTotal)) {
    // Nothing on that side to absorb it — keep the parts honest as a whole.
    const scale = sum !== 0 ? actual / sum : 0;
    return Object.fromEntries(entries.map(([k, v]) => [k, v * scale])) as Partial<Record<K, number>>;
  }
  const keep = 1 + gap / sideTotal;
  return Object.fromEntries(entries.map(([k, v]) => [k, side.some(([s]) => s === k) ? v * keep : v])) as Partial<Record<K, number>>;
}

export function getLedgerTotal(ledger: Ledger, metric: LedgerMetric): number {
  return Object.values(ledger[metric]).reduce<number>((total, v) => total + (v ?? 0), 0);
}

export interface RankedCause {
  cause: string;
  value: number;
}

// Biggest movers first, either direction.
export function getRankedCauses(ledger: Ledger, metric: LedgerMetric): RankedCause[] {
  return (Object.entries(ledger[metric]) as Array<[string, number]>)
    .filter(([, value]) => value !== 0)
    .map(([cause, value]) => ({ cause, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

export interface LedgerHeadline {
  metric: LedgerMetric;
  total: number;
  causes: RankedCause[]; // the one or two biggest pushes in the direction it moved
}

// The month's biggest story: whichever number moved most against what
// counts as a notable change for it (falls weigh more than rises), with
// the causes that pushed it that way.
export function getLedgerHeadline(ledger: Ledger): LedgerHeadline | null {
  let best: { metric: LedgerMetric; total: number; score: number } | null = null;
  for (const metric of LEDGER_METRICS) {
    const total = getLedgerTotal(ledger, metric);
    const score = (Math.abs(total) / REPORT_NOTABLE_CHANGE[metric]) * (total < 0 ? REPORT_LOSS_WEIGHT : REPORT_GAIN_WEIGHT);
    if (!best || score > best.score) best = { metric, total, score };
  }
  if (!best || best.score === 0) return null;
  const direction = Math.sign(best.total);
  const causes = getRankedCauses(ledger, best.metric)
    .filter((c) => Math.sign(c.value) === direction)
    .slice(0, 2);
  return { metric: best.metric, total: best.total, causes };
}
