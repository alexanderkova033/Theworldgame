import type { Ideology } from "./types";

// All 6 ideological currents, present in every nation's electorate in
// different proportions — not just the two that happen to have a formal
// party in a given nation. See NATION_FACTION_WEIGHTS below.
export const FACTIONS: Ideology[] = ["Agrarian", "Commercial", "Traditionalist", "Progressive", "Labor", "Nationalist"];

// Each nation's electorate broken down across all 6 factions (weights sum to
// 1 per nation). Skewed toward that nation's own two parties' ideologies —
// see partyData.ts — but every current has some presence everywhere; a
// nation's formal two-party system is just which currents got organized,
// not the only ones its people hold.
export const NATION_FACTION_WEIGHTS: Record<string, Record<Ideology, number>> = {
  // Astravia: Agrarian/Commercial two-party republic, farmland heartland.
  astravia: { Agrarian: 0.3, Commercial: 0.22, Traditionalist: 0.12, Progressive: 0.14, Labor: 0.12, Nationalist: 0.1 },
  // Caldenreich: Traditionalist/Progressive kingdom, schools and civil service.
  caldenreich: { Traditionalist: 0.3, Progressive: 0.24, Agrarian: 0.12, Commercial: 0.14, Labor: 0.1, Nationalist: 0.1 },
  // Veldoria: Labor/Nationalist industrial power, foundries and veterans.
  veldoria: { Labor: 0.28, Nationalist: 0.26, Commercial: 0.14, Agrarian: 0.1, Traditionalist: 0.1, Progressive: 0.12 },
};

// An even split, used only if a nation somehow has no authored weights —
// defensive, since every playable nation is listed above.
const EVEN_SPLIT: Record<Ideology, number> = Object.fromEntries(FACTIONS.map((f) => [f, 1 / FACTIONS.length])) as Record<Ideology, number>;

export function getFactionWeights(nationId: string): Record<Ideology, number> {
  return NATION_FACTION_WEIGHTS[nationId] ?? EVEN_SPLIT;
}
