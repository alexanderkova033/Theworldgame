import { getNation } from "../nations/nationRules";
import { MAP_GEOMETRY } from "./provinceData";
import type { Island, Province } from "./types";

// The provinces the country holds: its nation's, less any that broke away.
export function getOwnedProvinceIds(state: { nationId: string; lostProvinceIds: string[] }): string[] {
  return getNation(state.nationId).provinceIds.filter((id) => !state.lostProvinceIds.includes(id));
}

// A place that can be held: a mainland province, or an island once it is
// settled. Both have a name, an outline, a label spot and a terrain, so
// whatever reads those works for either.
export function getPlace(id: string): Province | Island | undefined {
  return MAP_GEOMETRY.provinces.find((p) => p.id === id) ?? MAP_GEOMETRY.islands.find((i) => i.id === id);
}

export function getProvinceName(provinceId: string): string {
  return getPlace(provinceId)?.name ?? "Unknown Province";
}
