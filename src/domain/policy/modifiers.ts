import type { Ideology } from "../parties/types";

// Everything that bends the country's rules for as long as it lasts: a
// finished technology, a law in force, the creed of the party in power, the
// nation's own character, a law and a technology that work as a pair. Each
// of those only *describes* its effect as a ModifierEffects; this is the one
// place they're folded together (see getModifiers in policyRules.ts), so a
// new kind of effect only has to be wired into the rule it changes once.

// Scale effects: 1 changes nothing. Where less is better (fewer workers,
// less coal, cheaper) the number is still the factor applied: 0.8 = 20% less.
export const MULTIPLIER_KEYS = [
  "incomeMultiplier", // taxes and industry income
  "industryMultiplier", // factory output
  "housingCapacityMultiplier", // people per home
  "heatingMultiplier", // coal (or wood) each home burns in winter
  "farmJobsMultiplier", // workers each farm needs
  "factoryJobsMultiplier", // workers each factory needs
  "farmYieldMultiplier", // food each farm grows, all year
  "winterFarmMultiplier", // food each farm grows in winter, on top
  "foodConsumptionMultiplier", // food each person eats
  "breakdownMultiplier", // chance a building breaks down
  "repairCostMultiplier", // price of a repair
  "buildCostMultiplier", // money a new building costs
  "buyPriceMultiplier", // what buying on the market costs
  "wageMultiplier", // scientists' and police wages
  "researchMultiplier", // research progress in every area
  "politicalPowerMultiplier", // political power earned each day
  "pressureMultiplier", // how hard a push on a neighbour lands
  "hardshipMultiplier", // support lost to homelessness, cold and joblessness
] as const;

// Flat effects: 0 changes nothing.
export const ADDITIVE_KEYS = [
  "taxTolerance", // percentage points of tax people accept before they grumble
  "supportTarget", // points added to where support drifts
  "stabilityPerDay", // stability gained (or lost) every day
] as const;

export type MultiplierKey = (typeof MULTIPLIER_KEYS)[number];
export type AdditiveKey = (typeof ADDITIVE_KEYS)[number];
export type ModifierKey = MultiplierKey | AdditiveKey;

export type Modifiers = Record<ModifierKey, number>;
export type ModifierEffects = Partial<Modifiers>;

// What happens once, the day a law takes force or a technology is finished.
export interface OneTimeEffects {
  treasuryDelta?: number;
  foodDelta?: number;
  stabilityDelta?: number;
  populationDelta?: number;
  popularityDelta?: number;
}

// Both trees' nodes describe themselves this way.
export type PolicyEffects = ModifierEffects & OneTimeEffects;

export function isMultiplier(key: ModifierKey): key is MultiplierKey {
  return (MULTIPLIER_KEYS as readonly string[]).includes(key);
}

export function neutralModifiers(): Modifiers {
  return Object.fromEntries([...MULTIPLIER_KEYS.map((k) => [k, 1]), ...ADDITIVE_KEYS.map((k) => [k, 0])]) as Modifiers;
}

const ONE_TIME_KEYS = ["treasuryDelta", "foodDelta", "stabilityDelta", "populationDelta", "popularityDelta"] as const;

// Several nodes' effects as if they were one: multipliers multiply, flat
// and one-time effects add up. Used to show what a whole path adds to.
export function combineEffects(list: PolicyEffects[]): PolicyEffects {
  const combined: PolicyEffects = {};
  for (const effects of list) {
    for (const key of MULTIPLIER_KEYS) {
      const value = effects[key];
      if (value !== undefined) combined[key] = (combined[key] ?? 1) * value;
    }
    for (const key of [...ADDITIVE_KEYS, ...ONE_TIME_KEYS]) {
      const value = effects[key];
      if (value !== undefined) combined[key] = (combined[key] ?? 0) + value;
    }
  }
  // Rounding noise ("1.0000001") would read as a 0% change.
  for (const key of MULTIPLIER_KEYS) {
    const value = combined[key];
    if (value !== undefined) combined[key] = Math.round(value * 1000) / 1000;
  }
  for (const key of ADDITIVE_KEYS) {
    const value = combined[key];
    if (value !== undefined) combined[key] = Math.round(value * 100) / 100;
  }
  return combined;
}

// Folds one source's effects in. `scale` stretches how far each effect
// reaches from "no change" (a research breakthrough at 1.5 makes +10% into
// +15%, not ×1.5 of the whole multiplier).
export function addModifiers(into: Modifiers, effects: ModifierEffects, scale = 1): Modifiers {
  const next = { ...into };
  for (const key of MULTIPLIER_KEYS) {
    const value = effects[key];
    if (value !== undefined) next[key] *= Math.max(0, 1 + (value - 1) * scale);
  }
  for (const key of ADDITIVE_KEYS) {
    const value = effects[key];
    if (value !== undefined) next[key] += value * scale;
  }
  return next;
}

// Is this effect good for the country as written? Less of a cost (workers,
// coal, prices, wages, breakdowns, food eaten, lost support) counts as good.
const LOWER_IS_BETTER: ReadonlySet<ModifierKey> = new Set([
  "heatingMultiplier",
  "farmJobsMultiplier",
  "factoryJobsMultiplier",
  "foodConsumptionMultiplier",
  "breakdownMultiplier",
  "repairCostMultiplier",
  "buildCostMultiplier",
  "buyPriceMultiplier",
  "wageMultiplier",
  "hardshipMultiplier",
]);

export function isHelpful(key: ModifierKey, value: number): boolean {
  const neutral = isMultiplier(key) ? 1 : 0;
  return LOWER_IS_BETTER.has(key) ? value < neutral : value > neutral;
}

// One effect in plain words: "Farms grow 15% more food". Used for party
// creeds and anywhere an effect is listed without hand-written text.
export function describeModifier(key: ModifierKey, value: number): string {
  const pct = Math.round(Math.abs(value - 1) * 100);
  const more = value > 1;
  const pts = Math.abs(value);
  const sign = value > 0 ? "+" : "−";
  switch (key) {
    case "incomeMultiplier":
      return `${pct}% ${more ? "more" : "less"} income`;
    case "industryMultiplier":
      return `Factories produce ${pct}% ${more ? "more" : "less"}`;
    case "housingCapacityMultiplier":
      return `${pct}% ${more ? "more" : "fewer"} people fit in each home`;
    case "heatingMultiplier":
      return `Homes burn ${pct}% ${more ? "more" : "less"} coal in winter`;
    case "farmJobsMultiplier":
      return `Farms need ${pct}% ${more ? "more" : "fewer"} workers`;
    case "factoryJobsMultiplier":
      return `Factories need ${pct}% ${more ? "more" : "fewer"} workers`;
    case "farmYieldMultiplier":
      return `Farms grow ${pct}% ${more ? "more" : "less"} food`;
    case "winterFarmMultiplier":
      return `Farms grow ${pct}% ${more ? "more" : "less"} in winter`;
    case "foodConsumptionMultiplier":
      return `People eat ${pct}% ${more ? "more" : "less"}`;
    case "breakdownMultiplier":
      return `${pct}% ${more ? "more" : "fewer"} breakdowns`;
    case "repairCostMultiplier":
      return `Repairs cost ${pct}% ${more ? "more" : "less"}`;
    case "buildCostMultiplier":
      return `New buildings cost ${pct}% ${more ? "more" : "less"}`;
    case "buyPriceMultiplier":
      return `Market goods cost ${pct}% ${more ? "more" : "less"}`;
    case "wageMultiplier":
      return `Staff wages ${pct}% ${more ? "higher" : "lower"}`;
    case "researchMultiplier":
      return `Research ${pct}% ${more ? "faster" : "slower"}`;
    case "politicalPowerMultiplier":
      return `${pct}% ${more ? "more" : "less"} political power`;
    case "pressureMultiplier":
      return `Pushes abroad land ${pct}% ${more ? "harder" : "softer"}`;
    case "hardshipMultiplier":
      return `Homelessness, cold and joblessness cost ${pct}% ${more ? "more" : "less"} support`;
    case "taxTolerance":
      return `People accept ${pts} ${pts === 1 ? "point" : "points"} ${value > 0 ? "more" : "less"} tax`;
    case "supportTarget":
      return `${sign}${pts} to where support settles`;
    case "stabilityPerDay":
      return `${sign}${pts} stability a day`;
  }
}

// How a node in either tree sits among the others. Every branch grows from
// one shared root (tier 1) into three separate paths that never cross: a
// node opens once one of its parents (`requires`) is done, and only one node
// per tier of a branch can ever be chosen, so taking a path's first node
// closes the other two paths for good. Inside a path, tiers 4 and 5 fork in
// two and meet again at tier 6. `excludes` adds lockouts beyond that:
// across branches, or across the two trees.
export const TREE_TIERS = [1, 2, 3, 4, 5, 6, 7] as const;
export type TreeTier = (typeof TREE_TIERS)[number];

export interface PolicyLinks {
  requires?: string[]; // one of these, in the same tree, must be done first; none = the root of its branch
  excludes?: string[]; // choosing this closes these off for good (either tree), and they close it
  ideology?: Ideology; // only a party of this ideology can choose it
  path?: string; // which of its branch's paths it lies on (a TreePath key); none = the shared root
}

// One of a branch's three paths: its own lane on the tree, under a name
// that says what the path stands for.
export interface TreePath {
  key: string;
  category: string;
  name: string;
  motto: string; // a few words, shown when the path's name is hovered
  icon: string; // a StatIconType name; domain/ doesn't import presentation/
}

export type EffectKey = keyof Required<PolicyEffects>;

export interface EffectLine {
  key: EffectKey;
  text: string;
}

// A node's (or creed's) effects as two lists of plain lines: what it does
// for the country, and what it costs it. One-time effects say "once".
export function describeEffects(effects: PolicyEffects, currency = "Cr"): { gains: EffectLine[]; costs: EffectLine[] } {
  const gains: EffectLine[] = [];
  const costs: EffectLine[] = [];
  for (const key of [...MULTIPLIER_KEYS, ...ADDITIVE_KEYS]) {
    const value = effects[key];
    if (value === undefined || value === (isMultiplier(key) ? 1 : 0)) continue;
    (isHelpful(key, value) ? gains : costs).push({ key, text: describeModifier(key, value) });
  }
  const once = (key: EffectKey, value: number | undefined, unit: string) => {
    if (!value) return;
    const text = `${value > 0 ? "+" : "−"}${Math.abs(value).toLocaleString()} ${unit} once`;
    (value > 0 ? gains : costs).push({ key, text });
  };
  once("treasuryDelta", effects.treasuryDelta, currency);
  once("foodDelta", effects.foodDelta, "food");
  once("stabilityDelta", effects.stabilityDelta, "stability");
  once("populationDelta", effects.populationDelta, "people");
  once("popularityDelta", effects.popularityDelta, "support");
  return { gains, costs };
}
