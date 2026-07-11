// How strongly a party's ideology aligns with a policy's actual direction of
// effect — used to derive a simulated "stance" (supports/opposes/neutral) on
// any specific Law or Research node, rather than treating the rival as just
// 100 - your popularity. Four axes cover every numeric effect a Law/Research
// node can have (see LawEffects/ResearchEffects).
interface Alignment {
  industry: number;
  stability: number;
  popularity: number;
  treasury: number;
}

const IDEOLOGY_ALIGNMENT: Record<string, Alignment> = {
  Agrarian: { industry: -1, stability: 1, popularity: 1, treasury: 0 },
  Commercial: { industry: 1, stability: 0, popularity: -1, treasury: 1 },
  Traditionalist: { industry: 0, stability: 1, popularity: -1, treasury: 0 },
  Progressive: { industry: 0, stability: -1, popularity: 1, treasury: 0 },
  Labor: { industry: -1, stability: 1, popularity: 1, treasury: 0 },
  Nationalist: { industry: 1, stability: 1, popularity: -1, treasury: 0 },
};

export type PartyStance = "supports" | "opposes" | "neutral";

// A shape both LawEffects and ResearchEffects satisfy — the stance engine
// only needs the numeric deltas/multipliers, not which tree they came from.
export interface StanceEffects {
  industryMultiplier?: number;
  incomeMultiplier?: number;
  treasuryDelta?: number;
  stabilityDelta?: number;
  popularityDelta?: number;
}

// A signed dot product between a party's ideology and a policy's direction:
// positive means the policy pushes the stats this ideology already cares
// about the "right" way (by that party's lights), negative the "wrong" way.
// Ties (e.g. a policy the ideology has no opinion on) fall to neutral.
export function getPartyStance(ideology: string, effects: StanceEffects): PartyStance {
  const alignment = IDEOLOGY_ALIGNMENT[ideology];
  if (!alignment) return "neutral";

  let score = 0;
  if (effects.industryMultiplier !== undefined) score += alignment.industry * Math.sign(effects.industryMultiplier - 1);
  if (effects.incomeMultiplier !== undefined) score += alignment.treasury * Math.sign(effects.incomeMultiplier - 1);
  if (effects.treasuryDelta) score += alignment.treasury * Math.sign(effects.treasuryDelta);
  if (effects.stabilityDelta) score += alignment.stability * Math.sign(effects.stabilityDelta);
  if (effects.popularityDelta) score += alignment.popularity * Math.sign(effects.popularityDelta);

  if (score > 0) return "supports";
  if (score < 0) return "opposes";
  return "neutral";
}

// Generic campaign-trail flavor lines, used when the rival has nothing
// enacted yet worth reacting to (see application/rivalCampaignMove.ts) — one
// set per ideology so a campaign move always sounds like *this* rival.
export const CAMPAIGN_FLAVOR: Record<string, string[]> = {
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
