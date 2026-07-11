// The 6 ideological currents present, in different proportions, in every
// nation's electorate — see domain/parties/factionData.ts for how much of
// each nation identifies with which, and rivalRules.ts for how each one
// reacts to a policy's actual effects.
export type Ideology = "Agrarian" | "Commercial" | "Traditionalist" | "Progressive" | "Labor" | "Nationalist";

// A political party: the player's actual role for the game's core goal —
// win elections (or at least survive them) and stay the most popular
// option. Every nation has exactly two parties, so popularity (already
// tracked on CountryStats — see politicsRules.ts) can double as a simple
// zero-sum vote share: the rival's share is just 100 - yours.
export interface Party {
  id: string;
  nationId: string;
  name: string;
  ideology: Ideology;
  color: string;
  description: string;
  platform: string; // one-line mechanical/flavor hint, shown on the party-select screen
}
