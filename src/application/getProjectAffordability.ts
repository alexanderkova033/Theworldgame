// Use case: for each active project, will its daily installment actually
// get paid tomorrow, and if not, what is it short of? Mirrors simulateDay.ts
// step 1's running-balance logic exactly (earlier-started projects claim funds
// first on a tight budget): this is a read-only preview of that same check, not
// a second copy of the stalling rule itself.
import type { GameState } from "../domain/country/types";
import type { ResourceType } from "../domain/resources/types";

export type StallCause = "money" | ResourceType;

export interface ProjectShortage {
  money: boolean;
  good: ResourceType | null;
  takenByEarlier: boolean; // the stock would have paid for it, had an earlier project not come first
}

// Only the projects that can't pay tomorrow are listed.
export function getProjectShortages(state: GameState): Map<string, ProjectShortage> {
  let runningTreasury = state.stats.treasury;
  let runningResources = state.resources;
  const result = new Map<string, ProjectShortage>();

  for (const project of state.projects) {
    const money = runningTreasury < project.treasuryCostPerDay;
    const good = project.resourceType && runningResources[project.resourceType] < project.resourceCostPerDay ? project.resourceType : null;

    if (money || good) {
      const moneyTaken = money && state.stats.treasury >= project.treasuryCostPerDay;
      const goodTaken = good !== null && state.resources[good] >= project.resourceCostPerDay;
      result.set(project.id, { money, good, takenByEarlier: moneyTaken || goodTaken });
    } else {
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
