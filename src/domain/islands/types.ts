// A settler ship on its way to an island (see islandRules.ts). When it
// arrives the island becomes one of the country's provinces.
export interface Settlement {
  id: string;
  islandId: string;
  daysRemaining: number;
  totalDays: number;
}
