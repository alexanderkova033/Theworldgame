import { getNation } from "../nations/nationRules";
import { MAP_GEOMETRY } from "./provinceData";

// The provinces the country holds: its nation's, less any that broke away.
export function getOwnedProvinceIds(state: { nationId: string; lostProvinceIds: string[] }): string[] {
  return getNation(state.nationId).provinceIds.filter((id) => !state.lostProvinceIds.includes(id));
}

export function getProvinceName(provinceId: string): string {
  return MAP_GEOMETRY.provinces.find((p) => p.id === provinceId)?.name ?? "Unknown Province";
}
