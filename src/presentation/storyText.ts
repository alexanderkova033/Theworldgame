// A story letter's answer in plain words (see StoryOutcome in
// domain/decisions/types.ts), for the letter itself: what it will do,
// before it is chosen.
import type { CrisisKind } from "../domain/crises/types";
import type { StoryOutcome } from "../domain/decisions/types";
import { describeModifier, type ModifierKey } from "../domain/policy/modifiers";
import type { Ideology } from "../domain/parties/types";
import { getProvinceName } from "../domain/provinces/provinceRules";
import { formatSigned } from "./formatNumber";
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

// Groups' moves: "Every group +2" when all move alike, and "Traditionalists
// +10 · every other group +2" when all but one do.
function describeGroups(groups: Partial<Record<Ideology, number>>): string[] {
  const all = Object.keys(GROUP_NAMES) as Ideology[];
  const moves = Object.entries(groups) as Array<[Ideology, number]>;
  const line = (g: Ideology, n: number) => `${GROUP_NAMES[g]} ${formatSigned(n, true)}`;
  if (moves.length === all.length) {
    const values = moves.map(([, n]) => n);
    const common = values.find((v) => values.filter((x) => x === v).length >= all.length - 1);
    if (common !== undefined) {
      const odd = moves.filter(([, n]) => n !== common);
      return odd.length === 0 ? [`Every group ${formatSigned(common, true)}`] : [...odd.map(([g, n]) => line(g, n)), `every other group ${formatSigned(common, true)}`];
    }
  }
  return moves.map(([g, n]) => line(g, n));
}

export function describeOutcome(outcome: StoryOutcome | undefined): string[] {
  if (!outcome) return [];
  const parts: string[] = [];
  parts.push(...describeGroups(outcome.groups ?? {}));
  if (outcome.politicalPower) parts.push(`${formatSigned(outcome.politicalPower, true)} political power`);
  for (const b of outcome.build ?? []) parts.push(`${count(b.count, b.type)} raised in ${getProvinceName(b.provinceId)}`);
  for (const b of outcome.pullDown ?? []) parts.push(`${count(b.count, b.type)} pulled down in ${getProvinceName(b.provinceId)}`);
  for (const o of outcome.order ?? []) parts.push(`${getProvinceName(o.provinceId)}: local order ${formatSigned(o.change, true)}`);
  if (outcome.lasting) {
    const { effects, days } = outcome.lasting;
    const words = (Object.entries(effects) as Array<[ModifierKey, number]>).map(([key, value]) => describeModifier(key, value));
    parts.push(`${words.join(", ")} for ${span(days)}`);
  }
  if (outcome.taxRelief) parts.push(`${getProvinceName(outcome.taxRelief.provinceId)} pays no taxes for ${span(outcome.taxRelief.days)}`);
  if (outcome.rises) parts.push(`${getProvinceName(outcome.rises)} rises against you`);
  if (outcome.crisis) parts.push(`${getProvinceName(outcome.crisis.provinceId)}: ${CRISIS_WORDS[outcome.crisis.kind]}`);
  return parts;
}
