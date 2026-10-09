import type { ResearchCategory } from "../research/types";

// Hired staff — everyone here draws a salary every day (see
// workforceRules.ts). Scientists are hired into one specific research area
// and only push that area forward; police keep order nationwide.
export interface Workforce {
  scientists: Record<ResearchCategory, number>;
  police: number;
}
