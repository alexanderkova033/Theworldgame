// How orderly each province is on its own. Local stability drifts toward
// the national figure, minus that province's own troubles — its homeless
// and its jobless — and climbs the same unrest stages as the nation (see
// domain/unrest). So one neglected province can strike or riot while the
// country at large is calm; a province rioting on its own wrecks its own
// buildings and drags national stability down — more so the more people
// live there (see simulateDay.ts).
import {
  PROVINCE_HOMELESS_UNREST,
  PROVINCE_JOBLESS_UNREST,
  PROVINCE_RIOT_STABILITY_DRAG,
  PROVINCE_STABILITY_DRIFT,
  UPRISING_STABILITY_DRAG_MULTIPLIER,
} from "../constants";
import type { GameDate } from "../country/types";
import type { ProvinceLabour } from "../labour/labourRules";
import { getDisputeUnrest } from "../uprising/demandRules";
import { getSpreadUnrest } from "../uprising/uprisingRules";
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
  today: GameDate,
): { provinces: Record<string, ProvinceState>; changes: ProvinceStageChange[] } {
  const changes: ProvinceStageChange[] = [];
  const next: Record<string, ProvinceState> = {};
  for (const [id, p] of Object.entries(provinces)) {
    // A risen province is lawless until its uprising ends (domain/uprising).
    if (p.uprising) {
      next[id] = p;
      continue;
    }
    const homelessShare = p.population > 0 ? Math.max(0, p.population - (capacityByProvince[id] ?? 0)) / p.population : 0;
    const l = labour[id];
    const unemploymentShare = l && l.workers > 0 ? l.unemployed / l.workers : 0;
    // A refused demand keeps it well below the nation for a while (domain/uprising).
    // So does a strong uprising next door.
    const target = Math.max(
      0,
      getProvinceStabilityTarget(nationalStability, homelessShare, unemploymentShare) - getDisputeUnrest(p, today) - getSpreadUnrest(provinces, id),
    );
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

// Where today's riot damage can land: anywhere when the whole country
// riots; otherwise one of the provinces rioting alone (picked by how many
// live there), at a chance scaled by their share of the people — so a few
// rioting provinces never wreck more than a national riot would.
export function pickRiotZone(
  provinces: Record<string, ProvinceState>,
  nationalStage: UnrestStage,
): { provinceId: string | undefined; chanceScale: number } | null {
  if (nationalStage === "riots") return { provinceId: undefined, chanceScale: 1 };
  const alone = getProvincesRiotingAlone(provinces, nationalStage);
  const total = Object.values(provinces).reduce((sum, p) => sum + p.population, 0);
  const rioting = alone.reduce((sum, id) => sum + provinces[id].population, 0);
  if (rioting <= 0 || total <= 0) return null;
  let pick = Math.random() * rioting;
  const provinceId = alone.find((id) => (pick -= provinces[id].population) < 0) ?? alone[alone.length - 1];
  return { provinceId, chanceScale: rioting / total };
}

// Weighted by how many people live there: an emptied province's riots
// barely register nationally. One that has risen weighs more again.
export function getProvinceRiotDrag(provinces: Record<string, ProvinceState>, nationalStage: UnrestStage): number {
  const total = Object.values(provinces).reduce((sum, p) => sum + p.population, 0);
  if (total <= 0) return 0;
  const rioting = getProvincesRiotingAlone(provinces, nationalStage).reduce(
    (sum, id) => sum + provinces[id].population * (provinces[id].uprising ? UPRISING_STABILITY_DRAG_MULTIPLIER : 1),
    0,
  );
  return (rioting / total) * PROVINCE_RIOT_STABILITY_DRAG;
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
