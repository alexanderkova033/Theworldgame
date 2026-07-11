import type { ResourceType } from "../resources/types";

export type ProjectType = "farm" | "factory" | "road" | "education" | "research" | "granary" | "cannery";

export interface Project {
  id: string;
  type: ProjectType;
  label: string;
  totalDays: number;
  daysRemaining: number;
  provinceId: string; // which province this is being built in, for the map

  // Only half the cost is paid to start a project (see createBuildAction.ts)
  // — the rest is drained in equal daily installments for as long as it's
  // under construction (see simulateDay.ts step 1), so committing to a
  // project is an ongoing drag on the treasury/stockpile, not a one-time hit.
  treasuryCostPerDay: number;
  resourceType: ResourceType | null;
  resourceCostPerDay: number;

  // True on any day the treasury/stockpile couldn't cover the installment
  // above — the project doesn't just wait, it slips slightly backward (see
  // constructionRules.ts) until funding catches up.
  isStalled: boolean;
}
