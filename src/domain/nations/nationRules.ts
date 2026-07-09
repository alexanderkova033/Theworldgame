import { NATIONS } from "./nationData";
import type { Nation } from "./types";

export function getNation(nationId: string): Nation {
  const nation = NATIONS.find((n) => n.id === nationId);
  if (!nation) throw new Error(`Unknown nation: ${nationId}`);
  return nation;
}

export function getNationForProvince(provinceId: string): Nation | undefined {
  return NATIONS.find((n) => n.provinceIds.includes(provinceId));
}
