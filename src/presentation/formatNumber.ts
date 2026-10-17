// One way to write a number, everywhere a player reads one. tests/numbers
// fails if the interface formats a number any other way.
//
// - An amount (Crowns, food, people, goods): exact, with separators, below
//   10,000 ("2,000", "9,850"); compact from 10,000 ("12k", "400k", "1.2M").
// - A change: the same, signed, with a real minus ("+32", "−3,169",
//   "+1.2k"). Points of support or stability keep a tenth under 10
//   ("+0.4"), since a fraction of a point matters there.
// - A rate: a change per day ("+32/d", "−3,169/d"). Small rates keep a
//   tenth ("+0.6/d"); points per day keep a hundredth under 1 ("+0.05/d").
// - A tooltip may give the precise figure instead (formatExact), for the
//   player who asks.

const COMPACT_FROM = 10_000;

function trimTrailingZero(value: string): string {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

// An unsigned amount: exact below 10,000, compact from there.
export function formatAmount(value: number): string {
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}${trimTrailingZero((abs / 1_000_000).toFixed(1))}M`;
  if (abs >= COMPACT_FROM) return `${sign}${trimTrailingZero((abs / 1_000).toFixed(1))}k`;
  return `${Math.round(abs) === 0 ? "" : sign}${Math.round(abs).toLocaleString()}`;
}

// The precise figure, for a tooltip.
export function formatExact(value: number): string {
  return Math.round(value).toLocaleString();
}

// How finely a small number is kept: whole, a tenth under 10, or (points
// per day) a hundredth under 1.
function rounded(value: number, fine: boolean, hundredths = false): number {
  const abs = Math.abs(value);
  const step = hundredths && abs < 1 ? 100 : fine && abs < 10 ? 10 : 1;
  return Math.round(value * step) / step || 0; // `|| 0`: no "−0"
}

// A signed change. `fine` keeps a tenth under 10, for points.
export function formatSigned(value: number, fine = false): string {
  const r = rounded(value, fine);
  const abs = Math.abs(r);
  const body = abs < 10 && abs % 1 !== 0 ? String(abs) : formatAmount(abs);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${body}`;
}

// A change per day. Rates keep a tenth under 10; points per day (support,
// stability) keep a hundredth under 1.
export function formatRate(value: number, points = false): string {
  const r = rounded(value, true, points);
  const abs = Math.abs(r);
  const body = abs < 10 && abs % 1 !== 0 ? String(abs) : formatAmount(abs);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${body}/d`;
}

// A reign's length: "12 years, 3 months", "1 year", "5 months".
export function formatReign(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [years > 0 && `${years} ${years === 1 ? "year" : "years"}`, (rest > 0 || years === 0) && `${rest} ${rest === 1 ? "month" : "months"}`].filter(Boolean);
  return parts.join(", ");
}
