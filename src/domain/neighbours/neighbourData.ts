// Each nation's temper when the computer runs it, matching its blurb (see
// nations/nationData.ts): Astravia the farmland republic, Caldenreich the
// steady kingdom that keeps money back, Veldoria the early industry.
import type { Personality } from "./types";

export const PERSONALITIES: Record<string, Personality> = {
  astravia: { temper: "Grows its farms, and wants land", grows: "farm", reserve: 800, islandAppetite: 0.35, industryBonus: 1, order: 60 },
  caldenreich: { temper: "Careful with money, slow to venture", grows: "factory", reserve: 2500, islandAppetite: 0.15, industryBonus: 1, order: 70 },
  veldoria: { temper: "Builds industry, hungry for ore", grows: "factory", reserve: 600, islandAppetite: 0.25, industryBonus: 1.15, order: 60 },
};

export function getPersonality(nationId: string): Personality {
  return PERSONALITIES[nationId] ?? PERSONALITIES.astravia;
}
