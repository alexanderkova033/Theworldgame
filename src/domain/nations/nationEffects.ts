// Small, ongoing per-nation multipliers — composed into simulateDay.ts the
// same way law effects are. Keeps the three nations from being purely
// cosmetic (same color/provinces/blurb, identical economy underneath).
// Nation.startingBonus (nationData.ts) is the player-facing description of
// these same numbers — keep the two in sync when tuning.
export interface NationEffects {
  industryMultiplier: number;
  incomeMultiplier: number;
}

const DEFAULT_EFFECTS: NationEffects = { industryMultiplier: 1, incomeMultiplier: 1 };

const NATION_EFFECTS: Record<string, Partial<NationEffects>> = {
  veldoria: { industryMultiplier: 1.15 }, // "smaller, but sharp-edged" — early industry
};

export function getNationEffects(nationId: string): NationEffects {
  return { ...DEFAULT_EFFECTS, ...NATION_EFFECTS[nationId] };
}
