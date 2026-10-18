// Settling the islands. A venture scouts an island; then a settlement can be
// founded there: a ship sails with settlers and the makings of their first
// homes, and when it lands the island is one of the country's provinces,
// built on, taxed and governed like any other. The sea still lies between:
// islanders don't commute to the mainland, and nobody drifts across by land
// (harbours and settler ships to carry people come later; ROADMAP step 3).
//
// For now only an empty island can be settled; one with people of its own
// waits for a choice about them (phase C).
import type { GameState } from "../country/types";
import { MAP_GEOMETRY } from "../provinces/provinceData";
import { getIslandData } from "./islandData";

const ISLAND_IDS = new Set(MAP_GEOMETRY.islands.map((i) => i.id));

export function isIsland(id: string): boolean {
  return ISLAND_IDS.has(id);
}

// Why an island can't be settled yet, or null when it can (money and wood
// aside: those are the action's to check).
export function whyNotSettle(state: GameState, islandId: string): string | null {
  if (!isIsland(islandId)) return "Not an island.";
  if (state.settledIslandIds.includes(islandId)) return "Already settled.";
  if (state.settlements.some((s) => s.islandId === islandId)) return "Settlers are already on their way.";
  if (state.lostProvinceIds.includes(islandId)) return "It broke away.";
  if (!state.scoutedIslandIds.includes(islandId)) return "Scout it with a venture first.";
  if (getIslandData(islandId)?.locals) return "People live here already. Settling among them comes later.";
  return null;
}

// Where the settlers come from: the province with most people sleeping
// rough, or failing that the most crowded one. Mainland only.
export function pickSettlersFrom(state: GameState, capacityByProvince: Record<string, number>, ownedIds: string[]): string | null {
  const mainland = ownedIds.filter((id) => !isIsland(id) && state.provinces[id]);
  if (mainland.length === 0) return null;
  const rough = (id: string) => state.provinces[id].population - (capacityByProvince[id] ?? 0);
  return mainland.reduce((best, id) => (rough(id) > rough(best) ? id : best));
}
