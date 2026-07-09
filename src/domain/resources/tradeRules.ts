// Bank trading, Catan-style: any resource for any other at a fixed rate,
// with a better rate for nations that own a coastal ("port") province.
import { BASE_TRADE_RATE, PORT_TRADE_RATE } from "../constants";
import type { Nation } from "../nations/types";
import { MAP_GEOMETRY } from "../provinces/provinceData";

export function nationHasPort(nation: Nation): boolean {
  return nation.provinceIds.some((provinceId) => {
    const province = MAP_GEOMETRY.provinces.find((p) => p.id === provinceId);
    return province?.terrain === "coast";
  });
}

export function getTradeRate(nation: Nation): number {
  return nationHasPort(nation) ? PORT_TRADE_RATE : BASE_TRADE_RATE;
}
