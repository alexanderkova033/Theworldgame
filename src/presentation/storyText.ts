// A story letter's answer in plain words (see StoryOutcome in
// domain/decisions/types.ts), for the letter itself: what it will do,
// before it is chosen.
import { getDailyProductionSummary } from "../application/getDailyProductionSummary";
import { CURRENCY_SYMBOL } from "../domain/constants";
import type { GameState } from "../domain/country/types";
import type { CrisisKind } from "../domain/crises/types";
import type { DecisionEffects, StoryOutcome } from "../domain/decisions/types";
import { describeModifier, isHelpful, type ModifierKey } from "../domain/policy/modifiers";
import type { Ideology } from "../domain/parties/types";
import { getProvinceName } from "../domain/provinces/provinceRules";
import { formatAmount, formatSigned } from "./formatNumber";
import { BUILDING_NAMES, GROUP_NAMES } from "./names";

const CRISIS_WORDS: Record<CrisisKind, string> = {
  flood: "a flood",
  seam: "its seam worked out",
  felling: "its forest felled bare",
  fever: "fever",
  fishing: "its fishing grounds failed",
};

function span(days: number): string {
  if (days % 360 === 0) return days === 360 ? "a year" : `${days / 360} years`;
  if (days % 30 === 0) return days === 30 ? "a month" : `${days / 30} months`;
  return `${days} days`;
}

const count = (n: number, type: keyof typeof BUILDING_NAMES) => (n === 1 ? `a ${BUILDING_NAMES[type][0].toLowerCase()}` : `${n} ${BUILDING_NAMES[type][1].toLowerCase()}`);

// One thing an answer does, and whether it is to the country's good.
export interface OutcomePart {
  text: string;
  good: boolean;
}

const part = (text: string, good: boolean): OutcomePart => ({ text, good });

// Groups' moves: "Every group +2" when all move alike, and "Traditionalists
// +10 · every other group +2" when all but one do.
function describeGroups(groups: Partial<Record<Ideology, number>>): OutcomePart[] {
  const all = Object.keys(GROUP_NAMES) as Ideology[];
  const moves = Object.entries(groups) as Array<[Ideology, number]>;
  const line = (g: Ideology, n: number) => part(`${GROUP_NAMES[g]} ${formatSigned(n, true)}`, n > 0);
  if (moves.length === all.length) {
    const values = moves.map(([, n]) => n);
    const common = values.find((v) => values.filter((x) => x === v).length >= all.length - 1);
    if (common !== undefined) {
      const odd = moves.filter(([, n]) => n !== common);
      const rest = part(`${odd.length === 0 ? "Every" : "every other"} group ${formatSigned(common, true)}`, common > 0);
      return [...odd.map(([g, n]) => line(g, n)), rest];
    }
  }
  return moves.map(([g, n]) => line(g, n));
}

// What the income lost (or won) for a while comes to in Crowns, at today's
// takings, so "12% less income" reads as the price it is.
function incomeInCrowns(state: GameState, multiplier: number, days: number): string {
  const { taxIncome, industryIncome } = getDailyProductionSummary(state);
  const crowns = Math.round(((taxIncome + industryIncome) * Math.abs(multiplier - 1) * days) / 100) * 100;
  return crowns > 0 ? ` (about ${formatAmount(crowns)} ${CURRENCY_SYMBOL})` : "";
}

// The answer's one-off numbers: Crowns, food, stability, people, support.
export function describeEffects(effects: DecisionEffects): OutcomePart[] {
  const parts: OutcomePart[] = [];
  const add = (value: number | undefined, unit: string, fine = false) => {
    if (value) parts.push(part(`${formatSigned(value, fine)} ${unit}`, value > 0));
  };
  add(effects.treasuryDelta, CURRENCY_SYMBOL);
  add(effects.foodDelta, "food");
  add(effects.stabilityDelta, "stability", true);
  add(effects.populationDelta, "people");
  add(effects.popularityDelta, "support", true);
  return parts;
}

// With the country (`state`), a lasting change to income also says what it
// comes to in Crowns.
export function describeOutcomeParts(outcome: StoryOutcome | undefined, state?: GameState): OutcomePart[] {
  if (!outcome) return [];
  const parts: OutcomePart[] = [];
  parts.push(...describeGroups(outcome.groups ?? {}));
  if (outcome.politicalPower) parts.push(part(`${formatSigned(outcome.politicalPower, true)} political power`, outcome.politicalPower > 0));
  for (const b of outcome.build ?? []) parts.push(part(`${count(b.count, b.type)} raised in ${getProvinceName(b.provinceId)}`, true));
  for (const b of outcome.pullDown ?? []) parts.push(part(`${count(b.count, b.type)} pulled down in ${getProvinceName(b.provinceId)}`, false));
  for (const o of outcome.order ?? []) parts.push(part(`${getProvinceName(o.provinceId)}: local order ${formatSigned(o.change, true)}`, o.change > 0));
  if (outcome.lasting) {
    const { effects, days } = outcome.lasting;
    for (const [key, value] of Object.entries(effects) as Array<[ModifierKey, number]>) {
      const crowns = key === "incomeMultiplier" && state ? incomeInCrowns(state, value, days) : "";
      parts.push(part(`${describeModifier(key, value)} for ${span(days)}${crowns}`, isHelpful(key, value)));
    }
  }
  if (outcome.taxRelief) parts.push(part(`${getProvinceName(outcome.taxRelief.provinceId)} pays no taxes for ${span(outcome.taxRelief.days)}`, false));
  if (outcome.rises) parts.push(part(`${getProvinceName(outcome.rises)} rises against you`, false));
  if (outcome.crisis) parts.push(part(`${getProvinceName(outcome.crisis.provinceId)}: ${CRISIS_WORDS[outcome.crisis.kind]}`, false));
  return parts;
}

export function describeOutcome(outcome: StoryOutcome | undefined): string[] {
  return describeOutcomeParts(outcome).map((p) => p.text);
}
