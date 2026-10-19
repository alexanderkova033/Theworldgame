// Settling the islands. A venture scouts an island; then a settlement can be
// founded there: a ship sails with settlers, the makings of their first
// homes and a farm, and when it lands the island is one of the country's
// provinces, built on, taxed and governed like any other.
//
// The sea still lies between. Islanders never commute to the mainland. A
// colony is linked once it has a harbour and so does a coastal province of
// yours: then people cross as they would by land, and the regular boats
// keep it supplied. Unlinked, the country charters ships for it every day
// (the supply fee), and people only come on settler ships you send.
//
// Each island has a trait (islandData.ts): some double what their terrain
// yields, one makes a harbour cheap, one has flocks, one salt.
//
// An island with people of its own is settled on terms: buy land from them
// (it costs more, and they join you), live alongside them (they join you
// but keep to their own ways for a year, so the island's mood sits low), or
// drive them out (every group thinks less of you, and only your settlers
// remain).
import { ANCHORAGE_HARBOUR_COST_SHARE, GRAZING_FOOD_PER_DAY, SALT_TRADE_PER_DAY, SUPPLY_FEE_PER_DAY } from "../constants";
import type { GameState } from "../country/types";
import { isWorking } from "../maintenance/maintenanceRules";
import { MAP_GEOMETRY } from "../provinces/provinceData";
import { getOwnedProvinceIds, getPlace } from "../provinces/provinceRules";
import type { Terrain } from "../provinces/types";
import { getIslandData, type IslandTrait } from "./islandData";

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
  return null;
}

// A harbour goes on the coast, or on an island.
export function isHarbourSite(provinceId: string): boolean {
  return isIsland(provinceId) || getPlace(provinceId)?.terrain === "coast";
}

// A harbour costs half on a sheltered anchorage.
export function getHarbourCostShare(provinceId: string): number {
  return getIslandData(provinceId)?.trait === "anchorage" ? ANCHORAGE_HARBOUR_COST_SHARE : 1;
}

function hasHarbour(state: GameState, provinceId: string): boolean {
  return state.placedBuildings.some((b) => b.provinceId === provinceId && b.type === "harbour" && isWorking(b));
}

// The country's settled islands that it still holds.
export function getHeldIslands(state: GameState): string[] {
  return getOwnedProvinceIds(state).filter(isIsland);
}

// Linked to the mainland: a working harbour there, and one on a coastal
// mainland province of yours.
export function getLinkedIslands(state: GameState): Set<string> {
  const owned = getOwnedProvinceIds(state);
  const mainlandHarbour = owned.some((id) => !isIsland(id) && hasHarbour(state, id));
  return new Set(mainlandHarbour ? getHeldIslands(state).filter((id) => hasHarbour(state, id)) : []);
}

// What the colonies cost and bring in each day, in Crowns: the supply fee
// for every one not linked, and the salt trade.
export function getColonyAccounts(state: GameState): { supply: number; salt: number } {
  const linked = getLinkedIslands(state);
  const held = getHeldIslands(state);
  return {
    supply: -held.filter((id) => !linked.has(id)).length * SUPPLY_FEE_PER_DAY,
    salt: held.filter((id) => getIslandData(id)?.trait === "saltPans").length * SALT_TRADE_PER_DAY,
  };
}

// Food a day from the islands' flocks.
export function getGrazingFood(state: GameState): number {
  return getHeldIslands(state).filter((id) => getIslandData(id)?.trait === "grazing").length * GRAZING_FOOD_PER_DAY;
}

// An island whose trait doubles what its terrain yields.
const DOUBLES: Partial<Record<IslandTrait, Terrain>> = { fishingGrounds: "coast", oreSeam: "hills", timber: "forest" };

// The terrains the country produces from, one per province held, and a
// second for an island whose trait doubles its yield.
export function getProducingTerrains(state: GameState): Terrain[] {
  return getOwnedProvinceIds(state).flatMap((id) => {
    const terrain = getPlace(id)!.terrain;
    const trait = getIslandData(id)?.trait;
    return trait && DOUBLES[trait] === terrain ? [terrain, terrain] : [terrain];
  });
}

// Where the settlers come from: the province with most people sleeping
// rough, or failing that the most crowded one. Mainland only.
export function pickSettlersFrom(state: GameState, capacityByProvince: Record<string, number>, ownedIds: string[]): string | null {
  const mainland = ownedIds.filter((id) => !isIsland(id) && state.provinces[id]);
  if (mainland.length === 0) return null;
  const rough = (id: string) => state.provinces[id].population - (capacityByProvince[id] ?? 0);
  return mainland.reduce((best, id) => (rough(id) > rough(best) ? id : best));
}
