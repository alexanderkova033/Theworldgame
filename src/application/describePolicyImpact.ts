// Use case: what a law or technology actually did to the country, in the
// numbers the player watches, measured the day it takes effect: the daily
// figures before and after, side by side. "+38 Cr a day, -0.04 stability a
// day" says more than "factories produce 10% more" ever can.
//
// Some effects don't show in today's numbers (a winter harvest bonus in
// summer, cheaper repairs before anything breaks); for those it falls back
// to the effect itself, in words.
import { CURRENCY_SYMBOL } from "../domain/constants";
import type { GameState } from "../domain/country/types";
import { describeEffects, type PolicyEffects } from "../domain/policy/modifiers";
import { getModifiers } from "../domain/policy/policyRules";
import { getDailyProductionSummary } from "./getDailyProductionSummary";
import { getPopularityOutlook } from "./getPopularityOutlook";

interface Measure {
  read: (state: GameState) => number;
  unit: string;
  digits: number; // decimals worth showing
  minimum: number; // smaller changes than this are noise
}

const MEASURES: Measure[] = [
  { read: (s) => getDailyProductionSummary(s).totalIncome, unit: `${CURRENCY_SYMBOL} a day`, digits: 0, minimum: 1 },
  { read: (s) => getDailyProductionSummary(s).netFood, unit: "food a day", digits: 0, minimum: 5 },
  { read: (s) => getDailyProductionSummary(s).housingCapacity, unit: "room for people", digits: 0, minimum: 10 },
  { read: (s) => getPopularityOutlook(s).target, unit: "support", digits: 0, minimum: 0.5 },
  { read: (s) => getModifiers(s).stabilityPerDay, unit: "stability a day", digits: 2, minimum: 0.005 },
  { read: (s) => getDailyProductionSummary(s).politicalPowerPerDay, unit: "political power a day", digits: 2, minimum: 0.01 },
  { read: (s) => getDailyProductionSummary(s).researchPerDay, unit: "research a day", digits: 2, minimum: 0.01 },
];

function signed(value: number, digits: number): string {
  const text = Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${value > 0 ? "+" : "−"}${text}`;
}

// "+38 Cr a day, −0.04 stability a day", or the effect in words when
// nothing shows in today's numbers yet.
export function describePolicyImpact(before: GameState, after: GameState, effects: PolicyEffects): string {
  const changes = MEASURES.map((m) => ({ m, delta: m.read(after) - m.read(before) }))
    .filter(({ m, delta }) => Math.abs(delta) >= m.minimum)
    .slice(0, 3)
    .map(({ m, delta }) => `${signed(delta, m.digits)} ${m.unit}`);
  if (changes.length > 0) return changes.join(", ");
  const { gains, costs } = describeEffects(effects, CURRENCY_SYMBOL);
  return [...gains, ...costs]
    .slice(0, 2)
    .map((line) => line.text.charAt(0).toLowerCase() + line.text.slice(1))
    .join(", ");
}
