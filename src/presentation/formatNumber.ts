// A compact "215k"/"3.4M" formatter for stats that can run into the
// thousands (food stockpiles especially — a farm-heavy nation can sit on
// hundreds of thousands of food, and "214,748" is a lot harder to read at a
// glance than "215k"). Values under 1,000 print exactly, unrounded to a
// compact unit, since there's nothing to compact yet.
export function formatCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}${trimTrailingZero((abs / 1_000_000).toFixed(1))}M`;
  if (abs >= 1_000) return `${sign}${trimTrailingZero((abs / 1_000).toFixed(1))}k`;
  return Math.round(value).toLocaleString();
}

function trimTrailingZero(value: string): string {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

// A signed change with a real minus sign: "+320", "−1.2k". `fine` keeps a
// tenth under 10 — for points of support or stability, where 0.4 matters.
export function formatSignedChange(value: number, fine = false): string {
  const rounded = (fine && Math.abs(value) < 10 ? Math.round(value * 10) / 10 : Math.round(value)) || 0;
  const abs = Math.abs(rounded);
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${fine && abs < 10 ? String(abs) : formatCompact(abs)}`;
}
