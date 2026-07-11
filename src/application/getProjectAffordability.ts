// Use case: for each active project, will its daily installment actually
// get paid tomorrow? Mirrors simulateDay.ts step 1's running-balance logic
// exactly (earlier-started projects claim funds first on a tight budget) —
// this is a read-only preview of that same check, not a second copy of the
// stalling rule itself.
import type { GameState } from "../domain/country/types";

export function getProjectAffordabilities(state: GameState): Map<string, boolean> {
  let runningTreasury = state.stats.treasury;
  let runningResources = state.resources;
  const result = new Map<string, boolean>();

  for (const project of state.projects) {
    const canAffordTreasury = runningTreasury >= project.treasuryCostPerDay;
    const canAffordResource = !project.resourceType || runningResources[project.resourceType] >= project.resourceCostPerDay;
    const canAffordToday = canAffordTreasury && canAffordResource;
    result.set(project.id, canAffordToday);

    if (canAffordToday) {
      runningTreasury -= project.treasuryCostPerDay;
      if (project.resourceType) {
        runningResources = {
          ...runningResources,
          [project.resourceType]: runningResources[project.resourceType] - project.resourceCostPerDay,
        };
      }
    }
  }

  return result;
}
