// A settler ship on its way to an island (see islandRules.ts). When it
// arrives the island becomes one of the country's provinces.
export interface Settlement {
  id: string;
  islandId: string;
  daysRemaining: number;
  totalDays: number;
  terms?: LocalsTerms; // on an island with people of its own: how you settle among them
}

// A neighbour's settlers on their way to an island (see islandRules.ts):
// if they land before yours, the island is theirs.
export interface ForeignVoyage {
  nationId: string;
  islandId: string;
  daysRemaining: number;
  totalDays: number;
}

// Settling where people already live (see islandRules.ts): buy land from
// them, live alongside them, or drive them out.
export type LocalsTerms = "buy" | "share" | "drive";
