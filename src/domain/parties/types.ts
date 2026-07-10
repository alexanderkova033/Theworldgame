// A political party: the player's actual role for the game's core goal —
// win elections (or at least survive them) and stay the most popular
// option. Every nation has exactly two parties, so popularity (already
// tracked on CountryStats — see politicsRules.ts) can double as a simple
// zero-sum vote share: the rival's share is just 100 - yours.
export interface Party {
  id: string;
  nationId: string;
  name: string;
  ideology: string; // short tag, e.g. "Agrarian", "Reformist"
  color: string;
  description: string;
  platform: string; // one-line mechanical/flavor hint, shown on the party-select screen
}
