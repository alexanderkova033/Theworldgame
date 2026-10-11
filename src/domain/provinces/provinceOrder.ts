// How orderly each province is on its own. Local stability drifts toward
// the national figure, minus that province's own troubles — its homeless
// and its jobless — and climbs the same unrest stages as the nation (see
// domain/unrest). So one neglected province can strike or riot while the
// country at large is calm; a province rioting on its own wrecks its own
// buildings and drags national stability down (see simulateDay.ts).
import {
  PROVINCE_HOMELESS_UNREST,
  PROVINCE_JOBLESS_UNREST,
  PROVINCE_RIOT_STABILITY_DRAG,
  PROVINCE_STABILITY_DRIFT,
} from "../constants";
import type { ProvinceLabour } from "../labour/labourRules";
import type { UnrestStage } from "../unrest/types";
import { applyCrackdown, isWorseStage, updateUnrestStage } from "../unrest/unrestRules";
import type { ProvinceState } from "./types";

// Where a province's order is heading.
export function getProvinceStabilityTarget(nationalStability: number, homelessShare: number, unemploymentShare: number): number {
  const target = nationalStability - homelessShare * PROVINCE_HOMELESS_UNREST - unemploymentShare * PROVINCE_JOBLESS_UNREST;
  return Math.min(100, Math.max(0, target));
}

export interface ProvinceStageChange {
  provinceId: string;
  from: UnrestStage;
  to: UnrestStage;
}

export function updateProvinceOrder(
  provinces: Record<string, ProvinceState>,
  nationalStability: number,
  capacityByProvince: Record<string, number>,
  labour: Record<string, ProvinceLabour>,
): { provinces: Record<string, ProvinceState>; changes: ProvinceStageChange[] } {
  const changes: ProvinceStageChange[] = [];
  const next: Record<string, ProvinceState> = {};
  for (const [id, p] of Object.entries(provinces)) {
    const homelessShare = p.population > 0 ? Math.max(0, p.population - (capacityByProvince[id] ?? 0)) / p.population : 0;
    const l = labour[id];
    const unemploymentShare = l && l.workers > 0 ? l.unemployed / l.workers : 0;
    const target = getProvinceStabilityTarget(nationalStability, homelessShare, unemploymentShare);
    const stability = p.stability + (target - p.stability) * PROVINCE_STABILITY_DRIFT;
    const unrestStage = updateUnrestStage(p.unrestStage, stability);
    if (unrestStage !== p.unrestStage) changes.push({ provinceId: id, from: p.unrestStage, to: unrestStage });
    next[id] = { ...p, stability, unrestStage };
  }
  return { provinces: next, changes };
}

// Provinces rioting while the country as a whole isn't — the ones whose
// riots are their own, and that pull the nation down.
export function getProvincesRiotingAlone(provinces: Record<string, ProvinceState>, nationalStage: UnrestStage): string[] {
  if (nationalStage === "riots") return [];
  return Object.entries(provinces)
    .filter(([, p]) => p.unrestStage === "riots")
    .map(([id]) => id);
}

export function getProvinceRiotDrag(provinces: Record<string, ProvinceState>, nationalStage: UnrestStage): number {
  return getProvincesRiotingAlone(provinces, nationalStage).length * PROVINCE_RIOT_STABILITY_DRAG;
}

// Worse than the nation as a whole — worth telling the player about.
export function isLocalTrouble(stage: UnrestStage, nationalStage: UnrestStage): boolean {
  return isWorseStage(stage, nationalStage) && (stage === "strikes" || stage === "riots");
}

// A crackdown reaches every province too: each is pulled back a stage.
export function crackDownProvinces(provinces: Record<string, ProvinceState>, police: number): Record<string, ProvinceState> {
  return Object.fromEntries(
    Object.entries(provinces).map(([id, p]) => {
      const { stage, stability } = applyCrackdown(p.unrestStage, p.stability, police);
      return [id, { ...p, unrestStage: stage, stability }];
    }),
  );
}
