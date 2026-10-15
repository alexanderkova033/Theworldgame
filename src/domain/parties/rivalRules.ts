import type { ModifierKey, PolicyEffects } from "../policy/modifiers";
import { isHelpful, isMultiplier, MULTIPLIER_KEYS, ADDITIVE_KEYS } from "../policy/modifiers";
import type { Ideology } from "./types";

// How a party's ideology judges a policy, from what the policy actually
// does. Every effect a law or technology can have touches one or two of the
// things people care about; each ideology weighs those differently. The sum
// is a party's stance (supports / opposes) on a node, and also how far each
// group's approval moves when it takes force (see factionRules.ts).
type Concern = "industry" | "money" | "food" | "order" | "goodwill" | "knowledge" | "welfare" | "power";

// What each effect touches, when it's helpful as written (see isHelpful).
// A harmful effect counts against the same concerns.
const TOUCHES: Record<ModifierKey | keyof Required<PolicyEffects>, Concern[]> = {
  incomeMultiplier: ["money"],
  industryMultiplier: ["industry"],
  housingCapacityMultiplier: ["welfare"],
  heatingMultiplier: ["welfare"],
  farmJobsMultiplier: ["food"],
  factoryJobsMultiplier: ["industry"],
  farmYieldMultiplier: ["food"],
  winterFarmMultiplier: ["food"],
  foodConsumptionMultiplier: ["food"],
  breakdownMultiplier: ["industry"],
  repairCostMultiplier: ["money"],
  buildCostMultiplier: ["money"],
  buyPriceMultiplier: ["money"],
  wageMultiplier: ["money"],
  researchMultiplier: ["knowledge"],
  politicalPowerMultiplier: ["power"],
  pressureMultiplier: ["power"],
  hardshipMultiplier: ["goodwill"],
  taxTolerance: ["money"],
  supportTarget: ["goodwill"],
  stabilityPerDay: ["order"],
  treasuryDelta: ["money"],
  foodDelta: ["food"],
  stabilityDelta: ["order"],
  populationDelta: ["welfare"],
  popularityDelta: ["goodwill"],
};

// A few effects cut both ways: fewer hands on the farm or the factory floor
// is efficiency to an owner and lost jobs to a worker; packing more people
// into each home is a roof to one and a slum to another; lower wages save
// money and cost workers; rations save food and cost goodwill.
const SIDE_EFFECTS: Partial<Record<ModifierKey, Concern>> = {
  farmJobsMultiplier: "welfare",
  factoryJobsMultiplier: "welfare",
  wageMultiplier: "welfare",
  foodConsumptionMultiplier: "goodwill",
};

const WEIGHTS: Record<Ideology, Partial<Record<Concern, number>>> = {
  Agrarian: { food: 2, goodwill: 1, order: 1, industry: -1 },
  Commercial: { money: 2, industry: 1, welfare: -1 },
  Traditionalist: { order: 2, power: 1, knowledge: -1, goodwill: -1 },
  Progressive: { knowledge: 2, welfare: 1, goodwill: 1, order: -1 },
  Labor: { welfare: 2, goodwill: 1, money: -1 },
  Nationalist: { power: 2, industry: 1, order: 1, goodwill: -1 },
};

export type PartyStance = "supports" | "opposes" | "neutral";

// Kept for older callers: any node's effects.
export type StanceEffects = PolicyEffects;

// A signed score: positive when the policy moves what this ideology cares
// about the right way, negative the wrong way. Each concern counts once
// (two farm effects don't make a farmer twice as happy), so scores stay in
// a small range.
export function getAlignmentScore(ideology: Ideology, effects: PolicyEffects): number {
  const weights = WEIGHTS[ideology];
  if (!weights) return 0;
  const felt = new Map<Concern, number>();
  const feel = (concern: Concern, direction: number) => felt.set(concern, Math.max(-1, Math.min(1, (felt.get(concern) ?? 0) + direction)));

  for (const key of [...MULTIPLIER_KEYS, ...ADDITIVE_KEYS]) {
    const value = effects[key];
    if (value === undefined || value === (isMultiplier(key) ? 1 : 0)) continue;
    const direction = isHelpful(key, value) ? 1 : -1;
    for (const concern of TOUCHES[key]) feel(concern, direction);
    const side = SIDE_EFFECTS[key];
    if (side) feel(side, -direction);
  }
  for (const key of ["treasuryDelta", "foodDelta", "stabilityDelta", "populationDelta", "popularityDelta"] as const) {
    const value = effects[key];
    if (value) for (const concern of TOUCHES[key]) feel(concern, Math.sign(value));
  }
  let score = 0;
  for (const [concern, direction] of felt) score += (weights[concern] ?? 0) * direction;
  return score;
}

// Ties (e.g. a policy the ideology has no opinion on) fall to neutral.
export function getPartyStance(ideology: Ideology, effects: PolicyEffects): PartyStance {
  const score = getAlignmentScore(ideology, effects);
  if (score > 0) return "supports";
  if (score < 0) return "opposes";
  return "neutral";
}

// What each ideology stands for, in a few words, for the party screens.
export const IDEOLOGY_CARES: Record<Ideology, { for: string; against: string }> = {
  Agrarian: { for: "food and the farms, goodwill, order", against: "industry first" },
  Commercial: { for: "money, industry", against: "costly welfare" },
  Traditionalist: { for: "order, power", against: "new ideas, pandering" },
  Progressive: { for: "knowledge, welfare, goodwill", against: "heavy-handed order" },
  Labor: { for: "welfare, goodwill", against: "squeezing workers for money" },
  Nationalist: { for: "power abroad, industry, order", against: "pandering" },
};

// Generic campaign-trail flavor lines, used when the rival has nothing
// enacted yet worth reacting to (see application/rivalCampaignMove.ts) — one
// set per ideology so a campaign move always sounds like *this* rival.
export const CAMPAIGN_FLAVOR: Record<Ideology, string[]> = {
  Agrarian: [
    "tours the grain markets, promising to put smallholders first.",
    "warns that the cities have forgotten who feeds them.",
  ],
  Commercial: [
    "courts the trading houses with talk of a steadier ledger.",
    "argues the treasury is being run by amateurs.",
  ],
  Traditionalist: [
    "calls for a return to slower, steadier governance.",
    "warns that reform for its own sake is reckless.",
  ],
  Progressive: [
    "holds a rally for the young and the impatient.",
    "accuses the government of dragging its feet on reform.",
  ],
  Labor: [
    "walks the factory floors, shaking hands with the foundrymen.",
    "accuses the government of siding with owners over workers.",
  ],
  Nationalist: [
    "stages a rally beneath old regimental colors.",
    "questions whether the government still has the nation's spine.",
  ],
};
