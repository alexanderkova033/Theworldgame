// Use case: which building materials are about to run out under the
// projects being built — so the top bar can bring that one resource out of
// the Stores list before a project stalls, instead of showing every
// resource all the time.
import { MATERIAL_SHORTAGE_DAYS } from "../domain/constants";
import type { GameState } from "../domain/country/types";
import type { ResourceType } from "../domain/resources/types";
import type { DailyProductionSummary } from "./getDailyProductionSummary";

export interface MaterialShortage {
  type: ResourceType;
  perDay: number; // what the projects draw each day
  stock: number;
  daysLeft: number; // at today's draw, net of what the provinces produce
}

export function getMaterialShortages(state: GameState, production: DailyProductionSummary): MaterialShortage[] {
  const draw: Partial<Record<ResourceType, number>> = {};
  for (const project of state.projects) {
    if (project.resourceType) draw[project.resourceType] = (draw[project.resourceType] ?? 0) + project.resourceCostPerDay;
  }
  const shortages: MaterialShortage[] = [];
  for (const [type, perDay] of Object.entries(draw) as Array<[ResourceType, number]>) {
    const net = perDay - production.resourceProduction[type];
    if (net <= 0) continue; // the provinces keep up on their own
    const daysLeft = state.resources[type] / net;
    if (daysLeft < MATERIAL_SHORTAGE_DAYS) shortages.push({ type, perDay, stock: state.resources[type], daysLeft });
  }
  return shortages;
}
