import { MAP_GEOMETRY } from "./provinceData";

export function getProvinceName(provinceId: string): string {
  return MAP_GEOMETRY.provinces.find((p) => p.id === provinceId)?.name ?? "Unknown Province";
}
